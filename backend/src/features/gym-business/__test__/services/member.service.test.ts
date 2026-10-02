import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import memberService from "@/features/gym-business/services/member.service.js";
import { Membership } from "@/features/gym-business/index.js";
import { createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestPlan } from "@/features/gym-business/__test__/helpers.js";
import { UserModel } from "@/features/identity-auth/index.js";

describe("gym-business: member.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let token: TestToken;
  let memberId: TestObjectId;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext("owner-member-svc-001");
    businessId = ctx.businessId;
    token = ctx.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should register a new member", async () => {
    const member = await memberService.createMember({
      businessId,
      memberData: {
        name: "Virat Kohli",
        phone: "+919999988888",
        gender: "MALE",
      },
    });

    expect(member).toBeDefined();
    expect(member.name).toBe("Virat Kohli");
    memberId = member._id as TestObjectId;
  });

  it("should reject duplicate active member phone with conflict (409)", async () => {
    await expect(
      memberService.createMember({
        businessId,
        memberData: {
          name: "Another Virat",
          phone: "+919999988888",
        },
      }),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("should list members with database-level pagination and validateRequest", async () => {
    const res = await request(app)
      .get("/api/v1/members?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.members).toBeInstanceOf(Array);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it("treats formatted variants of the same mobile number as unique", async () => {
    await expect(
      memberService.createMember({
        businessId,
        memberData: {
          name: "Virat Duplicate",
          phone: "9999988888",
        },
      }),
    ).rejects.toMatchObject({ code: "conflict" });

    const created = await memberService.createMember({
      businessId,
      memberData: {
        name: "Manual Contact",
        phone: "+91 90000 11111",
        profileImage: "file:///tmp/avatar.jpg",
      },
    });
    expect(created.phone).toBe("9000011111");
    expect(created.profileImage).toBeNull();

    const http = await request(app)
      .post("/api/v1/members")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "HTTP Contact",
        phone: "9000022222",
        profileImage: "/local/path/photo.jpg",
      });
    expect(http.status).toBe(201);
    expect(http.body.data.phone).toBe("9000022222");
    expect(http.body.data.profileImage).toBeNull();
  });

  it("builds the gym join link from PUBLIC_WEB_BASE_URL and the business slug", async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const ctx = await createGymTestContext("owner-member-join-link", {
      businessName: "Join Link Gym",
      slug: "join-link-gym",
    });

    const invite = await memberService.getJoinLink({
      businessId: ctx.businessId,
      business: ctx.business,
    });
    expect(invite.inviteUrl).toBe("https://stron.in/join/join-link-gym");
    expect(invite.slug).toBe("join-link-gym");

    const http = await request(app)
      .get("/api/v1/members/invite-link")
      .set("Authorization", `Bearer ${ctx.token}`);
    expect(http.status).toBe(200);
    expect(http.body.data.inviteUrl).toBe("https://stron.in/join/join-link-gym");
  });

  it("lists live STRON users from the full user collection", async () => {
    await UserModel.create({
      uid: "directory-user-001",
      username: "Directory Athlete",
      email: "athlete@test.com",
      contactNo: "9000011111",
      isGuest: false,
    });
    await UserModel.create({
      uid: "directory-guest-001",
      username: "Guest Skip",
      isGuest: true,
    });

    const listed = await memberService.listDirectoryUsers({
      paginationParams: { page: 1, limit: 100, skip: 0, search: "" },
    });
    const names = listed.users.map((row: { name: string }) => row.name);
    expect(names).toContain("Directory Athlete");
    expect(names).not.toContain("Guest Skip");

    const http = await request(app)
      .get("/api/v1/members/directory-users?limit=100")
      .set("Authorization", `Bearer ${token}`);
    expect(http.status).toBe(200);
    expect(http.body.users.some((row: { uid: string }) => row.uid === "directory-user-001")).toBe(
      true,
    );
  });

  it("extends active membership from remaining endDate by 7/15/30 days", async () => {
    const plan = await createTestPlan(businessId);
    const member = await memberService.createMember({
      businessId,
      memberData: { name: "Extend Me", phone: "9111100001" },
    });
    const initialEnd = new Date(Date.now() + 10 * 86400000);
    await Membership.create({
      businessId,
      memberId: member._id,
      planId: plan._id,
      status: "ACTIVE",
      startDate: new Date(),
      endDate: initialEnd,
      purchasedAt: new Date(),
      activatedAt: new Date(),
      priceAtPurchase: 3000,
      finalAmount: 3000,
    });

    const http = await request(app)
      .post(`/api/v1/members/${String(member._id)}/validity/extend`)
      .set("Authorization", `Bearer ${token}`)
      .send({ additionalDays: 15 });

    expect(http.status).toBe(200);
    expect(http.body.success).toBe(true);
    expect(http.body.data.additionalDays).toBe(15);
    const nextEnd = new Date(http.body.data.newEndDate).getTime();
    expect(nextEnd).toBeGreaterThanOrEqual(initialEnd.getTime() + 14.5 * 86400000);
  });

  it("rejects validity extension for blacklisted members and hides them from default lists", async () => {
    const member = await memberService.createMember({
      businessId,
      memberData: { name: "Block Me", phone: "9111100002" },
    });

    const blocked = await request(app)
      .post(`/api/v1/members/${String(member._id)}/blacklist`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "Policy violation" });
    expect(blocked.status).toBe(200);
    expect(blocked.body.data.status).toBe("BLOCKED");

    const extend = await request(app)
      .post(`/api/v1/members/${String(member._id)}/validity/extend`)
      .set("Authorization", `Bearer ${token}`)
      .send({ additionalDays: 7 });
    expect(extend.status).toBe(403);

    const listed = await request(app)
      .get("/api/v1/members?limit=100")
      .set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    const ids = listed.body.members.map((row: { _id: string }) => String(row._id));
    expect(ids).not.toContain(String(member._id));
  });

  it("counts unique members in validity summary matching AUTO_RENEW and EXPIRED lists", async () => {
    const ctx = await createGymTestContext("owner-validity-parity-001");
    const plan = await createTestPlan(ctx.businessId, { name: "Parity Plan" });

    const autoRenewMembers = [];
    for (let i = 0; i < 4; i += 1) {
      const member = await memberService.createMember({
        businessId: ctx.businessId,
        memberData: {
          name: `Auto Renew ${i + 1}`,
          phone: `911118100${i}`,
        },
      });
      autoRenewMembers.push(member);
      await Membership.create({
        businessId: ctx.businessId,
        memberId: member._id,
        planId: plan._id,
        status: "EXPIRED",
        autoRenew: true,
        startDate: new Date(Date.now() - 90 * 86400000),
        endDate: new Date(Date.now() - 60 * 86400000),
        purchasedAt: new Date(Date.now() - 90 * 86400000),
        activatedAt: new Date(Date.now() - 90 * 86400000),
        priceAtPurchase: 3000,
        finalAmount: 3000,
      });
      await Membership.create({
        businessId: ctx.businessId,
        memberId: member._id,
        planId: plan._id,
        status: "ACTIVE",
        autoRenew: true,
        startDate: new Date(),
        endDate: new Date(Date.now() + 40 * 86400000),
        purchasedAt: new Date(),
        activatedAt: new Date(),
        priceAtPurchase: 3000,
        finalAmount: 3000,
      });
    }

    const expiredMembers = [];
    for (let i = 0; i < 2; i += 1) {
      const member = await memberService.createMember({
        businessId: ctx.businessId,
        memberData: {
          name: `Expired ${i + 1}`,
          phone: `911118200${i}`,
        },
      });
      expiredMembers.push(member);
      await Membership.create({
        businessId: ctx.businessId,
        memberId: member._id,
        planId: plan._id,
        status: "EXPIRED",
        autoRenew: false,
        startDate: new Date(Date.now() - 40 * 86400000),
        endDate: new Date(Date.now() - 2 * 86400000),
        purchasedAt: new Date(Date.now() - 40 * 86400000),
        activatedAt: new Date(Date.now() - 40 * 86400000),
        priceAtPurchase: 3000,
        finalAmount: 3000,
      });
    }

    const summary = await memberService.getMemberValiditySummary({
      businessId: ctx.businessId,
    });
    const autoRenewList = await memberService.listMembers({
      businessId: ctx.businessId,
      paginationParams: { page: 1, limit: 50, category: "AUTO_RENEW" },
    });
    const expiredList = await memberService.listMembers({
      businessId: ctx.businessId,
      paginationParams: { page: 1, limit: 50, category: "EXPIRED" },
    });

    expect(summary.autoRenewActive).toBe(4);
    expect(autoRenewList.members).toHaveLength(4);
    expect(summary.autoRenewActive).toBe(autoRenewList.members.length);
    expect(summary.expired).toBe(2);
    expect(expiredList.members).toHaveLength(2);
    expect(summary.expired).toBe(expiredList.members.length);
    expect(autoRenewMembers.map((m) => String(m._id)).sort()).toEqual(
      autoRenewList.members.map((m: { _id: unknown }) => String(m._id)).sort(),
    );
    expect(expiredMembers.map((m) => String(m._id)).sort()).toEqual(
      expiredList.members.map((m: { _id: unknown }) => String(m._id)).sort(),
    );
  });
});

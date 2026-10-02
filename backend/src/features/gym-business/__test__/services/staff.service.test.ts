import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import staffService from "@/features/gym-business/services/staff.service.js";
import businessHomeService from "@/features/gym-business/services/businessHome.service.js";
import { MembershipPlan } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember, createTestPlan } from "../helpers.js";
import { seedDemoStaffForBusiness } from "../../services/staff.seed.js";

describe("gym-business: staff.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("runs propose → counter → re-propose → accept → assign → remove and isolates tenants", async () => {
    const gymA = await createGymTestContext("owner-uid-staff-svc-a", {
      businessName: "Staff Alpha Gym",
      slug: "staff-alpha-gym",
    });
    const gymB = await createGymTestContext("owner-uid-staff-svc-b", {
      businessName: "Staff Beta Gym",
      slug: "staff-beta-gym",
    });
    const member = await createTestMember(gymA.businessId);
    const plan = await createTestPlan(gymA.businessId);
    const trainerUid = "trainer-uid-staff-svc-001";

    await UserModel.create({
      uid: trainerUid,
      email: "trainer-staff@test.com",
      contactNo: "+919876543211",
    });

    const proposed = await staffService.proposePartnership({
      businessId: gymA.businessId,
      memberId: member._id,
      role: "TRAINER",
      splitPercent: 70,
    });
    expect(proposed.status).toBe("IN_PROGRESS");
    expect(proposed.splitPercent).toBe(70);
    expect(proposed.phone).toBe("9876543211");
    expect(proposed.initiatedBy).toBe("GYM");

    await expect(
      staffService.proposePartnership({
        businessId: gymA.businessId,
        phone: "9876543211",
        name: "Duplicate",
        splitPercent: 50,
      }),
    ).rejects.toMatchObject({ code: "staff_already_exists" });

    const homeAfterPropose = await businessHomeService.getBusinessHomeSummary({
      businessId: gymA.businessId,
      ownerId: gymA.ownerUid,
      business: gymA.business,
    });
    expect(homeAfterPropose.quickActions.find((action) => action.id === "record_payment")).toBeDefined();

    const countered = await staffService.respondToProposal({
      staffId: proposed.id,
      userId: trainerUid,
      action: "COUNTER",
      counterOfferPercent: 60,
    });
    expect(countered.status).toBe("IN_PROGRESS");
    expect(countered.counterOfferPercent).toBe(60);
    expect(countered.userId).toBe(trainerUid);

    const reproposed = await staffService.updateProposal({
      businessId: gymA.businessId,
      staffId: proposed.id,
      splitPercent: 65,
    });
    expect(reproposed.splitPercent).toBe(65);
    expect(reproposed.status).toBe("IN_PROGRESS");
    expect(reproposed.counterOfferPercent).toBeNull();

    const accepted = await staffService.respondToProposal({
      staffId: proposed.id,
      userId: trainerUid,
      action: "ACCEPT",
    });
    expect(accepted.status).toBe("ACTIVE");

    await expect(
      staffService.setPlanTrainers({
        businessId: gymA.businessId,
        planId: plan._id,
        trainerIds: [proposed.id],
      }),
    ).resolves.toMatchObject({ trainerIds: [expect.anything()] });

    const listed = await staffService.listStaff({ businessId: gymA.businessId, status: "ACTIVE" });
    expect(listed).toHaveLength(1);
    expect(listed[0].plansCount).toBe(1);

    const invite = await staffService.getInviteLink({
      businessId: gymA.businessId,
      business: gymA.business,
    });
    expect(invite.inviteUrl).toBe("https://stron.in/join/staff-alpha-gym?role=trainer");

    await expect(
      staffService.removeStaff({ businessId: gymB.businessId, staffId: proposed.id }),
    ).rejects.toMatchObject({ code: "staff_not_found" });

    const removed = await staffService.removeStaff({
      businessId: gymA.businessId,
      staffId: proposed.id,
    });
    expect(removed.status).toBe("REMOVED");

    const planAfter = await MembershipPlan.findById(plan._id).lean();
    expect(planAfter?.trainerIds).toEqual([]);

    const listedAfter = await staffService.listStaff({ businessId: gymA.businessId });
    expect(listedAfter).toHaveLength(0);
  });

  it("rejects assigning a pending proposal as a plan trainer", async () => {
    const gym = await createGymTestContext("owner-uid-staff-svc-pending", {
      businessName: "Staff Pending Gym",
      slug: "staff-pending-gym",
    });
    const plan = await createTestPlan(gym.businessId);
    const pending = await staffService.proposePartnership({
      businessId: gym.businessId,
      phone: "9123456789",
      name: "Pending Trainer",
      splitPercent: 50,
    });

    await expect(
      staffService.setPlanTrainers({
        businessId: gym.businessId,
        planId: plan._id,
        trainerIds: [pending.id],
      }),
    ).rejects.toMatchObject({ code: "staff_not_found" });
  });

  it("lets a trainer apply and the gym accept, while blocking gym accept of its own sent invite", async () => {
    const gym = await createGymTestContext("owner-uid-staff-apply", {
      businessName: "Staff Apply Gym",
      slug: "staff-apply-gym",
    });
    const applicantUid = "trainer-uid-staff-apply";
    await UserModel.create({
      uid: applicantUid,
      email: "trainer-apply@test.com",
      username: "Arjun Mehta",
      contactNo: "+919100000021",
    });

    const applied = await staffService.applyAsTrainer({
      userId: applicantUid,
      slug: "staff-apply-gym",
      splitPercent: 20,
    });
    expect(applied.status).toBe("IN_PROGRESS");
    expect(applied.initiatedBy).toBe("TRAINER");
    expect(applied.splitPercent).toBe(20);
    expect(applied.userId).toBe(applicantUid);

    const requests = await staffService.listStaff({
      businessId: gym.businessId,
      tab: "REQUESTS",
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].id).toBe(applied.id);

    await expect(
      staffService.respondToProposal({
        staffId: applied.id,
        userId: applicantUid,
        action: "ACCEPT",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    const accepted = await staffService.respondToProposal({
      staffId: applied.id,
      userId: gym.ownerUid,
      action: "ACCEPT",
    });
    expect(accepted.status).toBe("ACTIVE");
    expect(accepted.userId).toBe(applicantUid);

    const sentInvite = await staffService.proposePartnership({
      businessId: gym.businessId,
      phone: "9100000022",
      name: "Sent Trainer",
      splitPercent: 40,
    });
    expect(sentInvite.initiatedBy).toBe("GYM");

    const sent = await staffService.listStaff({
      businessId: gym.businessId,
      tab: "SENT",
    });
    expect(sent.map((row) => row.id)).toContain(sentInvite.id);

    await expect(
      staffService.respondToProposal({
        staffId: sentInvite.id,
        userId: gym.ownerUid,
        action: "ACCEPT",
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("seeds Active, Requests, and Sent tab rows for a gym", async () => {
    const gym = await createGymTestContext("owner-uid-staff-seed-tabs", {
      businessName: "Staff Seed Gym",
      slug: "staff-seed-gym",
    });
    await seedDemoStaffForBusiness(gym.businessId);

    const active = await staffService.listStaff({ businessId: gym.businessId, tab: "ACTIVE" });
    const requests = await staffService.listStaff({ businessId: gym.businessId, tab: "REQUESTS" });
    const sent = await staffService.listStaff({ businessId: gym.businessId, tab: "SENT" });

    expect(active.map((row) => row.name)).toContain("Priya Nair");
    expect(requests.map((row) => row.name)).toContain("Arjun Mehta");
    expect(requests[0]?.splitPercent).toBe(20);
    expect(sent.map((row) => row.name)).toEqual(expect.arrayContaining(["Rohit Sharma", "Karan Joshi"]));
  });
});

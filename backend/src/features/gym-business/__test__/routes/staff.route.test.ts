import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestMember, createTestPlan } from "../helpers.js";

describe("gym-business: staff.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("rejects unauthenticated staff list", async () => {
    const res = await request(app).get("/api/v1/staff");
    expect(res.status).toBe(401);
  });

  it("proposes, lets the trainer accept, assigns to a plan, then removes", async () => {
    const ctx = await createGymTestContext("owner-uid-staff-http", {
      businessName: "Staff Http Gym",
      slug: "staff-http-gym",
    });
    const member = await createTestMember(ctx.businessId, { phone: "9988776655" });
    const plan = await createTestPlan(ctx.businessId);
    const trainerUid = "trainer-uid-staff-http";
    await UserModel.create({
      uid: trainerUid,
      email: "trainer-http@test.com",
      contactNo: "9988776655",
    });
    await UserModel.create({
      uid: ctx.ownerUid,
      email: `${ctx.ownerUid}@testgym.com`,
      username: "StaffOwner",
    });
    const trainerToken = signAccessToken({ uid: trainerUid, email: "trainer-http@test.com" });
    const auth = { Authorization: `Bearer ${ctx.token}` };

    const invite = await request(app).get("/api/v1/staff/invite-link").set(auth);
    expect(invite.status).toBe(200);
    expect(invite.body.data.inviteUrl).toBe("https://stron.in/join/staff-http-gym?role=trainer");

    const propose = await request(app)
      .post("/api/v1/staff/proposals")
      .set(auth)
      .send({ memberId: String(member._id), splitPercent: 70, role: "TRAINER" });
    expect(propose.status).toBe(201);
    expect(propose.body.data.status).toBe("IN_PROGRESS");
    expect(propose.body.data.initiatedBy).toBe("GYM");
    const staffId = propose.body.data.id;

    const accept = await request(app)
      .post(`/api/v1/staff/${staffId}/respond`)
      .set({ Authorization: `Bearer ${trainerToken}` })
      .send({ action: "ACCEPT" });
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe("ACTIVE");

    const ownerRoles = await request(app).get("/api/user/me/roles").set(auth);
    expect(ownerRoles.status).toBe(200);
    expect(ownerRoles.body.data.business.available).toBe(true);
    expect(ownerRoles.body.data.business.businessName).toBe("Staff Http Gym");

    const trainerRoles = await request(app)
      .get("/api/user/me/roles")
      .set({ Authorization: `Bearer ${trainerToken}` });
    expect(trainerRoles.status).toBe(200);
    expect(trainerRoles.body.data.trainer.available).toBe(true);
    expect(trainerRoles.body.data.trainer.memberships[0].role).toBe("TRAINER");

    const assign = await request(app)
      .patch(`/api/v1/membership-plans/${String(plan._id)}/trainers`)
      .set(auth)
      .send({ trainerIds: [staffId] });
    expect(assign.status).toBe(200);
    expect(assign.body.data.trainerIds.map(String)).toContain(staffId);

    const list = await request(app).get("/api/v1/staff?status=ACTIVE").set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data[0].plansCount).toBe(1);

    const removed = await request(app).delete(`/api/v1/staff/${staffId}`).set(auth);
    expect(removed.status).toBe(200);
    expect(removed.body.data.status).toBe("REMOVED");
  });

  it("accepts a trainer apply request from the gym owner", async () => {
    const ctx = await createGymTestContext("owner-uid-staff-apply-http", {
      businessName: "Staff Apply Http Gym",
      slug: "staff-apply-http-gym",
    });
    const applicantUid = "trainer-uid-staff-apply-http";
    await UserModel.create({
      uid: applicantUid,
      email: "trainer-apply-http@test.com",
      username: "Kiran Rao",
      contactNo: "9100000033",
    });
    const applicantToken = signAccessToken({
      uid: applicantUid,
      email: "trainer-apply-http@test.com",
    });
    const auth = { Authorization: `Bearer ${ctx.token}` };

    const apply = await request(app)
      .post("/api/v1/staff/apply")
      .set({ Authorization: `Bearer ${applicantToken}` })
      .send({ slug: "staff-apply-http-gym", splitPercent: 25 });
    expect(apply.status).toBe(201);
    expect(apply.body.data.initiatedBy).toBe("TRAINER");
    const staffId = apply.body.data.id;

    const requests = await request(app).get("/api/v1/staff?tab=REQUESTS").set(auth);
    expect(requests.status).toBe(200);
    expect(requests.body.data[0].id).toBe(staffId);

    const accept = await request(app)
      .post(`/api/v1/staff/${staffId}/respond`)
      .set(auth)
      .send({ action: "ACCEPT" });
    expect(accept.status).toBe(200);
    expect(accept.body.data.status).toBe("ACTIVE");
  });
});

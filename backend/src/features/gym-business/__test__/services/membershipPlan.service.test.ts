import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import { createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";
import { createGymTestContext } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: membershipPlan.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let token: TestToken;
  let planId: TestObjectId;

  beforeAll(async () => {
    process.env.PUBLIC_WEB_BASE_URL = "https://stron.in";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext("owner-plans-svc-001");
    businessId = ctx.businessId;
    token = ctx.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create a quarterly plan", async () => {
    const plan = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Quarterly Pro",
        price: 3000,
        billingCycle: "QUARTERLY",
        duration: 3,
        durationUnit: "MONTHS",
        perks: ["Lockers", "Shower"],
      },
    });

    expect(plan).toBeDefined();
    expect(plan.price).toBe(3000);
    expect(plan.duration).toBe(3);
    expect(plan.visibility).toBe("PUBLIC");
    expect(plan.inviteSlug).toMatch(/^quarterly-pro-[a-f0-9]{4}$/);
    expect(plan.inviteUrl).toMatch(/^https:\/\/stron\.in\/plan\/quarterly-pro-[a-f0-9]{4}$/);
    planId = plan._id as TestObjectId;
  });

  it("should list plans with validateRequest", async () => {
    const res = await request(app)
      .get("/api/v1/membership-plans")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.plans).toBeInstanceOf(Array);
    expect(res.body.plans.length).toBeGreaterThan(0);
  });

  it("should reject moving a LIVE/ACTIVE plan back to DRAFT", async () => {
    await expect(
      membershipPlanService.updatePlan({
        businessId,
        planId,
        updateData: { status: "DRAFT" },
      }),
    ).rejects.toMatchObject({ code: "invalid_plan_status_transition" });
  });

  it("should reject moving a STOPPED plan back to DRAFT", async () => {
    const isoBizId = new mongoose.Types.ObjectId();
    const stoppedPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Plan To Stop",
        price: 1500,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
        status: "STOPPED",
      },
    });

    await expect(
      membershipPlanService.updatePlan({
        businessId: isoBizId,
        planId: stoppedPlan._id,
        updateData: { status: "DRAFT" },
      }),
    ).rejects.toMatchObject({ code: "invalid_plan_status_transition" });
  });

  it("should map invalid_plan_status_transition to HTTP 400", async () => {
    const res = await request(app)
      .patch(`/api/v1/membership-plans/${planId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "DRAFT" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("invalid_plan_status_transition");
  });

  it("creates a private plan with an official stron.in invite URL", async () => {
    const plan = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Alpha Pro",
        price: 499,
        billingCycle: "ONE_TIME",
        duration: 4,
        durationUnit: "DAYS",
        visibility: "PRIVATE",
      },
    });

    expect(plan.visibility).toBe("PRIVATE");
    expect(plan.inviteUrl).toMatch(/^https:\/\/stron\.in\/plan\/alpha-pro-[a-f0-9]{4}$/);
  });

  it("persists members-only allowedPlanIds", async () => {
    const audience = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Basic Plan",
        price: 999,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });

    const plan = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Members Listing",
        price: 1999,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
        visibility: "MEMBERS_ONLY",
        allowedPlanIds: [audience._id],
      },
    });

    expect(plan.visibility).toBe("MEMBERS_ONLY");
    expect(plan.allowedPlanIds.map(String)).toEqual([String(audience._id)]);
    expect(plan.inviteUrl).toMatch(/^https:\/\/stron\.in\/plan\/members-listing-[a-f0-9]{4}$/);
  });
});

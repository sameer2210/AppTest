import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import couponService from "@/features/gym-business/services/coupon.service.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";
import { createGymTestContext, createTestPlan } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: coupon.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let planId: TestObjectId;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext("owner-coupon-svc-001");
    businessId = ctx.businessId;

    const plan = await createTestPlan(businessId);
    planId = plan._id as TestObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should create and validate a coupon with percentage discount", async () => {
    const coupon = await couponService.createCoupon({
      businessId,
      couponData: {
        code: "SUMMER20",
        type: "PERCENTAGE",
        discountPercentage: 20,
        maximumDiscount: 1000,
        minimumOrderValue: 1500,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applicablePlanIds: [planId],
      },
    });

    expect(coupon.code).toBe("SUMMER20");

    const validation = await couponService.validateCoupon({
      businessId,
      code: "SUMMER20",
      planId,
      orderAmount: 3000,
    });

    expect(validation.valid).toBe(true);
    expect(validation.discountAmount).toBe(600);
    expect(validation.finalAmount).toBe(2400);
  });
});

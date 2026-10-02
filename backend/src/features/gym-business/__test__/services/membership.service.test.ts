import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import couponService from "@/features/gym-business/services/coupon.service.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import { createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";
import { createGymTestContext } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: membership.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let token: TestToken;
  let memberId: TestObjectId;
  let planId: TestObjectId;
  let couponId: TestObjectId;
  let membershipId: TestObjectId;
  const ownerUid = "owner-membership-svc-001";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    const ctx = await createGymTestContext(ownerUid);
    businessId = ctx.businessId;
    token = ctx.token;

    const plan = await membershipPlanService.createPlan({
      businessId,
      planData: {
        name: "Quarterly Pro",
        price: 3000,
        billingCycle: "QUARTERLY",
        duration: 3,
        durationUnit: "MONTHS",
      },
    });
    planId = plan._id as TestObjectId;

    const member = await memberService.createMember({
      businessId,
      memberData: {
        name: "Virat Kohli",
        phone: "+919999988888",
        gender: "MALE",
      },
    });
    memberId = member._id as TestObjectId;

    const coupon = await couponService.createCoupon({
      businessId,
      couponData: {
        code: "MEM20",
        type: "PERCENTAGE",
        discountPercentage: 20,
        maximumDiscount: 1000,
        minimumOrderValue: 1500,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        applicablePlanIds: [planId],
      },
    });
    couponId = coupon._id as TestObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should default new membership to PENDING with purchasedAt and optional dates", async () => {
    const membership = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        couponId,
        discountAmount: 600,
        finalAmount: 2400,
      },
    });

    expect(membership).toBeDefined();
    expect(membership.priceAtPurchase).toBe(3000);
    expect(membership.finalAmount).toBe(2400);
    expect(membership.status).toBe("PENDING");
    expect(membership.purchasedAt).toBeDefined();
    expect(membership.activatedAt).toBeNull();
    expect(membership.startDate).toBeNull();
    expect(membership.endDate).toBeNull();
    expect(membership.gatewaySubscriptionId).toBeNull();
    expect(membership.gatewayCustomerId).toBeNull();
  });

  it("should assign ACTIVE membership with price snapshot and duration calculation when explicitly requested", async () => {
    const membership = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        couponId,
        discountAmount: 600,
        finalAmount: 2400,
        status: "ACTIVE",
      },
    });

    expect(membership).toBeDefined();
    expect(membership.priceAtPurchase).toBe(3000);
    expect(membership.finalAmount).toBe(2400);
    expect(membership.status).toBe("ACTIVE");
    expect(membership.purchasedAt).toBeDefined();
    expect(membership.activatedAt).toBeDefined();
    expect(membership.startDate).toBeDefined();
    expect(membership.endDate).toBeDefined();
    membershipId = membership._id as TestObjectId;
  });

  it("should stack new membership date after existing active membership endDate", async () => {
    const secondMembership = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        finalAmount: 3000,
        status: "ACTIVE",
      },
    });

    const firstMem = await membershipService.getMembershipById({ businessId, membershipId });
    expect(new Date(secondMembership.startDate!).getTime()).toBe(new Date(firstMem.endDate!).getTime());
  });

  it("should activate a PENDING membership via updateMembership", async () => {
    const pendingMem = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        finalAmount: 3000,
      },
    });
    expect(pendingMem.status).toBe("PENDING");

    const activatedMem = await membershipService.updateMembership({
      businessId,
      membershipId: pendingMem._id,
      updateData: { status: "ACTIVE" },
    });
    expect(activatedMem.status).toBe("ACTIVE");
    expect(activatedMem.activatedAt).toBeDefined();
    expect(activatedMem.startDate).toBeDefined();
    expect(activatedMem.endDate).toBeDefined();
  });

  it("should reject purchasing or assigning a STOPPED plan", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const stoppedPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Discontinued Plan",
        price: 2000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
        status: "STOPPED",
      },
    });

    const isoMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Iso Member",
        phone: "+919876500001",
      },
    });

    await expect(
      membershipService.createMembershipForMember({
        businessId: isoBizId,
        memberId: isoMember._id,
        membershipData: {
          planId: stoppedPlan._id,
          finalAmount: 2000,
        },
      }),
    ).rejects.toMatchObject({ code: "plan_stopped" });

    await expect(
      paymentService.recordManualPayment({
        businessId: isoBizId,
        recordedBy: ownerUid,
        paymentData: {
          memberId: isoMember._id,
          planId: stoppedPlan._id,
          amount: 2000,
          finalAmount: 2000,
          method: "CASH",
        },
      }),
    ).rejects.toMatchObject({ code: "plan_stopped" });
  });

  it("should return copy guidance and 0 days left for PENDING memberships without marking expired", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const isoPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Pending Plan",
        price: 3000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });

    const pendingMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Pending Member",
        phone: "+919876543210",
      },
    });

    await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: pendingMember._id,
      membershipData: {
        planId: isoPlan._id,
        finalAmount: 3000,
        status: "PENDING",
      },
    });

    const memberDetails = await memberService.getMemberById({
      businessId: isoBizId,
      memberId: pendingMember._id,
    });

    expect(memberDetails.validity.status).toBe("PENDING");
    expect(memberDetails.validity.isExpired).toBe(false);
    expect(memberDetails.validity.daysLeft).toBe(0);
    expect(memberDetails.validity.customerStatusText).toBe(
      "Plan purchased. Check in at the gym to activate.",
    );
    expect(memberDetails.validity.businessStatusText).toBe(
      "Paid — awaiting first check-in.",
    );

    const summaries = await paymentService.getMemberPaymentSummaries({
      businessId: isoBizId,
    });
    const row = summaries.summaries.find(
      (s) => String(s.memberId) === String(pendingMember._id),
    );
    expect(row?.daysLeftText).toBe("Payment due");
    expect(row?.totalPaid).toBe(0);
    expect(row?.totalDue).toBe(3000);
  });

  it("should successfully send initial payment reminder", async () => {
    const res = await request(app)
      .post(`/api/v1/members/${memberId}/remind-payment`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("sent successfully");
    expect(res.body.data.paymentUrl).toContain("/pay/");
  });

  it("should reject subsequent payment reminder within 6 hours with 409 conflict", async () => {
    const res = await request(app)
      .post(`/api/v1/members/${memberId}/remind-payment`)
      .set("Authorization", `Bearer ${token}`)
      .send({ channel: "WHATSAPP" });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe("reminder_cooldown");
  });
});

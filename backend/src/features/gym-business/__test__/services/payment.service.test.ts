import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import request from "supertest";
import app from "@/app.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import razorpayService from "@/services/razorpay.service.js";
import { Business, Membership } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo, type TestObjectId, type TestToken } from "@/test-helpers/helpers.js";
import { createGymTestContext } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: payment.service", () => {
  let mongoServer: MongoMemoryServer;
  let businessId: TestObjectId;
  let token: TestToken;
  let memberId: TestObjectId;
  let planId: TestObjectId;
  let membershipId: TestObjectId;
  const ownerUid = "owner-payment-svc-001";

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

    const membership = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        finalAmount: 2400,
        status: "ACTIVE",
      },
    });
    membershipId = membership._id as TestObjectId;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("should record a manual payment and record purchasedAt without forcing ACTIVE", async () => {
    const payment = await paymentService.recordManualPayment({
      businessId,
      recordedBy: ownerUid,
      paymentData: {
        memberId,
        membershipId,
        amount: 3000,
        discountAmount: 600,
        finalAmount: 2400,
        method: "UPI",
      },
    });

    expect(payment.status).toBe("SUCCESS");
    expect(payment.source).toBe("MANUAL");
    expect(payment.finalAmount).toBe(2400);

    const memAfter = await membershipService.getMembershipById({ businessId, membershipId });
    expect(memAfter.purchasedAt).toBeDefined();
  });

  it("should activate pending membership on manual payment when activateMembership is true", async () => {
    const isolatedBusinessId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const isolatedPlan = await membershipPlanService.createPlan({
      businessId: isolatedBusinessId,
      planData: {
        name: "Test Plan",
        price: 1000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const isolatedMember = await memberService.createMember({
      businessId: isolatedBusinessId,
      memberData: {
        name: "Isolated Member",
        phone: "+919988776655",
        gender: "MALE",
      },
    });
    const pendingMem = await membershipService.createMembershipForMember({
      businessId: isolatedBusinessId,
      memberId: isolatedMember._id,
      membershipData: {
        planId: isolatedPlan._id,
        finalAmount: 1000,
      },
    });
    expect(pendingMem.status).toBe("PENDING");

    await paymentService.recordManualPayment({
      businessId: isolatedBusinessId,
      recordedBy: ownerUid,
      paymentData: {
        memberId: isolatedMember._id,
        membershipId: pendingMem._id,
        amount: 1000,
        finalAmount: 1000,
        method: "CASH",
        activateMembership: true,
      },
    });

    const memAfter = await membershipService.getMembershipById({
      businessId: isolatedBusinessId,
      membershipId: pendingMem._id,
    });
    expect(memAfter.status).toBe("ACTIVE");
    expect(memAfter.activatedAt).toBeDefined();
    expect(memAfter.startDate).toBeDefined();
    expect(memAfter.endDate).toBeDefined();
  });

  it("should ignore client underpay amount and charge stored membership finalAmount", async () => {
    const pendingMem = await membershipService.createMembershipForMember({
      businessId,
      memberId,
      membershipData: {
        planId,
        finalAmount: 2400,
      },
    });

    const result = await paymentService.createOnlinePaymentOrder({
      businessId,
      orderData: {
        membershipId: pendingMem._id,
        memberId,
        amount: 1,
      },
    });

    expect(result.amount).toBe(2400);
    expect(result.order).toBeDefined();
  });

  it("should ignore client gateway ids on HTTP membership create", async () => {
    const res = await request(app)
      .post(`/api/v1/members/${memberId}/memberships`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        planId: String(planId),
        finalAmount: 3000,
        gatewaySubscriptionId: "sub_forged_client",
        gatewayCustomerId: "cust_forged_client",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.gatewaySubscriptionId).toBeNull();
    expect(res.body.data.gatewayCustomerId).toBeNull();
  });

  it("should list payments with validateRequest", async () => {
    const res = await request(app)
      .get("/api/v1/payments?page=1&limit=10")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.payments).toBeInstanceOf(Array);
    if (res.body.payments.length > 0) {
      const row = res.body.payments[0];
      expect(row.formattedAmount).toMatch(/^₹/);
      expect(["PROCESSED", "PROCESSING", "FAILED"]).toContain(row.displayStatus);
      expect(row.member).toMatchObject({
        name: expect.any(String),
        phone: expect.any(String),
      });
    }
  });

  it("should fail closed on webhook requests missing x-razorpay-signature", async () => {
    await expect(
      paymentService.handleRazorpayWebhook({
        rawBody: "{}",
        signature: undefined,
        eventPayload: { event: "payment.captured" },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("should not verify webhooks using RAZORPAY_KEY_SECRET fallback", async () => {
    const previousWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
    const previousKey = process.env.RAZORPAY_KEY_SECRET;
    const previousEnv = process.env.NODE_ENV;

    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_KEY_SECRET = "api_key_secret_should_not_verify_webhooks";
    process.env.NODE_ENV = "production";

    try {
      const body = JSON.stringify({ event: "payment.captured" });
      const badSig = crypto
        .createHmac("sha256", "api_key_secret_should_not_verify_webhooks")
        .update(body)
        .digest("hex");

      expect(razorpayService.verifyWebhookSignature(body, badSig)).toBe(false);
    } finally {
      if (previousWebhook === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
      else process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhook;
      if (previousKey === undefined) delete process.env.RAZORPAY_KEY_SECRET;
      else process.env.RAZORPAY_KEY_SECRET = previousKey;
      process.env.NODE_ENV = previousEnv || "test";
    }
  });

  it("should derive online order amount from membership and reject non-owner", async () => {
    const bizDoc = await Business.create({
      ownerId: "owner-online-amt-01",
      businessName: "Online Amount Gym",
      status: "ACTIVE",
    });
    const amtBiz = bizDoc._id;
    const plan = await membershipPlanService.createPlan({
      businessId: amtBiz,
      planData: {
        name: "Amount Trust Plan",
        price: 4500,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const buyerUid = "buyer-online-amt-01";
    await UserModel.findOneAndUpdate(
      { uid: buyerUid },
      { $set: { uid: buyerUid, username: "Amt Buyer", contactNo: "+919123456768" } },
      { upsert: true, new: true },
    );
    const member = await memberService.createMember({
      businessId: amtBiz,
      memberData: { name: "Amt Buyer", phone: "+919123456768" },
    });
    const membership = await membershipService.createMembershipForMember({
      businessId: amtBiz,
      memberId: member._id,
      membershipData: {
        planId: plan._id,
        finalAmount: 4500,
        status: "PENDING",
        customerUid: buyerUid,
      },
    });

    const order = await paymentService.createOnlinePaymentOrder({
      userId: buyerUid,
      orderData: {
        membershipId: String(membership._id),
        amount: 1,
      },
    });
    expect(order.amount).toBe(4500);

    await expect(
      paymentService.createOnlinePaymentOrder({
        userId: "other-uid-not-owner",
        orderData: {
          membershipId: String(membership._id),
          amount: 4500,
        },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });

    await expect(
      paymentService.createOnlinePaymentOrder({
        userId: "other-uid-not-owner",
        orderData: {
          membershipId: String(membership._id),
          businessId: String(amtBiz),
          amount: 4500,
        },
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("should attach cash payments to the current membership when membershipId is omitted", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const isoPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Attach Plan",
        price: 1000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const isoMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Attach Member",
        phone: "+919900112233",
        gender: "MALE",
      },
    });
    const pendingMem = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: isoMember._id,
      membershipData: {
        planId: isoPlan._id,
        finalAmount: 1000,
        status: "PENDING",
      },
    });

    const payment = await paymentService.recordManualPayment({
      businessId: isoBizId,
      recordedBy: ownerUid,
      paymentData: {
        memberId: isoMember._id,
        amount: 400,
        finalAmount: 400,
        method: "CASH",
      },
    });

    const attachedId = payment.membershipId?._id || payment.membershipId;
    expect(String(attachedId)).toBe(String(pendingMem._id));

    const summary = await paymentService.getMemberPaymentSummary({
      businessId: isoBizId,
      memberId: isoMember._id,
    });
    expect(summary.totalPrice).toBe(1000);
    expect(summary.totalPaid).toBe(400);
    expect(summary.totalDue).toBe(600);
    expect(summary.daysLeftText).toBe("Paid — awaiting first check-in.");
  });

  it("should show due on a new unpaid membership even if an older membership was paid in full", async () => {
    const isoBizId = new mongoose.Types.ObjectId() as unknown as TestObjectId;
    const isoPlan = await membershipPlanService.createPlan({
      businessId: isoBizId,
      planData: {
        name: "Renew Plan",
        price: 4000,
        billingCycle: "MONTHLY",
        duration: 1,
        durationUnit: "MONTHS",
      },
    });
    const isoMember = await memberService.createMember({
      businessId: isoBizId,
      memberData: {
        name: "Renew Member",
        phone: "+919900445566",
        gender: "MALE",
      },
    });
    const oldMem = await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: isoMember._id,
      membershipData: {
        planId: isoPlan._id,
        finalAmount: 3000,
        status: "ACTIVE",
      },
    });
    await paymentService.recordManualPayment({
      businessId: isoBizId,
      recordedBy: ownerUid,
      paymentData: {
        memberId: isoMember._id,
        membershipId: oldMem._id,
        amount: 3000,
        finalAmount: 3000,
        method: "CASH",
      },
    });
    await Membership.updateOne({ _id: oldMem._id }, { $set: { status: "EXPIRED" } });

    await membershipService.createMembershipForMember({
      businessId: isoBizId,
      memberId: isoMember._id,
      membershipData: {
        planId: isoPlan._id,
        finalAmount: 4000,
        status: "PENDING",
      },
    });

    const row = await paymentService.getMemberPaymentSummary({
      businessId: isoBizId,
      memberId: isoMember._id,
    });
    expect(row.totalPrice).toBe(4000);
    expect(row.totalPaid).toBe(0);
    expect(row.totalDue).toBe(4000);
    expect(row.daysLeftText).toBe("Payment due");
    expect(row.paymentUrl).toContain("/pay/");
    expect(row.autoPayUrl).toContain("autoRenew=1");
  });

  it("should fetch a single member payment summary over HTTP", async () => {
    const res = await request(app)
      .get(`/api/v1/payments/summaries/${memberId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.memberId).toBe(String(memberId));
    expect(res.body.data.paymentUrl).toContain("/pay/");
    expect(res.body.data.autoPayUrl).toContain("autoRenew=1");
  });
});

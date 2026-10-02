import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import businessService from "@/features/gym-business/services/business.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo, type TestObjectId } from "@/test-helpers/helpers.js";

describe("gym-business: membershipPurchase.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("Customer-Auth Membership Purchase & Payment Verification Lifecycle", () => {
    const customerUid = "customer-uid-purchase-001";
    let customerToken: string;
    let customerAuthHeader: { Authorization: string };
    let purchaseBusinessId: TestObjectId;
    let activePlanId: TestObjectId;
    let stoppedPlanId: TestObjectId;
    let trialPlanId: TestObjectId;

    beforeAll(async () => {
      customerToken = signAccessToken({
        uid: customerUid,
        email: "customer-shopper@gmail.com",
      });
      customerAuthHeader = { Authorization: `Bearer ${customerToken}` };

      await UserModel.create({
        uid: customerUid,
        username: "Shopper User",
        email: "customer-shopper@gmail.com",
        contactNo: "+919876543299",
      });

      const gymOwnerUid = "gym-owner-purchase-test";
      const bus = await businessService.createBusinessProfile({
        ownerId: gymOwnerUid,
        businessData: {
          businessName: "Metropolis Gym",
          location: "Bandra, Mumbai",
          phone: "9876543298",
        },
      });
      purchaseBusinessId = bus._id as TestObjectId;

      const plan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Metropolis Gold 3M",
          price: 2999,
          billingCycle: "ONE_TIME",
          duration: 3,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });
      activePlanId = plan._id as TestObjectId;

      const stoppedPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Metropolis Retired Plan",
          price: 1999,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "STOPPED",
        },
      });
      stoppedPlanId = stoppedPlan._id as TestObjectId;

      const trialPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Metropolis 7-Day Trial",
          price: 0,
          billingCycle: "ONE_TIME",
          duration: 7,
          durationUnit: "DAYS",
          status: "ACTIVE",
          isFreeTrial: true,
          trialDuration: 7,
        },
      });
      trialPlanId = trialPlan._id as TestObjectId;
    });

    it("should allow customer to purchase an active plan and create PENDING membership + Razorpay order + PENDING payment", async () => {
      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(activePlanId),
          notes: "Online customer purchase",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const { membership, payment, order, isFree, amount, checkoutText, message } = res.body.data;

      expect(membership).toBeDefined();
      expect(membership.status).toBe("PENDING");
      expect(membership.purchasedAt).toBeDefined();
      expect(membership.activatedAt).toBeNull();
      expect(membership.startDate).toBeNull();
      expect(membership.endDate).toBeNull();

      expect(payment).toBeDefined();
      expect(payment.status).toBe("PENDING");
      expect(payment.method).toBe("ONLINE");
      expect(payment.amount).toBe(2999);

      expect(order).toBeDefined();
      expect(order.id).toMatch(/^order_/);
      expect(isFree).toBe(false);
      expect(amount).toBe(2999);
      expect(checkoutText).toBe("Pay securely with Razorpay");
      expect(message).toBe("Pay securely with Razorpay");

      const memberData = await memberService.getMemberById({
        businessId: purchaseBusinessId,
        memberId: membership.memberId,
      });
      expect(memberData.member).toBeDefined();
      expect(memberData.member.name).toBe("Shopper User");
      expect(memberData.member.phone).toBe("+919876543299");
    });

    it("should reject purchase when plan is STOPPED with 400 plan_stopped", async () => {
      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(stoppedPlanId),
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("plan_stopped");
    });

    it("should start a gym free trial as ACTIVE immediately with SUCCESS $0 payment", async () => {
      const trialUid = "customer-uid-trial-immediate-001";
      await UserModel.create({
        uid: trialUid,
        username: "Trial Starter",
        email: "trial-starter@gmail.com",
        contactNo: "+919876543211",
      });
      const trialAuth = {
        Authorization: `Bearer ${signAccessToken({
          uid: trialUid,
          email: "trial-starter@gmail.com",
        })}`,
      };

      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(trialAuth)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(trialPlanId),
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const { membership, payment, order, isFree, amount, message } = res.body.data;

      expect(isFree).toBe(true);
      expect(order).toBeNull();
      expect(amount).toBe(0);
      expect(payment.status).toBe("SUCCESS");
      expect(membership.status).toBe("ACTIVE");
      expect(membership.activatedAt).toBeTruthy();
      expect(membership.startDate).toBeTruthy();
      expect(membership.endDate).toBeTruthy();
      expect(membership.purchasedAt).toBeTruthy();
      expect(message).toBe(
        "Your free trial has started. Check in at the gym anytime during the trial.",
      );
    });

    it("should allow customer to verify online payment and set Payment to SUCCESS while Membership stays PENDING", async () => {
      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(activePlanId),
        });

      expect(purchaseRes.status).toBe(201);
      const { membership, order } = purchaseRes.body.data;
      const gatewayOrderId = order.id;
      const gatewayPaymentId = `pay_test_${Date.now()}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      const gatewaySignature = crypto
        .createHmac("sha256", secret)
        .update(`${gatewayOrderId}|${gatewayPaymentId}`)
        .digest("hex");

      const verifyRes = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature,
          activateMembership: true,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.status).toBe("SUCCESS");
      expect(verifyRes.body.data.paidAt).toBeDefined();
      expect(verifyRes.body.data.membershipStatus).toBe("PENDING");

      const updatedMem = await membershipService.getMembershipById({
        businessId: purchaseBusinessId,
        membershipId: membership._id,
      });
      expect(updatedMem.status).toBe("PENDING");
      expect(updatedMem.purchasedAt).toBeDefined();
      expect(updatedMem.activatedAt).toBeNull();
      expect(updatedMem.startDate).toBeNull();
      expect(updatedMem.endDate).toBeNull();
    });

    it("should keep membership PENDING when Razorpay webhook marks payment SUCCESS", async () => {
      const freshPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Webhook Pending Plan",
          price: 1299,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });

      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });
      expect(purchaseRes.status).toBe(201);
      const { membership, order, payment } = purchaseRes.body.data;
      expect(order?.id).toBeTruthy();

      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "whsec_test";
      const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
      process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;

      const eventPayload = {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: `pay_wh_${Date.now()}`,
              order_id: order.id,
              status: "captured",
            },
          },
        },
      };
      const rawBody = JSON.stringify(eventPayload);
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      try {
        const result = await paymentService.handleRazorpayWebhook({
          rawBody,
          signature,
          eventPayload,
        });
        expect(result.received).toBe(true);

        const Payment = (await import("@/features/gym-business/models/payment.model.js")).default;
        const paid = await Payment.findById(payment._id).lean();
        expect(paid!.status).toBe("SUCCESS");

        const mem = await membershipService.getMembershipById({
          businessId: purchaseBusinessId,
          membershipId: membership._id,
        });
        expect(mem.status).toBe("PENDING");
        expect(mem.activatedAt).toBeNull();
        expect(mem.startDate).toBeNull();
      } finally {
        if (previousWebhookSecret === undefined) {
          delete process.env.RAZORPAY_WEBHOOK_SECRET;
        } else {
          process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
        }
      }
    });

    it("should reject purchase when plan is in DRAFT status with 400 plan_not_active", async () => {
      const draftPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Metropolis Draft Plan",
          price: 1500,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "DRAFT",
        },
      });

      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(draftPlan._id),
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("plan_not_active");
    });

    it("should return copy guidance 'Pay securely with Razorpay' on purchase checkout", async () => {
      const freshPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Checkout Copy Plan",
          price: 999,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });

      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.checkoutText).toBe("Pay securely with Razorpay");
      expect(res.body.data.message).toBe("Pay securely with Razorpay");
      expect(res.body.data.alreadyPaid).toBe(false);
      expect(res.body.data.order?.id).toMatch(/^order_/);
    });

    it("should return failure copy guidance when verification fails with invalid signature", async () => {
      const res = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          gatewayOrderId: "order_invalid_dummy",
          gatewayPaymentId: "pay_invalid_dummy",
          gatewaySignature: "bad_signature_hash",
        });

      expect(res.status).toBe(402);
      expect(res.body.code).toBe("payment_failed");
      expect(res.body.message).toBe(
        "Payment failed. You can retry without creating a duplicate membership.",
      );
    });

    it("should be idempotent on duplicate verification and return after pay copy guidance without duplicate memberships", async () => {
      const freshPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Idempotent Verify Plan",
          price: 1499,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });

      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });

      expect(purchaseRes.status).toBe(201);
      const { membership, order } = purchaseRes.body.data;
      expect(order?.id).toBeTruthy();
      const gatewayOrderId = order.id;
      const gatewayPaymentId = `pay_idempotent_${Date.now()}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      const gatewaySignature = crypto
        .createHmac("sha256", secret)
        .update(`${gatewayOrderId}|${gatewayPaymentId}`)
        .digest("hex");

      const verify1 = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature,
        });

      expect(verify1.status).toBe(200);
      expect(verify1.body.data.status).toBe("SUCCESS");
      expect(verify1.body.data.message).toBe(
        "Payment successful. Your plan will activate on first check-in.",
      );

      const verify2 = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          gatewayOrderId,
          gatewayPaymentId,
          gatewaySignature,
        });

      expect(verify2.status).toBe(200);
      expect(verify2.body.data.status).toBe("SUCCESS");
      expect(verify2.body.data.message).toBe(
        "Payment successful. Your plan will activate on first check-in.",
      );

      const Membership = (await import("@/features/gym-business/models/membership.model.js")).default;
      const memberMemberships = await Membership.find({
        businessId: purchaseBusinessId,
        memberId: membership.memberId,
        planId: freshPlan._id,
      });
      expect(memberMemberships).toHaveLength(1);
      expect(memberMemberships[0].status).toBe("PENDING");
    });

    it("should reuse unpaid PENDING membership on purchase retry to prevent duplicate memberships", async () => {
      const freshPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Retry Unpaid Plan",
          price: 1799,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });

      const res1 = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });

      expect(res1.status).toBe(201);
      const mem1Id = res1.body.data.membership._id;
      const pay1Id = res1.body.data.payment._id;

      const res2 = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });

      expect(res2.status).toBe(201);
      expect(String(res2.body.data.membership._id)).toBe(String(mem1Id));
      expect(String(res2.body.data.payment._id)).toBe(String(pay1Id));
      expect(res2.body.data.reusedMembership).toBe(true);
      expect(res2.body.data.order?.id).toBeTruthy();
      expect(res2.body.data.order.id).not.toBe(res1.body.data.order.id);
    });

    it("should not create a second membership when purchase is retried after successful payment", async () => {
      const freshPlan = await membershipPlanService.createPlan({
        businessId: purchaseBusinessId,
        planData: {
          name: "Paid Retry Plan",
          price: 1899,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });

      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });
      expect(purchaseRes.status).toBe(201);
      const { membership, order } = purchaseRes.body.data;
      expect(order?.id).toBeTruthy();

      const gatewayPaymentId = `pay_after_${Date.now()}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      const gatewaySignature = crypto
        .createHmac("sha256", secret)
        .update(`${order.id}|${gatewayPaymentId}`)
        .digest("hex");

      await request(app)
        .post("/api/v1/payments/online/verify")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          gatewayOrderId: order.id,
          gatewayPaymentId,
          gatewaySignature,
        });

      const retry = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(purchaseBusinessId),
          planId: String(freshPlan._id),
        });

      expect(retry.status).toBe(201);
      expect(String(retry.body.data.membership._id)).toBe(String(membership._id));
      expect(retry.body.data.alreadyPaid).toBe(true);
      expect(retry.body.data.message).toBe(
        "Payment successful. Your plan will activate on first check-in.",
      );
      expect(retry.body.data.order).toBeNull();
    });

    it("should keep staff manual payment route protected from regular customers", async () => {
      const res = await request(app)
        .post("/api/v1/payments/manual")
        .set(customerAuthHeader)
        .send({
          memberId: "507f1f77bcf86cd799439011",
          amount: 500,
          method: "CASH",
        });

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("business_not_found");
    });
  });

  describe("Customer My Plans (buyer isolation)", () => {
    const buyerUid = "buyer-my-plans-uid-001";
    const otherUid = "other-my-plans-uid-002";
    let buyerToken: string;
    let myPlansBusinessId: TestObjectId;
    let myPlansPlanId: TestObjectId;

    beforeAll(async () => {
      buyerToken = signAccessToken({
        uid: buyerUid,
        email: "buyer-plans@test.com",
      });

      await UserModel.create({
        uid: buyerUid,
        username: "Buyer Plans",
        email: "buyer-plans@test.com",
        contactNo: "+919111122233",
      });
      await UserModel.create({
        uid: otherUid,
        username: "Other User",
        email: "other-plans@test.com",
        contactNo: "+919444455566",
      });

      const bus = await businessService.createBusinessProfile({
        ownerId: "gym-owner-my-plans",
        businessData: {
          businessName: "My Plans Gym",
          location: "Pune",
          phone: "9876500123",
        },
      });
      myPlansBusinessId = bus._id as TestObjectId;

      const plan = await membershipPlanService.createPlan({
        businessId: myPlansBusinessId,
        planData: {
          name: "My Plans Trial",
          price: 0,
          billingCycle: "ONE_TIME",
          duration: 7,
          durationUnit: "DAYS",
          status: "ACTIVE",
          isFreeTrial: true,
          trialDuration: 7,
        },
      });
      myPlansPlanId = plan._id as TestObjectId;
    });

    it("requires auth for GET /api/v1/memberships/my-plans", async () => {
      const res = await request(app).get("/api/v1/memberships/my-plans");
      expect(res.status).toBe(401);
    });

    it("rejects client-supplied phone/email query params (strict Zod)", async () => {
      const res = await request(app)
        .get("/api/v1/memberships/my-plans")
        .query({ phone: "+919444455566" })
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(res.status).toBe(400);
      expect(res.body.code).toBe("validation_error");
    });

    it("returns only the authenticated buyer plans after purchase", async () => {
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set("Authorization", `Bearer ${buyerToken}`)
        .send({
          businessId: String(myPlansBusinessId),
          planId: String(myPlansPlanId),
          name: "Buyer Plans",
          phone: "+919111122233",
        });
      expect(purchase.status).toBe(201);
      expect(purchase.body.success).toBe(true);

      const mine = await request(app)
        .get("/api/v1/memberships/my-plans")
        .set("Authorization", `Bearer ${buyerToken}`);
      expect(mine.status).toBe(200);
      expect(mine.body.success).toBe(true);
      expect(Array.isArray(mine.body.plans)).toBe(true);
      expect(mine.body.plans.length).toBeGreaterThanOrEqual(1);
      expect(mine.body.plans[0].planName).toBe("My Plans Trial");

      const otherToken = signAccessToken({
        uid: otherUid,
        email: "other-plans@test.com",
      });
      const theirs = await request(app)
        .get("/api/v1/memberships/my-plans")
        .set("Authorization", `Bearer ${otherToken}`);
      expect(theirs.status).toBe(200);
      expect(theirs.body.plans).toEqual([]);
    });

    it("scopes service getMyPurchasedPlans by uid only (no query identity)", async () => {
      const result = await membershipService.getMyPurchasedPlans({ userId: buyerUid });
      expect(result.plans.length).toBeGreaterThanOrEqual(1);

      const empty = await membershipService.getMyPurchasedPlans({ userId: otherUid });
      expect(empty.plans).toEqual([]);
    });
  });
});

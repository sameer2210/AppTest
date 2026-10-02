import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import razorpayService from "@/services/razorpay.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import { Business, Membership, Payment } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { markMembershipPaid, seedGatewayOnMembership } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: subscriptionAutoRenew.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("Razorpay Subscriptions for Gym Plan Auto-Renew", () => {
    it("should create a Razorpay plan using createRazorpayPlan helper", async () => {
      const rzpPlan = await razorpayService.createRazorpayPlan({
        name: "Gold Monthly Plan",
        amount: 299900,
        currency: "INR",
        period: "monthly",
        interval: 1,
        description: "Monthly recurring gym access",
      });

      expect(rzpPlan).toBeDefined();
      expect(rzpPlan.id).toMatch(/^plan_/);
      expect(rzpPlan.period).toBe("monthly");
      expect(rzpPlan.interval).toBe(1);
    });

    it("should automatically populate gatewayPlanId when creating recurring membership plan", async () => {
      const biz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: biz,
        planData: {
          name: "Platinum Yearly",
          price: 19999,
          billingCycle: "YEARLY",
          duration: 1,
          durationUnit: "YEARS",
        },
      });

      expect(plan.gatewayPlanId).toBeDefined();
      expect(plan.gatewayPlanId).toMatch(/^plan_/);
    });

    it("should fetch subscription details using fetchSubscription helper", async () => {
      const sub = await razorpayService.fetchSubscription("sub_test_12345");
      expect(sub).toBeDefined();
      expect(sub.id).toBe("sub_test_12345");
      expect(sub.status).toBe("active");
    });

    it("should cancel gateway subscription when cancelling a membership", async () => {
      const subBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: subBiz,
        planData: {
          name: "Sub Plan",
          price: 2000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: subBiz,
        memberData: {
          name: "Cancel Subscription User",
          phone: "+919123456783",
        },
      });

      const membership = await membershipService.createMembershipForMember({
        businessId: subBiz,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2000,
          status: "ACTIVE",
          autoRenew: true,
        },
      });
      await seedGatewayOnMembership(membership._id, {
        gatewaySubscriptionId: "sub_test_to_cancel_1",
        renewalStatus: "SCHEDULED",
      });

      const cancelResult = await membershipService.cancelMembership({
        businessId: subBiz,
        membershipId: membership._id,
      });

      expect(cancelResult.membership.status).toBe("ACTIVE");
      expect(cancelResult.membership.autoRenew).toBe(false);
      expect(cancelResult.membership.renewalStatus).toBe("NONE");
      expect(cancelResult.membership.gatewaySubscriptionId).toBeNull();
    });

    it("should cancel gateway subscription when updating membership to disable autoRenew", async () => {
      const subBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: subBiz,
        planData: {
          name: "Sub Plan 2",
          price: 2000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: subBiz,
        memberData: {
          name: "Disable AutoRenew User",
          phone: "+919123456782",
        },
      });

      const membership = await membershipService.createMembershipForMember({
        businessId: subBiz,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2000,
          status: "ACTIVE",
          autoRenew: true,
        },
      });
      await seedGatewayOnMembership(membership._id, {
        gatewaySubscriptionId: "sub_test_to_cancel_2",
        renewalStatus: "SCHEDULED",
      });

      const updateResult = await membershipService.updateMembership({
        businessId: subBiz,
        membershipId: membership._id,
        updateData: {
          autoRenew: false,
        },
      });

      expect(updateResult.autoRenew).toBe(false);
      expect(updateResult.renewalStatus).toBe("NONE");
      expect(updateResult.gatewaySubscriptionId).toBeNull();
    });

    it("should map QUARTERLY cycle to Razorpay monthly/interval 3 and schedule sub ~1d before end", async () => {
      const subBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: subBiz,
        planData: {
          name: "Quarterly Auto",
          price: 4999,
          billingCycle: "QUARTERLY",
          duration: 3,
          durationUnit: "MONTHS",
        },
      });
      expect(plan.gatewayPlanId).toMatch(/^plan_/);

      const mapping = membershipPlanService.mapBillingCycleToRazorpayPeriod("QUARTERLY");
      expect(mapping).toEqual({ period: "monthly", interval: 3 });

      const member = await memberService.createMember({
        businessId: subBiz,
        memberData: {
          name: "Quarterly Member",
          phone: "+919123456781",
        },
      });

      const membership = await membershipService.createMembershipForMember({
        businessId: subBiz,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 4999,
          status: "PENDING",
          autoRenew: true,
        },
      });
      await seedGatewayOnMembership(membership._id, {
        gatewayCustomerId: "cust_quarterly_1",
      });

      await markMembershipPaid({
        businessId: subBiz,
        memberId: member._id,
        membershipId: membership._id,
        amount: 4999,
      });

      const result = await membershipService.activateMembershipOnCheckIn(
        member._id,
        subBiz,
      );

      expect(result.isNewlyActivated).toBe(true);
      expect(result.subscription?.id).toMatch(/^sub_/);
      expect(result.membership!.gatewaySubscriptionId).toMatch(/^sub_/);
      expect(result.membership!.renewalStatus).toBe("SCHEDULED");
      expect(result.membership!.gatewayCustomerId).toBe("cust_quarterly_1");

      const endSec = Math.floor(new Date(result.membership!.endDate!).getTime() / 1000);
      expect(result.subscription!.start_at).toBe(endSec - 86400);
    });

    it("should cancelSubscription helper mark subscription cancelled in test mode", async () => {
      const cancelled = await razorpayService.cancelSubscription("sub_helper_cancel");
      expect(cancelled.id).toBe("sub_helper_cancel");
      expect(cancelled.status).toBe("cancelled");
    });
  });

  describe("Subscription Webhooks, Failed Renew Expiry, and Reconciliation Cron Safety Net", () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "test_rzp_webhook_secret_stron_2026";

    const createSignedWebhook = (payloadObj: unknown) => {
      const rawString = JSON.stringify(payloadObj);
      const signature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawString)
        .digest("hex");
      return { rawString, signature };
    };

    it("should extend membership endDate, create Payment SUCCESS, and set renewalStatus=RENEWED on subscription.charged", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Monthly Sub Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Webhook Sub User",
          phone: "+919123456799",
        },
      });

      const initialStart = new Date("2026-08-01T00:00:00.000Z");
      const initialEnd = new Date("2026-09-01T00:00:00.000Z");

      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_test_charge_1001",
        startDate: initialStart,
        endDate: initialEnd,
      });

      const paymentId = "pay_hook_charge_001";
      const webhookPayload = {
        event: "subscription.charged",
        payload: {
          subscription: {
            entity: {
              id: "sub_test_charge_1001",
              status: "active",
              customer_id: "cust_charge_001",
              notes: {
                membershipId: String(membership._id),
                businessId: String(hookBiz),
              },
            },
          },
          payment: {
            entity: {
              id: paymentId,
              amount: 150000,
              currency: "INR",
              status: "captured",
              order_id: "order_sub_001",
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);

      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("ACTIVE");
      expect(updatedMem!.renewalStatus).toBe("RENEWED");
      expect(new Date(updatedMem!.endDate!).getTime()).toBeGreaterThan(initialEnd.getTime());

      const paymentRow = await Payment.findOne({ gatewayPaymentId: paymentId });
      expect(paymentRow).toBeDefined();
      expect(paymentRow!.status).toBe("SUCCESS");
      expect(paymentRow!.amount).toBe(1500);
      expect(paymentRow!.method).toBe("ONLINE");
      expect(paymentRow!.source).toBe("GATEWAY");

      const resRetry = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(resRetry.status).toBe(200);
      const afterRetryMem = await Membership.findById(membership._id);
      expect(new Date(afterRetryMem!.endDate!).getTime()).toBe(new Date(updatedMem!.endDate!).getTime());

      const paymentCount = await Payment.countDocuments({ gatewayPaymentId: paymentId });
      expect(paymentCount).toBe(1);
    });

    it("should mark membership EXPIRED, renewalStatus=FAILED, autoRenew=false on subscription.halted", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Halt Test Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Halt User",
          phone: "+919123456798",
        },
      });

      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_test_halt_1002",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86400000),
      });

      const webhookPayload = {
        event: "subscription.halted",
        payload: {
          subscription: {
            entity: {
              id: "sub_test_halt_1002",
              status: "halted",
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);

      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);

      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("EXPIRED");
      expect(updatedMem!.renewalStatus).toBe("FAILED");
      expect(updatedMem!.autoRenew).toBe(false);
    });

    it("should mark membership EXPIRED on payment.failed on subscription", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Fail Test Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Fail Payment User",
          phone: "+919123456797",
        },
      });

      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_test_fail_1003",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86400000),
      });

      const webhookPayload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_failed_1003",
              subscription_id: "sub_test_fail_1003",
              amount: 150000,
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);

      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);

      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("EXPIRED");
      expect(updatedMem!.renewalStatus).toBe("FAILED");
      expect(updatedMem!.autoRenew).toBe(false);
    });

    it("should keep status ACTIVE until endDate and set autoRenew=false on subscription.cancelled", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Cancel Test Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Cancel Webhook User",
          phone: "+919123456796",
        },
      });

      const futureEnd = new Date(Date.now() + 20 * 86400000);
      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_test_cancel_1004",
        startDate: new Date(),
        endDate: futureEnd,
      });

      const webhookPayload = {
        event: "subscription.cancelled",
        payload: {
          subscription: {
            entity: {
              id: "sub_test_cancel_1004",
              status: "cancelled",
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);

      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);

      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("ACTIVE");
      expect(updatedMem!.autoRenew).toBe(false);
      expect(updatedMem!.renewalStatus).toBe("NONE");
    });

    it("should keep ACTIVE and disable autoRenew on subscription.completed", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Completed Test Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Completed Sub User",
          phone: "+919123456793",
        },
      });

      const futureEnd = new Date(Date.now() + 10 * 86400000);
      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_test_completed_1006",
        startDate: new Date(),
        endDate: futureEnd,
      });

      const webhookPayload = {
        event: "subscription.completed",
        payload: {
          subscription: {
            entity: {
              id: "sub_test_completed_1006",
              status: "completed",
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);
      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);
      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("ACTIVE");
      expect(updatedMem!.autoRenew).toBe(false);
      expect(updatedMem!.renewalStatus).toBe("NONE");
    });

    it("should not expire membership on payment.failed without subscription_id", async () => {
      const hookBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: hookBiz,
        planData: {
          name: "Order Fail Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: hookBiz,
        memberData: {
          name: "Order Fail User",
          phone: "+919123456792",
        },
      });

      const membership = await Membership.create({
        businessId: hookBiz,
        memberId: member._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 1500,
        finalAmount: 1500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_should_stay_active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 86400000),
      });

      const webhookPayload = {
        event: "payment.failed",
        payload: {
          payment: {
            entity: {
              id: "pay_order_fail_only",
              order_id: "order_not_a_sub",
              amount: 150000,
            },
          },
        },
      };

      const { rawString, signature } = createSignedWebhook(webhookPayload);
      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);

      expect(res.status).toBe(200);
      const updatedMem = await Membership.findById(membership._id);
      expect(updatedMem!.status).toBe("ACTIVE");
      expect(updatedMem!.autoRenew).toBe(true);
    });

    it("should heal missing gatewaySubscriptionId and expire missed renewal in reconcileGymSubscriptions cron", async () => {
      const cronBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: cronBiz,
        planData: {
          name: "Cron Test Plan",
          price: 2500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member1 = await memberService.createMember({
        businessId: cronBiz,
        memberData: { name: "Heal User", phone: "+919123456795" },
      });
      const member2 = await memberService.createMember({
        businessId: cronBiz,
        memberData: { name: "Expire User", phone: "+919123456794" },
      });

      const now = new Date();

      const healMem = await Membership.create({
        businessId: cronBiz,
        memberId: member1._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 2500,
        finalAmount: 2500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "NONE",
        gatewaySubscriptionId: null,
        startDate: new Date(now.getTime() - 29 * 86400000),
        endDate: new Date(now.getTime() + 12 * 3600000),
      });

      const expireMem = await Membership.create({
        businessId: cronBiz,
        memberId: member2._id,
        planId: plan._id,
        planName: plan.name,
        priceAtPurchase: 2500,
        finalAmount: 2500,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_missed_1005",
        startDate: new Date(now.getTime() - 31 * 86400000),
        endDate: new Date(now.getTime() - 3600000),
      });

      const result = await paymentService.reconcileGymSubscriptions({ now });

      expect(result.healedCount).toBeGreaterThanOrEqual(1);
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);

      const updatedHealMem = await Membership.findById(healMem._id);
      expect(updatedHealMem!.gatewaySubscriptionId).toMatch(/^sub_/);
      expect(updatedHealMem!.renewalStatus).toBe("SCHEDULED");

      const updatedExpireMem = await Membership.findById(expireMem._id);
      expect(updatedExpireMem!.status).toBe("EXPIRED");
      expect(updatedExpireMem!.autoRenew).toBe(false);
      expect(updatedExpireMem!.renewalStatus).toBe("FAILED");
    });
  });

  describe("Customer auto-renew toggle API", () => {
    it("should let the owning customer disable auto-renew while keeping ACTIVE access", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-autorenew-toggle-01",
        businessName: "Toggle Gym",
        status: "ACTIVE",
      });
      const plan = await membershipPlanService.createPlan({
        businessId: bizDoc._id,
        planData: {
          name: "Monthly Toggle",
          price: 999,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const customerUid = "cust-uid-autorenew-disable-01";
      const phone = "+919123450001";
      await UserModel.findOneAndUpdate(
        { uid: customerUid },
        { $set: { uid: customerUid, username: "Toggle Cust", contactNo: phone } },
        { upsert: true, new: true },
      );
      const member = await memberService.createMember({
        businessId: bizDoc._id,
        memberData: { name: "Toggle Cust", phone },
      });
      const endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);
      const membership = await membershipService.createMembershipForMember({
        businessId: bizDoc._id,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 999,
          status: "ACTIVE",
          autoRenew: true,
          startDate: new Date(),
          endDate,
        },
      });
      await seedGatewayOnMembership(membership._id, {
        gatewaySubscriptionId: "sub_toggle_disable_01",
        renewalStatus: "SCHEDULED",
      });

      const customerToken = signAccessToken({ uid: customerUid, email: "toggle@example.com" });
      const res = await request(app)
        .patch(`/api/v1/memberships/${membership._id}/auto-renew`)
        .set({ Authorization: `Bearer ${customerToken}` })
        .send({ autoRenew: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.membership.status).toBe("ACTIVE");
      expect(res.body.data.membership.autoRenew).toBe(false);
      expect(res.body.data.membership.gatewaySubscriptionId).toBeNull();
      expect(res.body.data.message.toLowerCase()).toContain("access continues");
    });

    it("should recreate a Razorpay subscription when an ACTIVE customer enables auto-renew", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-autorenew-toggle-02",
        businessName: "Enable Gym",
        status: "ACTIVE",
      });
      const plan = await membershipPlanService.createPlan({
        businessId: bizDoc._id,
        planData: {
          name: "Monthly Enable",
          price: 1299,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const customerUid = "cust-uid-autorenew-enable-01";
      const phone = "+919123450002";
      await UserModel.findOneAndUpdate(
        { uid: customerUid },
        { $set: { uid: customerUid, username: "Enable Cust", contactNo: phone } },
        { upsert: true, new: true },
      );
      const member = await memberService.createMember({
        businessId: bizDoc._id,
        memberData: { name: "Enable Cust", phone },
      });
      const membership = await membershipService.createMembershipForMember({
        businessId: bizDoc._id,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 1299,
          status: "ACTIVE",
          autoRenew: false,
          startDate: new Date(),
          endDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        },
      });

      const customerToken = signAccessToken({ uid: customerUid, email: "enable@example.com" });
      const res = await request(app)
        .patch(`/api/v1/memberships/${membership._id}/auto-renew`)
        .set({ Authorization: `Bearer ${customerToken}` })
        .send({ autoRenew: true });

      expect(res.status).toBe(200);
      expect(res.body.data.membership.autoRenew).toBe(true);
      expect(res.body.data.membership.renewalStatus).toBe("SCHEDULED");
      expect(res.body.data.membership.gatewaySubscriptionId).toMatch(/^sub_/);
    });

    it("should reject enabling auto-renew on a ONE_TIME plan", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-autorenew-toggle-03",
        businessName: "One Time Gym",
        status: "ACTIVE",
      });
      const plan = await membershipPlanService.createPlan({
        businessId: bizDoc._id,
        planData: {
          name: "Drop-in",
          price: 499,
          billingCycle: "ONE_TIME",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const customerUid = "cust-uid-autorenew-onetime-01";
      const phone = "+919123450003";
      await UserModel.findOneAndUpdate(
        { uid: customerUid },
        { $set: { uid: customerUid, username: "OneTime Cust", contactNo: phone } },
        { upsert: true, new: true },
      );
      const member = await memberService.createMember({
        businessId: bizDoc._id,
        memberData: { name: "OneTime Cust", phone },
      });
      const membership = await membershipService.createMembershipForMember({
        businessId: bizDoc._id,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 499,
          status: "ACTIVE",
          autoRenew: false,
          startDate: new Date(),
          endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        },
      });

      const customerToken = signAccessToken({ uid: customerUid, email: "onetime@example.com" });
      const res = await request(app)
        .patch(`/api/v1/memberships/${membership._id}/auto-renew`)
        .set({ Authorization: `Bearer ${customerToken}` })
        .send({ autoRenew: true });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("auto_renew_not_allowed");
    });

    it("should forbid another customer from toggling someone else's membership", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-autorenew-toggle-04",
        businessName: "Forbidden Gym",
        status: "ACTIVE",
      });
      const plan = await membershipPlanService.createPlan({
        businessId: bizDoc._id,
        planData: {
          name: "Monthly Forbidden",
          price: 799,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const ownerUid = "cust-uid-autorenew-owner-01";
      const ownerPhone = "+919123450004";
      await UserModel.findOneAndUpdate(
        { uid: ownerUid },
        { $set: { uid: ownerUid, username: "Owner Cust", contactNo: ownerPhone } },
        { upsert: true, new: true },
      );
      const member = await memberService.createMember({
        businessId: bizDoc._id,
        memberData: { name: "Owner Cust", phone: ownerPhone },
      });
      const membership = await membershipService.createMembershipForMember({
        businessId: bizDoc._id,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 799,
          status: "ACTIVE",
          autoRenew: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
        },
      });

      const strangerUid = "cust-uid-autorenew-stranger-01";
      await UserModel.findOneAndUpdate(
        { uid: strangerUid },
        { $set: { uid: strangerUid, username: "Stranger", contactNo: "+919123459999" } },
        { upsert: true, new: true },
      );
      const strangerToken = signAccessToken({ uid: strangerUid, email: "stranger@example.com" });
      const res = await request(app)
        .patch(`/api/v1/memberships/${membership._id}/auto-renew`)
        .set({ Authorization: `Bearer ${strangerToken}` })
        .send({ autoRenew: false });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("forbidden");
    });

    it("should persist autoRenew=true on customer purchase of a recurring plan", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-autorenew-purchase-01",
        businessName: "Purchase Renew Gym",
        status: "ACTIVE",
      });
      const plan = await membershipPlanService.createPlan({
        businessId: bizDoc._id,
        planData: {
          name: "Monthly Purchase",
          price: 0,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const customerUid = "cust-uid-autorenew-purchase-01";
      await UserModel.findOneAndUpdate(
        { uid: customerUid },
        { $set: { uid: customerUid, username: "Purchase Cust", contactNo: "+919123450005" } },
        { upsert: true, new: true },
      );
      const customerToken = signAccessToken({ uid: customerUid, email: "purchase-renew@example.com" });
      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set({ Authorization: `Bearer ${customerToken}` })
        .send({
          businessId: String(bizDoc._id),
          planId: String(plan._id),
          autoRenew: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.membership.autoRenew).toBe(true);
      expect(res.body.data.membership.status).toBe("PENDING");
    });
  });
});

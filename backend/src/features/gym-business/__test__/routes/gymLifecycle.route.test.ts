import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import businessService from "@/features/gym-business/services/business.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import couponService from "@/features/gym-business/services/coupon.service.js";
import paymentService from "@/features/gym-business/services/payment.service.js";
import attendanceService, { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import { Business, Membership, Payment } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { UserNotification } from "@/features/notifications/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { markMembershipPaid } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: gymLifecycle.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("Gym free trial eligibility, convert, and stop", () => {
    const seedTrialGym = async (suffix: string) => {
      const ownerUid = `trial-fs-owner-${suffix}`;
      const customerUid = `trial-fs-cust-${suffix}`;
      const biz = await businessService.createBusinessProfile({
        ownerId: ownerUid,
        businessData: {
          businessName: `Trial Convert Gym ${suffix}`,
          location: "Pune",
          phone: `98000${suffix}`,
        },
      });
      const paidPlan = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: `Paid Pack ${suffix}`,
          price: 1499,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });
      const trialPlan = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: `Free Trial ${suffix}`,
          price: 0,
          billingCycle: "ONE_TIME",
          duration: 7,
          durationUnit: "DAYS",
          status: "ACTIVE",
          isFreeTrial: true,
          trialDuration: 7,
          convertToPlanId: paidPlan._id,
        },
      });
      await UserModel.create({
        uid: customerUid,
        username: `Trial Cust ${suffix}`,
        email: `trial-fs-${suffix}@test.com`,
        contactNo: `+9197000${suffix}`,
      });
      const auth = {
        Authorization: `Bearer ${signAccessToken({
          uid: customerUid,
          email: `trial-fs-${suffix}@test.com`,
        })}`,
      };
      return { biz, paidPlan, trialPlan, customerUid, auth };
    };

    it("should block a second free trial at the same gym (once per gym)", async () => {
      const { biz, trialPlan, auth } = await seedTrialGym("101");
      const first = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(first.status).toBe(201);
      expect(first.body.data.membership.status).toBe("ACTIVE");

      const otherTrial = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: "Another Trial",
          price: 0,
          billingCycle: "ONE_TIME",
          duration: 3,
          durationUnit: "DAYS",
          status: "ACTIVE",
          isFreeTrial: true,
          trialDuration: 3,
        },
      });
      const second = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(otherTrial._id) });
      expect(second.status).toBe(400);
      expect(second.body.code).toBe("trial_not_eligible");
      expect(second.body.message).toBe("You have already used a free trial at this gym.");
    });

    it("should block free trial when the member has already paid at the gym", async () => {
      const { biz, paidPlan, trialPlan, auth } = await seedTrialGym("102");
      const paid = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(paidPlan._id) });
      expect(paid.status).toBe(201);

      const trial = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(trial.status).toBe(400);
      expect(trial.body.code).toBe("trial_not_eligible");
      expect(trial.body.message).toBe(
        "Free trial is not available because you have already paid at this gym.",
      );
    });

    it("should list ACTIVE trial-only members as NEW_LEADS, not ACTIVE", async () => {
      const { biz, trialPlan, auth } = await seedTrialGym("103");
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(purchase.status).toBe(201);
      const memberId = purchase.body.data.membership.memberId;

      const leads = await memberService.listMembers({
        businessId: biz._id,
        paginationParams: { category: "NEW_LEADS", page: 1, limit: 50, skip: 0 },
      });
      expect(leads.members.some((m: { _id: unknown }) => String(m._id) === String(memberId))).toBe(true);

      const active = await memberService.listMembers({
        businessId: biz._id,
        paginationParams: { category: "ACTIVE", page: 1, limit: 50, skip: 0 },
      });
      expect(active.members.some((m: { _id: unknown }) => String(m._id) === String(memberId))).toBe(false);
    });

    it("should expire ACTIVE trials with no charge when the trial plan is STOPPED", async () => {
      const { biz, trialPlan, auth } = await seedTrialGym("104");
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(purchase.status).toBe(201);
      const membershipId = purchase.body.data.membership._id;

      const stop = (await membershipPlanService.stopPlan({
        businessId: biz._id,
        planId: trialPlan._id,
      })) as { expiredTrialCount?: number };
      expect(stop.expiredTrialCount).toBeGreaterThanOrEqual(1);

      const mem = await Membership.findById(membershipId).lean();
      expect(mem!.status).toBe("EXPIRED");
      const charged = await Payment.findOne({
        membershipId,
        finalAmount: { $gt: 0 },
      }).lean();
      expect(charged).toBeNull();
    });

    it("should convert an ended trial into PENDING paid membership + Razorpay order", async () => {
      const { biz, paidPlan, trialPlan, auth } = await seedTrialGym("105");
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(purchase.status).toBe(201);
      const trialMemId = purchase.body.data.membership._id;
      const memberId = purchase.body.data.membership.memberId;

      await Membership.updateOne(
        { _id: trialMemId },
        { $set: { endDate: new Date(Date.now() - 60 * 1000) } },
      );

      const result = await membershipService.convertExpiredGymTrials({ now: new Date() });
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);
      expect(result.convertedCount).toBeGreaterThanOrEqual(1);

      const trialMem = await Membership.findById(trialMemId).lean();
      expect(trialMem!.status).toBe("EXPIRED");

      const convertMem = await Membership.findOne({
        businessId: biz._id,
        memberId,
        planId: paidPlan._id,
        status: "PENDING",
        notes: { $regex: /TRIAL_CONVERT/ },
      }).lean();
      expect(convertMem).toBeTruthy();
      expect(convertMem!.purchasedAt).toBeNull();
      expect(convertMem!.startDate).toBeNull();
      expect(convertMem!.endDate).toBeNull();

      const convertPay = await Payment.findOne({
        membershipId: convertMem!._id,
        status: "PENDING",
      }).lean();
      expect(convertPay).toBeTruthy();
      expect(convertPay!.gatewayOrderId).toMatch(/^order_/);
      expect(convertPay!.finalAmount).toBe(1499);
    });

    it("should expire trial with no convert order when convert plan is STOPPED", async () => {
      const { biz, paidPlan, trialPlan, auth } = await seedTrialGym("106");
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      const trialMemId = purchase.body.data.membership._id;
      const memberId = purchase.body.data.membership.memberId;

      await membershipPlanService.stopPlan({
        businessId: biz._id,
        planId: paidPlan._id,
      });
      await Membership.updateOne(
        { _id: trialMemId },
        { $set: { endDate: new Date(Date.now() - 60 * 1000) } },
      );

      const result = await membershipService.convertExpiredGymTrials({ now: new Date() });
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);

      const trialMem = await Membership.findById(trialMemId).lean();
      expect(trialMem!.status).toBe("EXPIRED");
      const convertMem = await Membership.findOne({
        businessId: biz._id,
        memberId,
        planId: paidPlan._id,
        notes: { $regex: /TRIAL_CONVERT/ },
      }).lean();
      expect(convertMem).toBeNull();
    });

    it("should mark stale unpaid trial-convert PENDING as EXPIRED with renewalStatus FAILED", async () => {
      const { biz, paidPlan } = await seedTrialGym("107");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Stale Convert", phone: "+9197000107" },
      });
      const stale = await Membership.create({
        businessId: biz._id,
        memberId: member._id,
        planId: paidPlan._id,
        status: "PENDING",
        purchasedAt: null,
        finalAmount: 1499,
        priceAtPurchase: 1499,
        discountAmount: 0,
        autoRenew: false,
        renewalStatus: "NONE",
        notes: "TRIAL_CONVERT from stale",
      });
      const result = await membershipService.convertExpiredGymTrials({
        now: new Date(Date.now() + 50 * 60 * 60 * 1000),
      });
      expect(result.failedCount).toBeGreaterThanOrEqual(1);

      const updated = await Membership.findById(stale._id).lean();
      expect(updated!.status).toBe("EXPIRED");
      expect(updated!.renewalStatus).toBe("FAILED");
    });
  });

  describe("Gym plan subscription lifecycle notifications", () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret";
    const signWebhook = (payloadObj: unknown) => {
      const rawString = JSON.stringify(payloadObj);
      const signature = crypto.createHmac("sha256", webhookSecret).update(rawString).digest("hex");
      return { rawString, signature };
    };

    const seedNotifyGym = async (suffix: string) => {
      const ownerUid = `notify-owner-${suffix}`;
      const customerUid = `notify-cust-${suffix}`;
      const phone = `+9197111${suffix}`;
      await UserModel.create({
        uid: ownerUid,
        username: `Owner ${suffix}`,
        email: `owner-notify-${suffix}@test.com`,
        contactNo: `+9196111${suffix}`,
      });
      await UserModel.create({
        uid: customerUid,
        username: `Cust ${suffix}`,
        email: `cust-notify-${suffix}@test.com`,
        contactNo: phone,
      });
      const biz = await businessService.createBusinessProfile({
        ownerId: ownerUid,
        businessData: {
          businessName: `Notify Gym ${suffix}`,
          location: "Pune",
          phone: `97111${suffix}`,
        },
      });
      const paidPlan = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: `Paid Notify ${suffix}`,
          price: 1299,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });
      const trialPlan = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: `Trial Notify ${suffix}`,
          price: 0,
          billingCycle: "ONE_TIME",
          duration: 7,
          durationUnit: "DAYS",
          status: "ACTIVE",
          isFreeTrial: true,
          trialDuration: 7,
        },
      });
      const auth = {
        Authorization: `Bearer ${signAccessToken({
          uid: customerUid,
          email: `cust-notify-${suffix}@test.com`,
        })}`,
      };
      return { biz, paidPlan, trialPlan, ownerUid, customerUid, phone, auth };
    };

    it("should inbox customer + owner on paid verify, and not duplicate on idempotent retry", async () => {
      const { biz, paidPlan, ownerUid, customerUid, auth } = await seedNotifyGym("201");
      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(paidPlan._id) });
      expect(purchase.status).toBe(201);
      const { membership, order } = purchase.body.data;
      const gatewayOrderId = order.id;
      const gatewayPaymentId = `pay_notify_${Date.now()}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      const gatewaySignature = crypto
        .createHmac("sha256", secret)
        .update(`${gatewayOrderId}|${gatewayPaymentId}`)
        .digest("hex");

      const verify1 = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(auth)
        .send({ gatewayOrderId, gatewayPaymentId, gatewaySignature });
      expect(verify1.status).toBe(200);

      const customerRows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Purchase",
      }).lean();
      const ownerRows = await UserNotification.find({
        uid: ownerUid,
        tag: "Gym New Sale",
      }).lean();
      expect(customerRows).toHaveLength(1);
      expect(customerRows[0].body).toBe(
        "Payment successful. Your plan will activate on first check-in.",
      );
      expect(ownerRows).toHaveLength(1);
      expect(String(customerRows[0].data?.membershipId)).toBe(String(membership._id));

      const verify2 = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(auth)
        .send({ gatewayOrderId, gatewayPaymentId, gatewaySignature });
      expect(verify2.status).toBe(200);
      const customerRowsAfter = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Purchase",
      }).lean();
      expect(customerRowsAfter).toHaveLength(1);
    });

    it("should inbox customer only (not owner) on gym free trial start", async () => {
      const { biz, trialPlan, ownerUid, customerUid, auth } = await seedNotifyGym("202");
      const res = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan._id) });
      expect(res.status).toBe(201);

      const customerRows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Purchase",
      }).lean();
      const ownerRows = await UserNotification.find({
        uid: ownerUid,
        tag: "Gym New Sale",
      }).lean();
      expect(customerRows).toHaveLength(1);
      expect(customerRows[0].body).toBe(
        "Your free trial has started. Check in at the gym anytime during the trial.",
      );
      expect(ownerRows).toHaveLength(0);
    });

    it("should inbox Gym Plan Activated on first check-in", async () => {
      const { biz, paidPlan, customerUid, phone } = await seedNotifyGym("203");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Activate Cust", phone },
      });
      const pendingNotify = await membershipService.createMembershipForMember({
        businessId: biz._id,
        memberId: member._id,
        membershipData: {
          planId: paidPlan._id,
          finalAmount: 1299,
          status: "PENDING",
          purchasedAt: new Date(),
        },
      });

      await markMembershipPaid({
        businessId: biz._id,
        memberId: member._id,
        membershipId: pendingNotify._id,
        amount: 1299,
      });

      const result = await membershipService.activateMembershipOnCheckIn(
        member._id,
        biz._id,
      );
      expect(result.isNewlyActivated).toBe(true);

      const rows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Plan Activated",
      }).lean();
      expect(rows).toHaveLength(1);
    });

    it("should inbox Gym Auto-renew Off when customer disables auto-renew", async () => {
      const { biz, paidPlan, customerUid, phone, auth } = await seedNotifyGym("204");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Off Cust", phone },
      });
      const membership = await membershipService.createMembershipForMember({
        businessId: biz._id,
        memberId: member._id,
        membershipData: {
          planId: paidPlan._id,
          finalAmount: 1299,
          status: "ACTIVE",
          autoRenew: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .patch(`/api/v1/memberships/${membership._id}/auto-renew`)
        .set(auth)
        .send({ autoRenew: false });
      expect(res.status).toBe(200);

      const rows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Auto-renew Off",
      }).lean();
      expect(rows).toHaveLength(1);
    });

    it("should inbox Gym Auto-renew on subscription.charged", async () => {
      const { biz, paidPlan, customerUid, phone } = await seedNotifyGym("205");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Charge Cust", phone },
      });
      const membership = await Membership.create({
        businessId: biz._id,
        memberId: member._id,
        planId: paidPlan._id,
        priceAtPurchase: 1299,
        finalAmount: 1299,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_notify_charge_205",
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      });

      const payload = {
        event: "subscription.charged",
        payload: {
          subscription: { entity: { id: "sub_notify_charge_205", status: "active" } },
          payment: {
            entity: {
              id: "pay_notify_charge_205",
              amount: 129900,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };
      const { rawString, signature } = signWebhook(payload);
      const result = await paymentService.handleRazorpayWebhook({
        rawBody: rawString,
        signature,
        eventPayload: payload,
      });
      expect(result.received).toBe(true);

      const rows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Auto-renew",
      }).lean();
      expect(rows).toHaveLength(1);
      expect(String(rows[0].data?.membershipId)).toBe(String(membership._id));
    });

    it("should inbox customer + owner on auto-renew halt fail", async () => {
      const { biz, paidPlan, ownerUid, customerUid, phone } = await seedNotifyGym("206");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Fail Cust", phone },
      });
      const membership = await Membership.create({
        businessId: biz._id,
        memberId: member._id,
        planId: paidPlan._id,
        priceAtPurchase: 1299,
        finalAmount: 1299,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_notify_halt_206",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const payload = {
        event: "subscription.halted",
        payload: {
          subscription: { entity: { id: "sub_notify_halt_206", status: "halted" } },
          payment: { entity: { id: "pay_notify_halt_206" } },
        },
      };
      const { rawString, signature } = signWebhook(payload);
      await paymentService.handleRazorpayWebhook({
        rawBody: rawString,
        signature,
        eventPayload: payload,
      });

      const customerRows = await UserNotification.find({
        uid: customerUid,
        tag: "Gym Auto-renew Failed",
      }).lean();
      const ownerRows = await UserNotification.find({
        uid: ownerUid,
        tag: "Gym Renew Failed",
      }).lean();
      expect(customerRows).toHaveLength(1);
      expect(ownerRows).toHaveLength(1);

      const mem = await Membership.findById(membership._id).lean();
      expect(mem!.status).toBe("EXPIRED");
    });
  });

  describe("Gym subscription state-machine acceptance (86d458q3c)", () => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_webhook_secret";
    const signWebhook = (payloadObj: unknown) => {
      const rawString = JSON.stringify(payloadObj);
      const signature = crypto.createHmac("sha256", webhookSecret).update(rawString).digest("hex");
      return { rawString, signature };
    };
    const signVerify = (orderId: string, paymentId: string) => {
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      return crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    };

    const seedAcceptanceGym = async (suffix: string, { withTrial = false } = {}) => {
      const ownerUid = `qa-sm-owner-${suffix}`;
      const customerUid = `qa-sm-cust-${suffix}`;
      const phone = `+9198000${suffix}`;
      await UserModel.create({
        uid: ownerUid,
        username: `QA Owner ${suffix}`,
        email: `qa-owner-${suffix}@test.com`,
        contactNo: `+9198100${suffix}`,
      });
      await UserModel.create({
        uid: customerUid,
        username: `QA Cust ${suffix}`,
        email: `qa-cust-${suffix}@test.com`,
        contactNo: phone,
      });
      const biz = await businessService.createBusinessProfile({
        ownerId: ownerUid,
        businessData: {
          businessName: `QA State Gym ${suffix}`,
          location: "Pune",
          phone: `98000${suffix}`,
        },
      });
      const paidPlan = await membershipPlanService.createPlan({
        businessId: biz._id,
        planData: {
          name: `QA Monthly ${suffix}`,
          price: 1599,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });
      let trialPlan = null;
      if (withTrial) {
        trialPlan = await membershipPlanService.createPlan({
          businessId: biz._id,
          planData: {
            name: `QA Trial ${suffix}`,
            price: 0,
            billingCycle: "ONE_TIME",
            duration: 7,
            durationUnit: "DAYS",
            status: "ACTIVE",
            isFreeTrial: true,
            trialDuration: 7,
            convertToPlanId: paidPlan._id,
          },
        });
      }
      const auth = {
        Authorization: `Bearer ${signAccessToken({
          uid: customerUid,
          email: `qa-cust-${suffix}@test.com`,
        })}`,
      };
      return { biz, paidPlan, trialPlan, ownerUid, customerUid, phone, auth };
    };

    it("should walk paid plan: purchase PENDING → pay SUCCESS still PENDING → check-in ACTIVE → charged extends → disable stays ACTIVE", async () => {
      const { biz, paidPlan, ownerUid, customerUid, auth } = await seedAcceptanceGym("301");

      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({
          businessId: String(biz._id),
          planId: String(paidPlan._id),
          autoRenew: true,
        });
      expect(purchase.status).toBe(201);
      const membershipId = purchase.body.data.membership._id;
      const memberId = purchase.body.data.membership.memberId;
      expect(purchase.body.data.membership.status).toBe("PENDING");
      expect(purchase.body.data.membership.autoRenew).toBe(true);
      expect(purchase.body.data.payment.status).toBe("PENDING");
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Purchase" })).toBe(0);

      const orderId = purchase.body.data.order.id;
      const payId = `pay_qa_sm_${Date.now()}`;
      const verify = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(auth)
        .send({
          gatewayOrderId: orderId,
          gatewayPaymentId: payId,
          gatewaySignature: signVerify(orderId, payId),
        });
      expect(verify.status).toBe(200);
      expect(verify.body.data.membershipStatus).toBe("PENDING");
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Purchase" })).toBe(1);
      expect(await UserNotification.countDocuments({ uid: ownerUid, tag: "Gym New Sale" })).toBe(1);

      const paidMem = await Membership.findById(membershipId).lean();
      expect(paidMem!.status).toBe("PENDING");
      expect(paidMem!.startDate).toBeNull();

      const attendance = await attendanceService.recordAttendance({
        businessId: biz._id,
        markedBy: ownerUid,
        requireActiveMembership: true,
        attendanceData: {
          memberId,
          attendanceDate: getISTDateString(),
          source: "QR",
        },
      });
      expect(attendance.accessGate.status).toBe("ALLOWED");
      expect(attendance.accessGate.isNewlyActivated).toBe(true);
      expect(attendance.accessGate.activationMessage).toBeTruthy();
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Plan Activated" })).toBe(1);

      const activatedMem = await Membership.findById(membershipId).lean();
      expect(activatedMem!.status).toBe("ACTIVE");
      expect(activatedMem!.startDate).toBeTruthy();
      expect(activatedMem!.gatewaySubscriptionId).toMatch(/^sub_/);
      const initialEnd = new Date(activatedMem!.endDate!).getTime();

      const chargePayload = {
        event: "subscription.charged",
        payload: {
          subscription: {
            entity: {
              id: activatedMem!.gatewaySubscriptionId,
              status: "active",
              customer_id: "cust_qa_301",
            },
          },
          payment: {
            entity: {
              id: `pay_qa_charge_${Date.now()}`,
              amount: 159900,
              currency: "INR",
              status: "captured",
            },
          },
        },
      };
      const { rawString, signature } = signWebhook(chargePayload);
      const chargeRes = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);
      expect(chargeRes.status).toBe(200);

      const extendedMem = await Membership.findById(membershipId).lean();
      expect(new Date(extendedMem!.endDate!).getTime()).toBeGreaterThan(initialEnd);
      expect(extendedMem!.renewalStatus).toBe("RENEWED");
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Auto-renew" })).toBe(1);

      const toggle = await request(app)
        .patch(`/api/v1/memberships/${membershipId}/auto-renew`)
        .set(auth)
        .send({ autoRenew: false });
      expect(toggle.status).toBe(200);
      expect(toggle.body.data.membership.status).toBe("ACTIVE");
      expect(toggle.body.data.membership.autoRenew).toBe(false);
      expect(toggle.body.data.membership.gatewaySubscriptionId).toBeNull();
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Auto-renew Off" })).toBe(1);
    });

    it("should walk subscription failure: halt marks EXPIRED and inboxes both customer and owner", async () => {
      const { biz, paidPlan, ownerUid, customerUid, phone } = await seedAcceptanceGym("302");
      const member = await memberService.createMember({
        businessId: biz._id,
        memberData: { name: "Halt Flow Cust", phone },
      });
      const membership = await Membership.create({
        businessId: biz._id,
        memberId: member._id,
        planId: paidPlan._id,
        priceAtPurchase: 1599,
        finalAmount: 1599,
        status: "ACTIVE",
        autoRenew: true,
        renewalStatus: "SCHEDULED",
        gatewaySubscriptionId: "sub_qa_halt_302",
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      const haltPayload = {
        event: "subscription.halted",
        payload: {
          subscription: { entity: { id: "sub_qa_halt_302", status: "halted" } },
          payment: { entity: { id: "pay_qa_halt_302" } },
        },
      };
      const { rawString, signature } = signWebhook(haltPayload);
      const res = await request(app)
        .post("/api/v1/payments/webhook/razorpay")
        .set("x-razorpay-signature", signature)
        .set("Content-Type", "application/json")
        .send(rawString);
      expect(res.status).toBe(200);

      const mem = await Membership.findById(membership._id).lean();
      expect(mem!.status).toBe("EXPIRED");
      expect(mem!.renewalStatus).toBe("FAILED");
      expect(mem!.autoRenew).toBe(false);

      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Auto-renew Failed" })).toBe(1);
      expect(await UserNotification.countDocuments({ uid: ownerUid, tag: "Gym Renew Failed" })).toBe(1);
    });

    it("should walk free trial lifecycle: start ACTIVE (lead) → convert PENDING paid → check-in activates paid", async () => {
      const { biz, paidPlan, trialPlan, ownerUid, customerUid, auth } = await seedAcceptanceGym("303", { withTrial: true });

      const trialPurchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({ businessId: String(biz._id), planId: String(trialPlan!._id) });
      expect(trialPurchase.status).toBe(201);
      const trialMemId = trialPurchase.body.data.membership._id;
      const memberId = trialPurchase.body.data.membership.memberId;
      expect(trialPurchase.body.data.membership.status).toBe("ACTIVE");
      expect(trialPurchase.body.data.isFree).toBe(true);
      expect(await UserNotification.countDocuments({ uid: customerUid, tag: "Gym Purchase" })).toBe(1);
      expect(await UserNotification.countDocuments({ uid: ownerUid, tag: "Gym New Sale" })).toBe(0);

      const leads = await memberService.listMembers({
        businessId: biz._id,
        paginationParams: { category: "NEW_LEADS", page: 1, limit: 50, skip: 0 },
      });
      expect(leads.members.some((m: { _id: unknown }) => String(m._id) === String(memberId))).toBe(true);

      await Membership.updateOne(
        { _id: trialMemId },
        { $set: { endDate: new Date(Date.now() - 60 * 1000) } },
      );
      const convertRes = await membershipService.convertExpiredGymTrials({ now: new Date() });
      expect(convertRes.convertedCount).toBeGreaterThanOrEqual(1);

      const convertMem = await Membership.findOne({
        businessId: biz._id,
        memberId,
        planId: paidPlan._id,
        status: "PENDING",
      }).lean();
      expect(convertMem).toBeTruthy();
      expect(convertMem!.purchasedAt).toBeNull();

      const payDoc = await Payment.findOne({ membershipId: convertMem!._id }).lean();
      expect(payDoc).toBeTruthy();
      const orderId = payDoc!.gatewayOrderId;
      const payId = `pay_qa_convert_${Date.now()}`;
      const verify = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(auth)
        .send({
          gatewayOrderId: orderId,
          gatewayPaymentId: payId,
          gatewaySignature: signVerify(orderId!, payId),
        });
      expect(verify.status).toBe(200);
      expect(verify.body.data.membershipStatus).toBe("PENDING");

      const checkIn = await attendanceService.recordAttendance({
        businessId: biz._id,
        markedBy: ownerUid,
        requireActiveMembership: true,
        attendanceData: {
          memberId,
          attendanceDate: getISTDateString(),
          source: "QR",
        },
      });
      expect(checkIn.accessGate.isNewlyActivated).toBe(true);
      const paidActive = await Membership.findById(convertMem!._id).lean();
      expect(paidActive!.status).toBe("ACTIVE");

      const other = await seedAcceptanceGym("304", { withTrial: true });
      const otherTrial = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(other.auth)
        .send({ businessId: String(other.biz._id), planId: String(other.trialPlan!._id) });
      const stop = (await membershipPlanService.stopPlan({
        businessId: other.biz._id,
        planId: other.trialPlan!._id,
      })) as { expiredTrialCount?: number };
      expect(stop.expiredTrialCount).toBeGreaterThanOrEqual(1);
      const stoppedTrial = await Membership.findById(otherTrial.body.data.membership._id).lean();
      expect(stoppedTrial!.status).toBe("EXPIRED");
      const charged = await Payment.findOne({
        membershipId: stoppedTrial!._id,
        finalAmount: { $gt: 0 },
      }).lean();
      expect(charged).toBeNull();
    });

    it("should refund unactivated PENDING after paid verify and leave no ACTIVE access", async () => {
      const { biz, paidPlan, auth } = await seedAcceptanceGym("305");

      const purchase = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(auth)
        .send({
          businessId: String(biz._id),
          planId: String(paidPlan._id),
          autoRenew: true,
        });
      expect(purchase.status).toBe(201);
      const membershipId = purchase.body.data.membership._id;
      const orderId = purchase.body.data.order.id;
      const payId = `pay_qa_refund_${Date.now()}`;

      const verify = await request(app)
        .post("/api/v1/payments/online/verify")
        .set(auth)
        .send({
          gatewayOrderId: orderId,
          gatewayPaymentId: payId,
          gatewaySignature: signVerify(orderId, payId),
        });
      expect(verify.status).toBe(200);
      expect(verify.body.data.membershipStatus).toBe("PENDING");

      const cancelResult = await membershipService.cancelMembership({
        businessId: biz._id,
        membershipId,
        reason: "Changed mind before first check-in",
      });

      expect(cancelResult.membership.status).toBe("CANCELLED");
      expect(cancelResult.membership.autoRenew).toBe(false);
      expect(cancelResult.refund).toBeDefined();
      expect(cancelResult.refund!.id).toMatch(/^rfnd_/);
      expect(cancelResult.accessUntil).toBeNull();

      const payment = await Payment.findOne({ membershipId, status: "REFUNDED" }).lean();
      expect(payment).toBeTruthy();

      const stillActive = await Membership.findOne({
        _id: membershipId,
        status: "ACTIVE",
      }).lean();
      expect(stillActive).toBeNull();
    });
  });

  describe("Feature spec matrix (A–G)", () => {
    it("A — business profile stores owner-scoped gym config fields", async () => {
      const owner = "feat-a-owner-001";
      const biz = await businessService.createBusinessProfile({
        ownerId: owner,
        businessData: {
          businessName: "Matrix Gym A",
          phone: "9988776655",
          location: "MG Road",
          openingHours: [{ day: "MONDAY", openTime: "06:00", closeTime: "22:00", isAvailable: true }],
          services: ["Yoga", "Weights"],
          mapLink: "https://maps.example.com/gym-a",
        },
      });
      expect(biz.businessName).toBe("Matrix Gym A");
      expect(biz.openingHours).toHaveLength(1);
      expect(biz.services).toContain("Yoga");
      expect(biz.mapLink).toContain("maps.example.com");
      expect(biz.status).toBe("ACTIVE");
    });

    it("B — supports all billing cycles and blocks STOPPED plan purchase", async () => {
      const bizId = new mongoose.Types.ObjectId();
      const cycles = ["ONE_TIME", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
      for (const billingCycle of cycles) {
        const p = await membershipPlanService.createPlan({
          businessId: bizId,
          planData: {
            name: `${billingCycle} Plan`,
            price: 500,
            billingCycle,
            duration: 1,
            durationUnit: "MONTHS",
            status: "ACTIVE",
          },
        });
        expect(p.billingCycle).toBe(billingCycle);
      }
      const stopped = await membershipPlanService.createPlan({
        businessId: bizId,
        planData: {
          name: "Stopped",
          price: 100,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
          status: "ACTIVE",
        },
      });
      await membershipPlanService.stopPlan({ businessId: bizId, planId: stopped._id });
      const member = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Stopped Buyer", phone: "+919100000099" },
      });
      await expect(
        membershipService.createMembershipForMember({
          businessId: bizId,
          memberId: member._id,
          membershipData: { planId: stopped._id, finalAmount: 100 },
        }),
      ).rejects.toMatchObject({ code: "plan_stopped" });
    });

    it("C — classifies members into NEW_LEADS / EXPIRED / ABOUT_TO_EXPIRE / MORE_THAN_WEEK", async () => {
      const bizId = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: bizId,
        planData: {
          name: "Classify Plan",
          price: 1000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const leadNoPlan = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Lead None", phone: "+919100000001" },
      });
      const leadPending = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Lead Pending", phone: "+919100000002" },
      });
      await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: leadPending._id,
        membershipData: { planId: plan._id, finalAmount: 1000, status: "PENDING" },
      });

      const expiredMember = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Expired Mem", phone: "+919100000003" },
      });
      await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: expiredMember._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 1000,
          status: "ACTIVE",
          startDate: new Date(Date.now() - 60 * 86400000),
          endDate: new Date(Date.now() - 1 * 86400000),
          activateImmediately: true,
        },
      });

      const expiringMember = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Expiring Soon", phone: "+919100000004" },
      });
      await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: expiringMember._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 1000,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 3 * 86400000),
          activateImmediately: true,
        },
      });

      const weekPlusMember = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Week Plus", phone: "+919100000005" },
      });
      await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: weekPlusMember._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 1000,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 20 * 86400000),
          activateImmediately: true,
        },
      });

      const fetchCategory = async (category: string) => {
        const res = await memberService.listMembers({
          businessId: bizId,
          paginationParams: { category, page: 1, limit: 50, skip: 0 },
        });
        return res.members.map((m: { _id: unknown }) => String(m._id));
      };

      const newLeads = await fetchCategory("NEW_LEADS");
      expect(newLeads).toContain(String(leadNoPlan._id));
      expect(newLeads).toContain(String(leadPending._id));

      const expired = await fetchCategory("EXPIRED");
      expect(expired).toContain(String(expiredMember._id));

      const aboutToExpire = await fetchCategory("ABOUT_TO_EXPIRE");
      expect(aboutToExpire).toContain(String(expiringMember._id));

      const weekPlus = await fetchCategory("MORE_THAN_WEEK");
      expect(weekPlus).toContain(String(weekPlusMember._id));
    });

    it("D — increments coupon usedCoupons only after payment SUCCESS", async () => {
      const bizDoc = await Business.create({
        ownerId: "coupon-matrix-owner",
        businessName: "Coupon Matrix Gym",
        status: "ACTIVE",
      });
      const bizId = bizDoc._id;
      const plan = await membershipPlanService.createPlan({
        businessId: bizId,
        planData: {
          name: "Coupon Plan",
          price: 2000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const coupon = await couponService.createCoupon({
        businessId: bizId,
        couponData: {
          code: "SAVE10",
          type: "PERCENTAGE",
          discountPercentage: 10,
          totalCoupons: 5,
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          applicablePlanIds: [plan._id],
        },
      });
      expect(coupon.usedCoupons).toBe(0);

      const customerUid = "coupon-quota-cust-01";
      await UserModel.create({
        uid: customerUid,
        username: "Coupon Buyer",
        contactNo: "+919188877766",
      });

      const purchase = await membershipService.purchaseMembership({
        userId: customerUid,
        userAuth: { uid: customerUid, contactNo: "+919188877766" },
        purchaseData: {
          businessId: String(bizId),
          planId: String(plan._id),
          couponCode: "SAVE10",
        },
      });
      expect(purchase.membership.status).toBe("PENDING");
      expect(purchase.payment!.status).toBe("PENDING");

      const beforePay = await couponService.getCouponById({ businessId: bizId, couponId: coupon._id });
      expect(beforePay.usedCoupons).toBe(0);

      const orderId = purchase.order!.id;
      const payId = `pay_coupon_${Date.now()}`;
      const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret";
      const sig = crypto.createHmac("sha256", secret).update(`${orderId}|${payId}`).digest("hex");

      await paymentService.verifyOnlinePayment({
        verificationData: {
          gatewayOrderId: orderId,
          gatewayPaymentId: payId,
          gatewaySignature: sig,
        },
      });

      const afterPay = await couponService.getCouponById({ businessId: bizId, couponId: coupon._id });
      expect(afterPay.usedCoupons).toBe(1);
    });

    it("E — paid online stays PENDING until first check-in sets ACTIVE dates", async () => {
      const bizId = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: bizId,
        planData: {
          name: "Checkin Plan",
          price: 1500,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const member = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Checkin User", phone: "+919177766655" },
      });
      const pending = await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: member._id,
        membershipData: { planId: plan._id, finalAmount: 1500, status: "PENDING" },
      });
      await markMembershipPaid({
        businessId: bizId,
        memberId: member._id,
        membershipId: pending._id,
        amount: 1500,
      });

      const before = await Membership.findById(pending._id).lean();
      expect(before!.startDate).toBeNull();
      expect(before!.endDate).toBeNull();

      const act = await membershipService.activateMembershipOnCheckIn(member._id, bizId);
      expect(act.isNewlyActivated).toBe(true);
      expect(act.membership!.status).toBe("ACTIVE");
      expect(act.membership!.startDate).toBeTruthy();
      expect(act.membership!.endDate).toBeTruthy();
    });

    it("G — PENDING cancel refunds SUCCESS payment; ACTIVE cancel keeps access", async () => {
      const bizId = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: bizId,
        planData: {
          name: "Cancel Plan",
          price: 900,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });
      const member = await memberService.createMember({
        businessId: bizId,
        memberData: { name: "Cancel User", phone: "+919166655544" },
      });
      const pending = await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: member._id,
        membershipData: { planId: plan._id, finalAmount: 900, status: "PENDING" },
      });
      await Payment.create({
        businessId: bizId,
        memberId: member._id,
        membershipId: pending._id,
        amount: 900,
        finalAmount: 900,
        method: "ONLINE",
        source: "GATEWAY",
        status: "SUCCESS",
        gatewayPaymentId: "pay_cancel_matrix_01",
        paidAt: new Date(),
      });

      const pendingCancel = await membershipService.cancelMembership({
        membershipId: pending._id,
        userId: null,
        businessId: bizId,
        reason: "Matrix test refund",
      });
      expect(pendingCancel.membership.status).toBe("CANCELLED");
      expect(pendingCancel.refund).toBeDefined();

      const activeEnd = new Date(Date.now() + 10 * 86400000);
      const active = await membershipService.createMembershipForMember({
        businessId: bizId,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 900,
          status: "ACTIVE",
          autoRenew: true,
          startDate: new Date(),
          endDate: activeEnd,
          activateImmediately: true,
        },
      });
      const activeCancel = await membershipService.cancelMembership({
        membershipId: active._id,
        businessId: bizId,
        userId: null,
        reason: "Disable renew",
      });
      expect(activeCancel.membership.status).toBe("ACTIVE");
      expect(activeCancel.membership.autoRenew).toBe(false);
      expect(activeCancel.accessUntil).toBeTruthy();
    });
  });
});

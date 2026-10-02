import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import businessService from "@/features/gym-business/services/business.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import { Business, Membership, Payment } from "@/features/gym-business/index.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";
import { seedGatewayOnMembership } from "@/features/gym-business/__test__/helpers.js";

describe("gym-business: gymRefundsAndGuards.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("Unactivated Refunds & Plan Stop/Cancel Guards", () => {
    it("should refund captured payment and mark CANCELLED when cancelling unactivated PENDING membership", async () => {
      const refundBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: refundBiz,
        planData: {
          name: "Refundable Plan",
          price: 3000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: refundBiz,
        memberData: {
          name: "Pending Cancel User",
          phone: "+919123456770",
        },
      });

      const membership = await membershipService.createMembershipForMember({
        businessId: refundBiz,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 3000,
          status: "PENDING",
          autoRenew: true,
          purchasedAt: new Date(),
        },
      });

      const payment = await Payment.create({
        businessId: refundBiz,
        memberId: member._id,
        membershipId: membership._id,
        planId: plan._id,
        planName: plan.name,
        amount: 3000,
        discountAmount: 0,
        finalAmount: 3000,
        currency: "INR",
        method: "ONLINE",
        source: "GATEWAY",
        status: "SUCCESS",
        transactionId: "TXN_PENDING_REFUND_01",
        gatewayPaymentId: "pay_pending_cancel_01",
        gatewayOrderId: "order_pending_cancel_01",
        paidAt: new Date(),
      });

      const cancelResult = await membershipService.cancelMembership({
        businessId: refundBiz,
        membershipId: membership._id,
        reason: "Customer changed mind before visiting gym",
      });

      expect(cancelResult.membership.status).toBe("CANCELLED");
      expect(cancelResult.membership.autoRenew).toBe(false);
      expect(cancelResult.membership.renewalStatus).toBe("NONE");
      expect(cancelResult.refund).toBeDefined();
      expect(cancelResult.refund!.id).toMatch(/^rfnd_/);

      const updatedPayment = await Payment.findById(payment._id);
      expect(updatedPayment!.status).toBe("REFUNDED");
      expect(updatedPayment!.notes).toContain("Refunded on unactivated cancel");
    });

    it("should refund all PENDING buyers and cancel their memberships when plan is STOPPED, without cancelling ACTIVE members", async () => {
      const stopBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: stopBiz,
        planData: {
          name: "Discontinued Plan",
          price: 2000,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member1 = await memberService.createMember({
        businessId: stopBiz,
        memberData: { name: "Buyer One", phone: "+919123456771" },
      });
      const member2 = await memberService.createMember({
        businessId: stopBiz,
        memberData: { name: "Buyer Two", phone: "+919123456772" },
      });
      const member3 = await memberService.createMember({
        businessId: stopBiz,
        memberData: { name: "Active Buyer", phone: "+919123456773" },
      });

      const mem1 = await membershipService.createMembershipForMember({
        businessId: stopBiz,
        memberId: member1._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2000,
          status: "PENDING",
          purchasedAt: new Date(),
        },
      });
      const pay1 = await Payment.create({
        businessId: stopBiz,
        memberId: member1._id,
        membershipId: mem1._id,
        planId: plan._id,
        planName: plan.name,
        amount: 2000,
        finalAmount: 2000,
        currency: "INR",
        method: "ONLINE",
        source: "GATEWAY",
        status: "SUCCESS",
        transactionId: "TXN_STOP_01",
        gatewayPaymentId: "pay_stop_01",
        paidAt: new Date(),
      });

      const mem2 = await membershipService.createMembershipForMember({
        businessId: stopBiz,
        memberId: member2._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2000,
          status: "PENDING",
          purchasedAt: new Date(),
        },
      });
      const pay2 = await Payment.create({
        businessId: stopBiz,
        memberId: member2._id,
        membershipId: mem2._id,
        planId: plan._id,
        planName: plan.name,
        amount: 2000,
        finalAmount: 2000,
        currency: "INR",
        method: "ONLINE",
        source: "GATEWAY",
        status: "SUCCESS",
        transactionId: "TXN_STOP_02",
        gatewayPaymentId: "pay_stop_02",
        paidAt: new Date(),
      });

      const mem3 = await membershipService.createMembershipForMember({
        businessId: stopBiz,
        memberId: member3._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2000,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 25 * 86400000),
        },
      });

      const stopResult = await membershipPlanService.stopPlan({
        businessId: stopBiz,
        planId: plan._id,
      });

      expect(stopResult.plan.status).toBe("STOPPED");
      expect(stopResult.refundedCount).toBe(2);
      expect(stopResult.cancelledCount).toBe(2);

      const updatedMem1 = await Membership.findById(mem1._id);
      expect(updatedMem1!.status).toBe("CANCELLED");

      const updatedMem2 = await Membership.findById(mem2._id);
      expect(updatedMem2!.status).toBe("CANCELLED");

      const updatedPay1 = await Payment.findById(pay1._id);
      expect(updatedPay1!.status).toBe("REFUNDED");

      const updatedPay2 = await Payment.findById(pay2._id);
      expect(updatedPay2!.status).toBe("REFUNDED");

      const updatedMem3 = await Membership.findById(mem3._id);
      expect(updatedMem3!.status).toBe("ACTIVE");
    });

    it("should allow customer-authenticated cancel via API and refund unactivated plan", async () => {
      const bizDoc = await Business.create({
        ownerId: "owner-api-cancel-01",
        businessName: "API Cancel Gym",
        status: "ACTIVE",
      });
      const apiBiz = bizDoc._id;

      const plan = await membershipPlanService.createPlan({
        businessId: apiBiz,
        planData: {
          name: "API Refund Plan",
          price: 1800,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const customerUid = "cust-uid-cancel-test-01";
      const customerToken = signAccessToken({ uid: customerUid, email: "custcancel@example.com" });
      const customerAuthHeader = { Authorization: `Bearer ${customerToken}` };

      await UserModel.findOneAndUpdate(
        { uid: customerUid },
        { $set: { uid: customerUid, username: "API Cancel Cust", contactNo: "+919123456774" } },
        { upsert: true, new: true },
      );

      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set(customerAuthHeader)
        .send({
          businessId: String(apiBiz),
          planId: String(plan._id),
        });

      expect(purchaseRes.status).toBe(201);
      const membershipId = purchaseRes.body.data.membership._id;

      await Payment.findOneAndUpdate(
        { membershipId },
        {
          $set: {
            status: "SUCCESS",
            gatewayPaymentId: "pay_cust_api_cancel_01",
            paidAt: new Date(),
          },
        },
      );

      const cancelRes = await request(app)
        .post(`/api/v1/memberships/${membershipId}/cancel`)
        .set(customerAuthHeader)
        .send({ reason: "Unactivated cancel by customer" });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.membership.status).toBe("CANCELLED");
      expect(cancelRes.body.data.refund).toBeDefined();

      const paymentDoc = await Payment.findOne({ membershipId });
      expect(paymentDoc!.status).toBe("REFUNDED");
    });

    it("should disable auto-renew on ACTIVE cancel but keep access until endDate", async () => {
      const activeBiz = new mongoose.Types.ObjectId();
      const plan = await membershipPlanService.createPlan({
        businessId: activeBiz,
        planData: {
          name: "Active Cancel Plan",
          price: 2200,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const member = await memberService.createMember({
        businessId: activeBiz,
        memberData: {
          name: "Active Cancel User",
          phone: "+919123456775",
        },
      });

      const endDate = new Date(Date.now() + 20 * 86400000);
      const membership = await membershipService.createMembershipForMember({
        businessId: activeBiz,
        memberId: member._id,
        membershipData: {
          planId: plan._id,
          finalAmount: 2200,
          status: "ACTIVE",
          autoRenew: true,
          startDate: new Date(),
          endDate,
        },
      });
      await seedGatewayOnMembership(membership._id, {
        gatewaySubscriptionId: "sub_active_cancel_01",
        renewalStatus: "SCHEDULED",
      });

      const cancelResult = await membershipService.cancelMembership({
        businessId: activeBiz,
        membershipId: membership._id,
        reason: "Disable auto-renew only",
      });

      expect(cancelResult.membership.status).toBe("ACTIVE");
      expect(cancelResult.membership.autoRenew).toBe(false);
      expect(cancelResult.membership.renewalStatus).toBe("NONE");
      expect(cancelResult.membership.gatewaySubscriptionId).toBeNull();
      expect(cancelResult.refund).toBeNull();
      expect(new Date(cancelResult.accessUntil!).getTime()).toBe(endDate.getTime());
      expect(cancelResult.message.toLowerCase()).toContain("access continues");
    });

    it("should allow gym-owner buyer to cancel membership at another gym (optionalBusiness)", async () => {
      const buyerOwnGym = await Business.create({
        ownerId: "gym-owner-buyer-cancel-01",
        businessName: "Buyer Own Gym",
        status: "ACTIVE",
      });
      const otherGym = await Business.create({
        ownerId: "other-gym-owner-cancel-01",
        businessName: "Other Gym Membership",
        status: "ACTIVE",
      });

      const plan = await membershipPlanService.createPlan({
        businessId: otherGym._id,
        planData: {
          name: "Cross Gym Plan",
          price: 2200,
          billingCycle: "MONTHLY",
          duration: 1,
          durationUnit: "MONTHS",
        },
      });

      const buyerUid = "gym-owner-buyer-cancel-01";
      const buyerToken = signAccessToken({ uid: buyerUid, email: "ownerbuyer@example.com" });
      await UserModel.findOneAndUpdate(
        { uid: buyerUid },
        { $set: { uid: buyerUid, username: "Owner Buyer", contactNo: "+919123456767" } },
        { upsert: true, new: true },
      );

      const purchaseRes = await request(app)
        .post("/api/v1/memberships/purchase")
        .set({ Authorization: `Bearer ${buyerToken}` })
        .send({
          businessId: String(otherGym._id),
          planId: String(plan._id),
        });
      expect(purchaseRes.status).toBe(201);
      const membershipId = purchaseRes.body.data.membership._id;

      await Payment.findOneAndUpdate(
        { membershipId },
        {
          $set: {
            status: "SUCCESS",
            gatewayPaymentId: "pay_cross_gym_cancel_01",
            paidAt: new Date(),
          },
        },
      );

      const cancelRes = await request(app)
        .post(`/api/v1/memberships/${membershipId}/cancel`)
        .set({ Authorization: `Bearer ${buyerToken}` })
        .send({ reason: "Cross-gym buyer cancel" });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.data.membership.status).toBe("CANCELLED");
      expect(String(buyerOwnGym._id)).not.toBe(String(otherGym._id));
    });
  });
});

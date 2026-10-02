import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import analyticsValidators from "../analytics.validator.js";
import attendanceValidators from "../attendance.validator.js";
import businessValidators from "../business.validator.js";
import couponValidators from "../coupon.validator.js";
import gymPaymentValidators from "../gymPayment.validator.js";
import memberValidators from "../member.validator.js";
import membershipValidators from "../membership.validator.js";
import membershipPlanValidators from "../membershipPlan.validator.js";
import payoutAccountValidators from "../payoutAccount.validator.js";
import proSubscriptionValidators from "../proSubscription.validator.js";

const validId = new mongoose.Types.ObjectId().toHexString();

describe("gym-business validators", () => {
  describe("analytics.validator", () => {
    it("validates summary, revenue, member, attendance, plan, coupon, and listing analytics", () => {
      expect(analyticsValidators.getDashboardSummarySchema.query.safeParse({ period: "month", year: "2026" }).success).toBe(true);
      expect(analyticsValidators.getDashboardSummarySchema.query.safeParse({ year: "invalid" }).success).toBe(false);

      expect(analyticsValidators.getRevenueAnalyticsSchema.query.safeParse({ year: "2025" }).success).toBe(true);
      expect(analyticsValidators.getRevenueAnalyticsSchema.query.safeParse({ year: "25" }).success).toBe(false);

      expect(analyticsValidators.getMemberAnalyticsSchema.query.safeParse({ year: "2026" }).success).toBe(true);
      expect(analyticsValidators.getMemberAnalyticsSchema.query.safeParse({ year: "year" }).success).toBe(false);

      expect(analyticsValidators.getAttendanceAnalyticsSchema.query.safeParse({ period: "week" }).success).toBe(true);
      expect(analyticsValidators.getAttendanceAnalyticsSchema.query.safeParse({ period: "decade" }).success).toBe(false);

      expect(analyticsValidators.getPlanAnalyticsSchema.query.safeParse({ page: 1, limit: "10" }).success).toBe(true);
      expect(analyticsValidators.getCouponAnalyticsSchema.query.safeParse({ page: "1", limit: 20 }).success).toBe(true);
      expect(analyticsValidators.getListingAnalyticsSchema.query.safeParse({ tab: "conversion_rate" }).success).toBe(true);
      expect(analyticsValidators.getListingAnalyticsSchema.query.safeParse({ tab: "invalid_tab" }).success).toBe(false);
    });
  });

  describe("attendance.validator", () => {
    it("validates recordAttendanceSchema, attendanceQuerySchema, and memberAttendanceParamSchema", () => {
      expect(
        attendanceValidators.recordAttendanceSchema.body.safeParse({
          memberId: validId,
          attendanceDate: "2026-09-07",
          source: "QR",
          inTime: "09:30 AM",
        }).success,
      ).toBe(true);

      expect(
        attendanceValidators.recordAttendanceSchema.body.safeParse({
          memberId: "invalid-id",
          attendanceDate: "07/09/2026",
        }).success,
      ).toBe(false);

      expect(
        attendanceValidators.attendanceQuerySchema.query.safeParse({
          page: "2",
          limit: "30",
          memberId: validId,
          date: "2026-09-07",
        }).success,
      ).toBe(true);

      expect(
        attendanceValidators.memberAttendanceParamSchema.params.safeParse({
          memberId: validId,
        }).success,
      ).toBe(true);
    });
  });

  describe("business.validator", () => {
    it("validates createBusinessSchema and maps link transform correctly", () => {
      const parsedWithHttps = businessValidators.createBusinessSchema.body.parse({
        businessName: "Iron Gym",
        mapLink: "https://maps.google.com/?q=test",
        openingHours: [{ day: "MONDAY", isAvailable: true, openTime: "06:00", closeTime: "22:00" }],
      });
      expect(parsedWithHttps.mapLink).toBe("https://maps.google.com/?q=test");
      expect(parsedWithHttps.businessName).toBe("Iron Gym");

      const parsedWithHttp = businessValidators.createBusinessSchema.body.parse({
        mapLink: "http://maps.google.com/?q=test",
      });
      expect(parsedWithHttp.mapLink).toBe("http://maps.google.com/?q=test");
      expect(parsedWithHttp.businessName).toBe("Register Your Business");

      const parsedWithBadUrl = businessValidators.createBusinessSchema.body.parse({
        mapLink: "ftp://maps.google.com/?q=test",
      });
      expect(parsedWithBadUrl.mapLink).toBeNull();

      const parsedWithMalformedUrl = businessValidators.createBusinessSchema.body.parse({
        mapLink: "just random text",
      });
      expect(parsedWithMalformedUrl.mapLink).toBeNull();

      const parsedWithNullUrl = businessValidators.createBusinessSchema.body.parse({
        mapLink: null,
      });
      expect(parsedWithNullUrl.mapLink).toBeNull();
    });

    it("validates updateBusinessSchema", () => {
      const parsed = businessValidators.updateBusinessSchema.body.parse({
        businessName: "Updated Gym",
        mapLink: "https://maps.apple.com/gym",
      });
      expect(parsed.businessName).toBe("Updated Gym");
      expect(parsed.mapLink).toBe("https://maps.apple.com/gym");

      const parsedHttp = businessValidators.updateBusinessSchema.body.parse({
        mapLink: "http://maps.apple.com/gym",
      });
      expect(parsedHttp.mapLink).toBe("http://maps.apple.com/gym");

      const parsedFtp = businessValidators.updateBusinessSchema.body.parse({
        mapLink: "ftp://maps.apple.com/gym",
      });
      expect(parsedFtp.mapLink).toBeNull();

      const parsedBad = businessValidators.updateBusinessSchema.body.parse({
        mapLink: "not-a-valid-url",
      });
      expect(parsedBad.mapLink).toBeNull();

      const parsedNull = businessValidators.updateBusinessSchema.body.parse({
        mapLink: null,
      });
      expect(parsedNull.mapLink).toBeNull();
    });

    it("keeps unique http(s) gallery URLs and drops invalid entries", () => {
      const parsed = businessValidators.updateBusinessSchema.body.parse({
        galleryUrls: [
          "https://apidev.stron.in/api/upload/public/gym-gallery/one.jpg",
          "ftp://invalid.example/photo.jpg",
          "https://apidev.stron.in/api/upload/public/gym-gallery/one.jpg",
          "not-a-url",
          "http://apidev.stron.in/api/upload/public/gym-gallery/two.jpg",
        ],
      });
      expect(parsed.galleryUrls).toEqual([
        "https://apidev.stron.in/api/upload/public/gym-gallery/one.jpg",
        "http://apidev.stron.in/api/upload/public/gym-gallery/two.jpg",
      ]);

      const cleared = businessValidators.updateBusinessSchema.body.parse({
        galleryUrls: [],
      });
      expect(cleared.galleryUrls).toEqual([]);

      expect(
        businessValidators.updateBusinessSchema.body.safeParse({
          galleryUrls: Array.from({ length: 8 }, (_, i) => `https://cdn.example/${i}.jpg`),
        }).success,
      ).toBe(false);
    });
  });

  describe("coupon.validator", () => {
    it("validates createCouponSchema with PERCENTAGE and FIXED_AMOUNT refinements", () => {
      // Valid percentage
      expect(
        couponValidators.createCouponSchema.body.safeParse({
          code: "SAVE20",
          type: "PERCENTAGE",
          discountPercentage: 20,
          expiresAt: "2026-12-31",
        }).success,
      ).toBe(true);

      // Invalid percentage without discountPercentage
      expect(
        couponValidators.createCouponSchema.body.safeParse({
          code: "SAVE20",
          type: "PERCENTAGE",
          expiresAt: "2026-12-31",
        }).success,
      ).toBe(false);

      // Valid fixed amount
      expect(
        couponValidators.createCouponSchema.body.safeParse({
          code: "FLAT100",
          type: "FIXED_AMOUNT",
          discountAmount: 100,
          expiresAt: "2026-12-31",
        }).success,
      ).toBe(true);

      // Invalid fixed amount without discountAmount
      expect(
        couponValidators.createCouponSchema.body.safeParse({
          code: "FLAT100",
          type: "FIXED_AMOUNT",
          expiresAt: "2026-12-31",
        }).success,
      ).toBe(false);
    });

    it("validates couponIdParamSchema, updateCouponSchema, validateCouponSchema, and listCouponsQuerySchema", () => {
      expect(couponValidators.couponIdParamSchema.params.safeParse({ couponId: validId }).success).toBe(true);
      expect(couponValidators.updateCouponSchema.params.safeParse({ couponId: validId }).success).toBe(true);
      expect(
        couponValidators.updateCouponSchema.body.safeParse({
          discountPercentage: 25,
          status: "ACTIVE",
        }).success,
      ).toBe(true);
      expect(couponValidators.validateCouponSchema.body.safeParse({ code: "DISCOUNT" }).success).toBe(true);
      expect(couponValidators.listCouponsQuerySchema.query.safeParse({ page: 1, limit: 10 }).success).toBe(true);
    });
  });

  describe("gymPayment.validator", () => {
    it("validates createOnlinePaymentOrderSchema refinement", () => {
      // With membershipId
      expect(
        gymPaymentValidators.createOnlinePaymentOrderSchema.body.safeParse({
          membershipId: validId,
        }).success,
      ).toBe(true);

      // With planId
      expect(
        gymPaymentValidators.createOnlinePaymentOrderSchema.body.safeParse({
          planId: validId,
        }).success,
      ).toBe(true);

      // Neither membershipId nor planId
      expect(
        gymPaymentValidators.createOnlinePaymentOrderSchema.body.safeParse({
          amount: 500,
        }).success,
      ).toBe(false);
    });

    it("validates paymentIdParamSchema, createManualPaymentSchema, verifyOnlinePaymentSchema, and listPaymentsQuerySchema", () => {
      expect(gymPaymentValidators.paymentIdParamSchema.params.safeParse({ paymentId: validId }).success).toBe(true);

      expect(
        gymPaymentValidators.createManualPaymentSchema.body.safeParse({
          memberId: validId,
          amount: 1500,
          method: "UPI",
        }).success,
      ).toBe(true);

      expect(
        gymPaymentValidators.verifyOnlinePaymentSchema.body.safeParse({
          gatewayOrderId: "order_123",
          gatewayPaymentId: "pay_123",
          gatewaySignature: "sig_123",
        }).success,
      ).toBe(true);

      expect(
        gymPaymentValidators.listPaymentsQuerySchema.query.safeParse({
          status: "SUCCESS",
          method: "ONLINE",
        }).success,
      ).toBe(true);
    });
  });

  describe("member.validator", () => {
    it("validates createMemberSchema, updateMemberSchema, listMembersQuerySchema, and sendPaymentReminderSchema", () => {
      expect(
        memberValidators.createMemberSchema.body.safeParse({
          name: "Alex Doe",
          phone: "+919876543210",
          email: "alex@example.com",
          gender: "MALE",
        }).success,
      ).toBe(true);

      expect(memberValidators.memberIdParamSchema.params.safeParse({ memberId: validId }).success).toBe(true);

      expect(
        memberValidators.updateMemberSchema.body.safeParse({
          name: "Alex Updated",
          phone: "+919876543211",
        }).success,
      ).toBe(true);

      expect(
        memberValidators.listMembersQuerySchema.query.safeParse({
          category: "ACTIVE",
          sortBy: "createdAt",
        }).success,
      ).toBe(true);

      expect(
        memberValidators.sendPaymentReminderSchema.body.safeParse({
          channel: "WHATSAPP",
          customMessage: "Please renew",
        }).success,
      ).toBe(true);
    });
  });

  describe("membership.validator", () => {
    it("validates membership creation, update, purchase, query, and cancellation", () => {
      expect(membershipValidators.membershipIdParamSchema.params.safeParse({ membershipId: validId }).success).toBe(true);

      expect(
        membershipValidators.createMembershipForMemberSchema.body.safeParse({
          planId: validId,
          discountAmount: 0,
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.updateMembershipSchema.body.safeParse({
          status: "CANCELLED",
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.listMembershipsQuerySchema.query.safeParse({
          status: "ACTIVE",
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.purchaseMembershipSchema.body.safeParse({
          businessId: validId,
          planId: validId,
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.myPurchasedPlansQuerySchema.query.safeParse({
          page: "1",
          limit: "10",
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.cancelMembershipSchema.body.safeParse({
          reason: "Relocating",
        }).success,
      ).toBe(true);

      expect(
        membershipValidators.setAutoRenewSchema.body.safeParse({
          autoRenew: true,
        }).success,
      ).toBe(true);
    });
  });

  describe("membershipPlan.validator", () => {
    it("validates planIdParamSchema, createPlanSchema, updatePlanSchema, and listPlansQuerySchema", () => {
      expect(membershipPlanValidators.planIdParamSchema.params.safeParse({ planId: validId }).success).toBe(true);

      expect(
        membershipPlanValidators.createPlanSchema.body.safeParse({
          name: "Annual Pass",
          price: 9999,
          billingCycle: "YEARLY",
          duration: 1,
          durationUnit: "YEARS",
        }).success,
      ).toBe(true);

      expect(
        membershipPlanValidators.updatePlanSchema.body.safeParse({
          name: "Annual Pass Updated",
          price: 10999,
        }).success,
      ).toBe(true);

      expect(
        membershipPlanValidators.listPlansQuerySchema.query.safeParse({
          status: "ACTIVE",
        }).success,
      ).toBe(true);
    });
  });

  describe("payoutAccount.validator", () => {
    it("validates PAN and IFSC regex formats in create and update", () => {
      expect(
        payoutAccountValidators.createPayoutAccountSchema.body.safeParse({
          accountHolderName: "Gym Owner",
          accountNumber: "1234567890",
          ifsc: "HDFC0001234",
          panNumber: "ABCDE1234F",
        }).success,
      ).toBe(true);

      expect(
        payoutAccountValidators.createPayoutAccountSchema.body.safeParse({
          accountHolderName: "Gym Owner",
          accountNumber: "1234567890",
          ifsc: "invalid-ifsc",
          panNumber: "invalid-pan",
        }).success,
      ).toBe(false);

      expect(
        payoutAccountValidators.updatePayoutAccountSchema.body.safeParse({
          accountHolderName: "Gym Owner Updated",
          panNumber: "ABCDE1234F",
          ifsc: "HDFC0001234",
        }).success,
      ).toBe(true);

      expect(
        payoutAccountValidators.updatePayoutAccountSchema.body.safeParse({
          ifsc: "bad-ifsc",
        }).success,
      ).toBe(false);

      expect(
        payoutAccountValidators.verifyPayoutAccountSchema.body.safeParse({}).success,
      ).toBe(true);
    });
  });

  describe("proSubscription.validator", () => {
    it("validates all pro subscription operations", () => {
      expect(proSubscriptionValidators.subscribeProSchema.body.safeParse({ planCode: "STRON_PRO" }).success).toBe(true);
      expect(proSubscriptionValidators.cancelProSchema.body.safeParse({ cancelReason: "Too expensive" }).success).toBe(true);
      expect(proSubscriptionValidators.syncRevenueCatSchema.body.safeParse({}).success).toBe(true);
      expect(proSubscriptionValidators.activateTrialSchema.body.safeParse({}).success).toBe(true);
      expect(proSubscriptionValidators.createRazorpayOrderSchema.body.safeParse({ cycle: "MONTHLY" }).success).toBe(true);
      expect(
        proSubscriptionValidators.verifyRazorpayPaymentSchema.body.safeParse({
          razorpay_order_id: "order_1",
          razorpay_payment_id: "pay_1",
          razorpay_signature: "sig_1",
        }).success,
      ).toBe(true);
      expect(proSubscriptionValidators.pauseProSchema.body.safeParse({ pauseDays: 30 }).success).toBe(true);
      expect(proSubscriptionValidators.pauseProSchema.body.safeParse({ pauseDays: 120 }).success).toBe(false);
      expect(proSubscriptionValidators.resumeProSchema.body.safeParse({}).success).toBe(true);
    });
  });
});

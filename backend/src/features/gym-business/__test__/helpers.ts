import { signAccessToken } from "@/utils/jwt.util.js";
import businessService from "@/features/gym-business/services/business.service.js";
import memberService from "@/features/gym-business/services/member.service.js";
import membershipPlanService from "@/features/gym-business/services/membershipPlan.service.js";
import membershipService from "@/features/gym-business/services/membership.service.js";
import couponService from "@/features/gym-business/services/coupon.service.js";
import { Membership, Payment, BrandPageVisit, Coupon } from "@/features/gym-business/index.js";
import { getISTDateString } from "@/features/gym-business/services/attendance.service.js";
import type { TestObjectId, TestToken } from "@/test-helpers/helpers.js";

export const seedGatewayOnMembership = async (
  membershipId: TestObjectId,
  fields: Record<string, unknown>,
) => {
  await Membership.updateOne({ _id: membershipId }, { $set: fields });
};

/** Mark a membership as paid so check-in activation is allowed (E. First Check-in model). */
export const markMembershipPaid = async ({
  businessId,
  memberId,
  membershipId,
  amount = 1000,
}: {
  businessId: TestObjectId;
  memberId: TestObjectId;
  membershipId: TestObjectId;
  amount?: number;
}) =>
  Payment.create({
    businessId,
    memberId,
    membershipId,
    amount,
    finalAmount: amount,
    currency: "INR",
    method: "ONLINE",
    source: "GATEWAY",
    status: "SUCCESS",
    paidAt: new Date(),
  });

export const createGymTestContext = async (
  ownerUid = "owner-uid-vitest-001",
  businessData: Record<string, unknown> = {},
) => {
  const token = signAccessToken({ uid: ownerUid, email: `${ownerUid}@testgym.com` });
  const business = await businessService.createBusinessProfile({
    ownerId: ownerUid,
    businessData: {
      businessName: "Iron Core Gym",
      location: "Indiranagar, Bangalore",
      phone: "9876543210",
      services: ["CrossFit", "Zumba"],
      ...businessData,
    },
  });
  return {
    ownerUid,
    token,
    business,
    businessId: business._id as TestObjectId,
  };
};

export const createTestPlan = async (
  businessId: TestObjectId,
  overrides: Record<string, unknown> = {},
) => {
  return membershipPlanService.createPlan({
    businessId,
    planData: {
      name: "Quarterly Pro",
      price: 3000,
      billingCycle: "QUARTERLY",
      duration: 3,
      durationUnit: "MONTHS",
      perks: ["Lockers", "Shower"],
      ...overrides,
    },
  });
};

export const createTestMember = async (
  businessId: TestObjectId,
  overrides: Record<string, unknown> = {},
) => {
  return memberService.createMember({
    businessId,
    memberData: {
      name: "Rahul Sharma",
      phone: "9876543211",
      email: "rahul@test.com",
      gender: "MALE",
      ...overrides,
    },
  });
};

export const seedBrandPageAnalytics = async ({ businessId }: { businessId: TestObjectId }) => {
  const today = getISTDateString();
  const visitCount = 10;

  await BrandPageVisit.create({
    businessId,
    dateIST: today,
    count: visitCount,
    uniqueVisitorHashes: ["visitor-hash-aaaa", "visitor-hash-bbbb"],
  });

  const trialPlan = await createTestPlan(businessId, {
    name: "Brand Free Trial",
    price: 0,
    billingCycle: "ONE_TIME",
    duration: 14,
    durationUnit: "DAYS",
    isFreeTrial: true,
    trialDuration: 14,
  });

  const paidPlan = await createTestPlan(businessId, {
    name: "Brand Monthly",
    price: 1999,
    billingCycle: "MONTHLY",
    duration: 1,
    durationUnit: "MONTHS",
  });

  const trialMember = await createTestMember(businessId, {
    name: "Trial User",
    phone: "9111190101",
    email: "trial@test.com",
  });
  await membershipService.createMembershipForMember({
    businessId,
    memberId: trialMember._id,
    membershipData: {
      planId: trialPlan._id,
      status: "ACTIVE",
      finalAmount: 0,
    },
  });

  const buyer = await createTestMember(businessId, {
    name: "Paying User",
    phone: "9111190102",
    email: "buyer@test.com",
  });

  const coupon = await couponService.createCoupon({
    businessId,
    couponData: {
      code: "BRAND10",
      type: "FIXED_AMOUNT",
      discountAmount: 200,
      minimumOrderValue: 500,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      applicablePlanIds: [paidPlan._id],
    },
  });

  await Payment.create({
    businessId,
    memberId: buyer._id,
    planId: paidPlan._id,
    amount: 1999,
    finalAmount: 1999,
    currency: "INR",
    method: "UPI",
    source: "GATEWAY",
    status: "SUCCESS",
    paidAt: new Date(),
  });

  await Payment.create({
    businessId,
    memberId: buyer._id,
    planId: paidPlan._id,
    couponId: coupon._id,
    amount: 1999,
    discountAmount: 200,
    finalAmount: 1799,
    currency: "INR",
    method: "UPI",
    source: "GATEWAY",
    status: "SUCCESS",
    paidAt: new Date(),
  });

  await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCoupons: 1 } });

  return {
    visits: visitCount,
    trialMembers: 1,
    purchaseAttempts: 2,
    offerClaims: 1,
  };
};

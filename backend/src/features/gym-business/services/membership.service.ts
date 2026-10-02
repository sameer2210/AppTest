import Membership from "../models/membership.model.js";
import Member from "../models/member.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Coupon from "../models/coupon.model.js";
import Business from "../models/business.model.js";
import { UserModel } from "../../identity-auth/index.js";
import Payment from "../models/payment.model.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";
import { calculateEndDate } from "../../../utils/membershipDate.util.js";
import {
  createOrder,
  createSubscription,
  cancelSubscription,
  refundPayment,
} from "../../../services/razorpay.service.js";
import { validateCoupon } from "./coupon.service.js";
import { ensureGatewayPlanId } from "./membershipPlan.service.js";
import {
  notifyGymPurchase,
  notifyGymActivated,
  notifyGymAutoRenewOff,
} from "./gymLifecycleNotify.service.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import { cancelPendingPaymentReminders } from "./reminder.service.js";
import {
  asPopulatedPlan,
  MongoFilter,
  PaginationQuery,
  PopulatedPlanRef,
  ServiceParams,
} from "../../../types/service.util.js";

import type {
  UserWithPhone,
  PopulatedGymBusinessRef,
  PopulatedGymPlanRef,
  IMembership,
} from "../types/index.js";
import { TRIAL_CONVERT_WINDOW_MS } from "../../../constants/index.js";


const asPopulatedGymPlan = (ref: unknown): PopulatedGymPlanRef | null =>
  ref && typeof ref === "object" ? (ref as PopulatedGymPlanRef) : null;

const asPopulatedGymBusiness = (ref: unknown): PopulatedGymBusinessRef | null =>
  ref && typeof ref === "object" ? (ref as PopulatedGymBusinessRef) : null;

// calculateEndDate is in ../../../utils/membershipDate.util.js (imported above).
// Keep the named re-export so callers that imported it from here continue to work.
export { calculateEndDate } from "../../../utils/membershipDate.util.js";

/**
 * Gym free-trial eligibility (once per gym + previous payer).
 * Shared by customer purchase and staff assign.
 */
export const assertGymTrialEligibility = async ({ businessId, memberId }: ServiceParams) => {
  const priorMemberships = await Membership.find({ businessId, memberId })
    .populate("planId", "isFreeTrial")
    .select("planId finalAmount")
    .lean();

  const hadTrial = priorMemberships.some((m) =>
    Boolean(asPopulatedPlan(m.planId)?.isFreeTrial),
  );
  if (hadTrial) {
    throw codedError(
      "trial_not_eligible",
      "You have already used a free trial at this gym.",
    );
  }

  const [paidPayment] = await Promise.all([
    Payment.findOne({
      businessId,
      memberId,
      status: "SUCCESS",
      finalAmount: { $gt: 0 },
    })
      .select("_id")
      .lean(),
  ]);

  const hadPaidMembership = priorMemberships.some(
    (m) => !asPopulatedPlan(m.planId)?.isFreeTrial && Number(m.finalAmount) > 0,
  );

  if (paidPayment || hadPaidMembership) {
    throw codedError(
      "trial_not_eligible",
      "Free trial is not available because you have already paid at this gym.",
    );
  }
};

const memberPhonesMatch = (member: ServiceParams | null | undefined, user: ServiceParams | null | undefined) => {
  const digits = (v: unknown) => String(v || "").replace(/\D/g, "");
  const memberDigits = digits(member?.phone);
  const userDigits = digits(user?.contactNo || (user as UserWithPhone | null)?.phone);
  return Boolean(
    memberDigits &&
      userDigits &&
      (memberDigits === userDigits || memberDigits.slice(-10) === userDigits.slice(-10)),
  );
};

const assertCustomerOwnsMembership = async ({ membership, userId }: ServiceParams) => {
  const mem = membership as ServiceParams;
  const [member, user] = await Promise.all([
    Member.findById(mem.memberId).lean(),
    UserModel.findOne({ uid: userId }).select("uid contactNo phone").lean(),
  ]);
  if (!member || !memberPhonesMatch(member, user)) {
    throw codedError("forbidden", "You are not authorized to update this membership.");
  }
};

/**
 * Create a Razorpay subscription for an ACTIVE auto-renew membership.
 * Shared by first check-in and PATCH /auto-renew enable.
 */
export const ensureGatewaySubscriptionForMembership = async ({
  membership,
  plan,
  businessId,
  memberId,
}: ServiceParams) => {
  const mem = membership as ServiceParams;
  const planDoc = plan as ServiceParams;
  const billingCycle = planDoc?.billingCycle;
  const isAutoRenewable =
    Boolean(mem.autoRenew) &&
    billingCycle &&
    billingCycle !== "ONE_TIME" &&
    !planDoc?.isFreeTrial;

  if (!isAutoRenewable || mem.gatewaySubscriptionId || !mem.endDate) {
    return { subscription: null, skipped: true };
  }

  let razorpayPlanId = planDoc.gatewayPlanId || null;
  if (!razorpayPlanId) {
    razorpayPlanId = await ensureGatewayPlanId({
      _id: planDoc._id,
      businessId,
      name: planDoc.name,
      price: planDoc.price ?? mem.priceAtPurchase,
      currency: planDoc.currency || "INR",
      billingCycle: planDoc.billingCycle,
      isFreeTrial: planDoc.isFreeTrial,
      gatewayPlanId: planDoc.gatewayPlanId,
    });
  }

  if (!razorpayPlanId) {
    logger.warn(
      "[ensureGatewaySubscriptionForMembership] Skipping Razorpay subscription: could not resolve gatewayPlanId",
    );
    return { subscription: null, skipped: true };
  }

  const now = new Date();
  const endSec = Math.floor(new Date(mem.endDate as Date | string).getTime() / 1000);
  const oneDayBeforeSec = endSec - 86400;
  const minStartSec = Math.floor(now.getTime() / 1000) + 60;
  const startAt = Math.max(minStartSec, oneDayBeforeSec);

  const sub = await createSubscription({
    planId: razorpayPlanId,
    customerId: mem.gatewayCustomerId || null,
    startAt,
    notes: {
      businessId: String(businessId),
      memberId: String(memberId),
      membershipId: String(mem._id),
      planId: String(planDoc._id),
      autoRenew: "true",
    },
  } as ServiceParams);

  const subResult = sub as ServiceParams;
  if (subResult?.id) {
    mem.gatewaySubscriptionId = subResult.id;
    mem.renewalStatus = "SCHEDULED";
    if (subResult.customer_id) {
      mem.gatewayCustomerId = subResult.customer_id;
    }
    await (mem as { save: () => Promise<unknown> }).save();
    return { subscription: sub, skipped: false };
  }

  return { subscription: null, skipped: true };
};

/**
 * List memberships in gym
 */
export const listMemberships = async ({ businessId, paginationParams }: ServiceParams) => {
  const {
    page = 1,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 },
    status = "",
    memberId = "",
    planId = "",
  } = (paginationParams as PaginationQuery) || {};

  const query: MongoFilter = { businessId };
  if (status && status !== "ALL") query.status = status;
  if (memberId) query.memberId = memberId;
  if (planId) query.planId = planId;

  const [total, memberships] = await Promise.all([
    Membership.countDocuments(query),
    Membership.find(query)
      .populate("memberId", "name phone email profileImage")
      .populate("planId", "name price billingCycle duration durationUnit")
      .sort(sort as Record<string, 1 | -1>)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    memberships,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get membership details
 */
export const getMembershipById = async ({
  businessId,
  membershipId,
}: ServiceParams): Promise<IMembership> => {
  const membership = await Membership.findOne({
    _id: membershipId,
    businessId,
  })
    .populate("memberId", "name phone email gender profileImage")
    .populate("planId", "name price billingCycle duration durationUnit perks")
    .populate("couponId", "code discountPercentage discountAmount type")
    .lean();

  if (!membership) {
    throw codedError("membership_not_found", "Membership not found.");
  }

  return membership as unknown as IMembership;
};

/**
 * Create/assign a membership to a member
 * Defaults to PENDING status unless explicitly set to ACTIVE or staff override flag passed.
 */
export const createMembershipForMember = async ({ businessId, memberId, membershipData }: ServiceParams) => {
  const md = membershipData as ServiceParams;
  const [member, plan] = await Promise.all([
    Member.findOne({ _id: memberId, businessId, isDeleted: false }).lean(),
    MembershipPlan.findOne({ _id: md.planId, businessId, isDeleted: false }).lean(),
  ]);

  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }
  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }

  if (plan.status === "STOPPED") {
    throw codedError(
      "plan_stopped",
      "Cannot purchase or assign a stopped membership plan.",
    );
  }
  if (plan.status !== "ACTIVE") {
    throw codedError(
      "plan_not_active",
      "Membership plan is not active.",
    );
  }

  const now = new Date();
  if (plan.isFreeTrial) {
    await assertGymTrialEligibility({ businessId, memberId });
  }

  // Default PENDING unless staff override, explicit status, or gym free trial (starts now).
  const status = plan.isFreeTrial
    ? "ACTIVE"
    : md.activateImmediately === true
      ? "ACTIVE"
      : (md.status as string) || "PENDING";
  const isStatusActive = status === "ACTIVE";

  const durationToUse = plan.isFreeTrial && plan.trialDuration ? plan.trialDuration : plan.duration;
  const durationUnitToUse = plan.isFreeTrial && plan.trialDuration ? "DAYS" : plan.durationUnit;

  let startDate = null;
  let endDate = null;

  if (isStatusActive) {
    const existingActive = md.startDate
      ? null
      : await Membership.findOne({
          businessId,
          memberId,
          status: "ACTIVE",
          endDate: { $gt: now },
        })
          .sort({ endDate: -1 })
          .select("endDate")
          .lean();

    startDate = md.startDate
      ? new Date(md.startDate as string)
      : existingActive?.endDate
        ? new Date(existingActive.endDate)
        : now;

    endDate = md.endDate
      ? new Date(md.endDate as string)
      : calculateEndDate(startDate, durationToUse, durationUnitToUse);
  } else {
    // PENDING: dates are optional
    if (md.startDate) {
      startDate = new Date(md.startDate as string);
      endDate = md.endDate
        ? new Date(md.endDate as string)
        : calculateEndDate(startDate, durationToUse, durationUnitToUse);
    } else if (md.endDate) {
      endDate = new Date(md.endDate as string);
    }
  }

  let discountAmount = Number(md.discountAmount) || 0;
  let finalAmount = Number(md.finalAmount);
  let couponId = md.couponId || null;

  // If couponId provided, atomically increment usage with capacity check
  if (couponId) {
    const updatedCoupon = await Coupon.findOneAndUpdate(
      {
        _id: couponId,
        businessId,
        status: "ACTIVE",
        $expr: {
          $or: [
            { $eq: ["$totalCoupons", null] },
            { $lt: ["$usedCoupons", "$totalCoupons"] },
          ],
        },
      },
      { $inc: { usedCoupons: 1 } },
      { new: true },
    );

    if (!updatedCoupon) {
      throw codedError("invalid_coupon", "Coupon limit has been reached or coupon is invalid.");
    }
  }

  if (isNaN(finalAmount)) {
    finalAmount = Math.max(0, plan.price - discountAmount);
  }

  const purchasedAt = md.purchasedAt ? new Date(md.purchasedAt as string) : now;
  const activatedAt = isStatusActive
    ? md.activatedAt
      ? new Date(md.activatedAt as string)
      : now
    : md.activatedAt
      ? new Date(md.activatedAt as string)
      : null;

  const membership = await Membership.create({
    businessId,
    memberId,
    planId: plan._id,
    startDate,
    endDate,
    status,
    purchasedAt,
    activatedAt,
    gatewaySubscriptionId: null,
    gatewayCustomerId: null,
    priceAtPurchase: plan.price,
    discountAmount,
    finalAmount,
    couponId,
    autoRenew: Boolean(md.autoRenew),
    renewalStatus: "NONE",
    notes: md.notes || (plan.isFreeTrial ? "GYM_FREE_TRIAL" : null),
  });

  return membership.toObject();
};

/**
 * Update membership details
 */
export const updateMembership = async ({ businessId, membershipId, updateData }: ServiceParams) => {
  const updates = updateData as ServiceParams;
  const membership = await Membership.findOne({ _id: membershipId, businessId });
  if (!membership) {
    throw codedError("membership_not_found", "Membership not found.");
  }

  const prevStatus = membership.status;
  const newStatus = updates.status;

  // If transitioning to ACTIVE and activatedAt not provided, set activatedAt = now
  if (newStatus === "ACTIVE" && prevStatus !== "ACTIVE" && !updates.activatedAt && !membership.activatedAt) {
    membership.activatedAt = new Date();
  }

  // If transitioning to ACTIVE and startDate was not set, auto-initialize startDate and endDate
  if (newStatus === "ACTIVE" && !membership.startDate && !updates.startDate) {
    const plan = await MembershipPlan.findOne({ _id: membership.planId, businessId }).lean();
    const duration = plan ? (plan.isFreeTrial && plan.trialDuration ? plan.trialDuration : plan.duration) : 1;
    const durationUnit = plan ? (plan.isFreeTrial && plan.trialDuration ? "DAYS" : plan.durationUnit) : "MONTHS";
    const startDate = new Date();
    membership.startDate = startDate;
    if (!updates.endDate && !membership.endDate) {
      membership.endDate = calculateEndDate(startDate, duration, durationUnit);
    }
  }

  const fields = [
    "startDate",
    "endDate",
    "status",
    "autoRenew",
    "notes",
    "purchasedAt",
    "activatedAt",
  ];
  for (const field of fields) {
    if (updates[field] !== undefined) {
      if (
        updates[field] === null &&
        (field === "startDate" || field === "endDate" || field === "purchasedAt" || field === "activatedAt")
      ) {
        (membership as unknown as ServiceParams)[field] = null;
      } else if (
        field === "startDate" ||
        field === "endDate" ||
        field === "purchasedAt" ||
        field === "activatedAt"
      ) {
        (membership as unknown as ServiceParams)[field] = new Date(updates[field] as string);
      } else {
        (membership as unknown as ServiceParams)[field] = updates[field];
      }
    }
  }

  // If autoRenew is disabled or status is CANCELLED, cancel the active gateway subscription
  if (
    (updates.autoRenew === false || updates.status === "CANCELLED") &&
    membership.gatewaySubscriptionId
  ) {
    try {
      await cancelSubscription(membership.gatewaySubscriptionId);
    } catch (cancelErr: unknown) {
      logger.warn(
        "[updateMembership] Razorpay subscription cancellation skipped/failed:",
        getErrorMessage(cancelErr),
      );
    }
    membership.renewalStatus = "NONE";
    membership.gatewaySubscriptionId = null;
  }

  await membership.save();
  return membership.toObject();
};

/**
 * Cancel a membership (V2.2 refund / access rules)
 */
export const cancelMembership = async ({
  businessId,
  userId,
  membershipId,
  reason = "Cancelled before activation",
}: ServiceParams) => {
  const membership = await Membership.findById(membershipId);
  if (!membership) {
    throw codedError("membership_not_found", "Membership not found.");
  }

  if (membership.status === "CANCELLED") {
    throw codedError("invalid_state", "Membership is already cancelled.");
  }

  const isStaffForThisGym =
    businessId && String(businessId) === String(membership.businessId);

  if (!isStaffForThisGym) {
    if (!userId) {
      throw codedError("forbidden", "You are not authorized to cancel this membership.");
    }

    const ownsByCustomerUid =
      membership.customerUid && String(membership.customerUid) === String(userId);

    if (!ownsByCustomerUid) {
      const [member, user] = await Promise.all([
        Member.findById(membership.memberId).lean(),
        UserModel.findOne({ uid: userId }).select("uid contactNo phone").lean(),
      ]);
      if (!member) {
        throw codedError("forbidden", "You are not authorized to cancel this membership.");
      }
      const digits = (v: unknown) => String(v || "").replace(/\D/g, "");
      const memberDigits = digits(member.phone);
      const userDigits = digits(user?.contactNo || (user as UserWithPhone | null)?.phone);
      const phonesMatch =
        memberDigits &&
        userDigits &&
        (memberDigits === userDigits ||
          memberDigits.slice(-10) === userDigits.slice(-10));
      if (!phonesMatch) {
        throw codedError("forbidden", "You are not authorized to cancel this membership.");
      }
    }
  }

  let refundResult = null;
  const wasPending = membership.status === "PENDING";
  const wasActive = membership.status === "ACTIVE";

  // Unactivated PENDING cancellation -> refund captured payment
  if (wasPending) {
    const payment = await Payment.findOne({
      membershipId: membership._id,
      businessId: membership.businessId,
      status: "SUCCESS",
    }).sort({ paidAt: -1, createdAt: -1 });

    if (payment?.gatewayPaymentId) {
      try {
        const refundAmountPaise = Math.round(
          (payment.finalAmount || payment.amount || 0) * 100,
        );
        refundResult = await refundPayment(
          payment.gatewayPaymentId,
          refundAmountPaise > 0 ? refundAmountPaise : undefined,
          {
            membershipId: String(membership._id),
            businessId: String(membership.businessId),
            reason: reason || "Cancelled before activation",
          },
        );
        payment.status = "REFUNDED";
        payment.notes = `${payment.notes || ""}; Refunded on unactivated cancel: ${(refundResult as ServiceParams)?.id || "processed"}`.trim();
        await payment.save();
      } catch (refundErr: unknown) {
        logger.warn(
          "[cancelMembership] Razorpay refund failed for unactivated membership:",
          getErrorMessage(refundErr),
        );
        throw codedError(
          "payment_failed",
          getErrorMessage(refundErr) ||
            "Refund failed. Membership was not cancelled — please retry or contact support.",
        );
      }
    }

    if (membership.gatewaySubscriptionId) {
      try {
        await cancelSubscription(membership.gatewaySubscriptionId);
      } catch (cancelErr: unknown) {
        logger.warn(
          "[cancelMembership] Razorpay subscription cancellation skipped/failed:",
          getErrorMessage(cancelErr),
        );
      }
    }

    membership.status = "CANCELLED";
    membership.autoRenew = false;
    membership.renewalStatus = "NONE";
    membership.gatewaySubscriptionId = null;
    await membership.save();
    try {
      await cancelPendingPaymentReminders({
        businessId: membership.businessId,
        memberId: membership.memberId,
      });
    } catch (error) {
      logger.warn("[cancelMembership] whatsapp reminder cancel skipped", getErrorMessage(error));
    }

    return {
      message: refundResult
        ? "Membership cancelled and payment refunded successfully."
        : "Membership cancelled successfully.",
      membership: membership.toObject(),
      refund: refundResult,
      accessUntil: null as Date | null,
    };
  }

  // ACTIVE: disable auto-renew; access continues until endDate
  if (wasActive) {
    if (membership.gatewaySubscriptionId) {
      try {
        await cancelSubscription(membership.gatewaySubscriptionId);
      } catch (cancelErr: unknown) {
        logger.warn(
          "[cancelMembership] Razorpay subscription cancellation skipped/failed:",
          getErrorMessage(cancelErr),
        );
      }
    }

    membership.autoRenew = false;
    membership.renewalStatus = "NONE";
    membership.gatewaySubscriptionId = null;
    await membership.save();

    return {
      message:
        "Auto-renew disabled. Gym access continues until the current plan end date.",
      membership: membership.toObject(),
      refund: null,
      accessUntil: membership.endDate || null,
    };
  }

  throw codedError(
    "invalid_state",
    `Cannot cancel a membership in status ${membership.status}.`,
  );
};

/**
 * Renew an existing membership consecutively
 */
export const renewMembership = async ({ businessId, membershipId }: ServiceParams) => {
  const previous = await Membership.findOne({ _id: membershipId, businessId });
  if (!previous) {
    throw codedError("membership_not_found", "Previous membership record not found.");
  }

  const plan = await MembershipPlan.findOne({ _id: previous.planId, businessId, isDeleted: false }).lean();
  if (!plan || plan.status === "STOPPED" || plan.status !== "ACTIVE") {
    throw codedError("plan_not_found", "Membership plan is no longer available for renewal.");
  }

  const now = new Date();
  const prevEnd = previous.endDate ? new Date(previous.endDate) : now;
  const newStartDate = prevEnd > now ? prevEnd : now;
  const newEndDate = calculateEndDate(newStartDate, plan.duration, plan.durationUnit);

  const renewed = await Membership.create({
    businessId,
    memberId: previous.memberId,
    planId: plan._id,
    startDate: newStartDate,
    endDate: newEndDate,
    status: "ACTIVE",
    purchasedAt: now,
    activatedAt: now,
    priceAtPurchase: plan.price,
    discountAmount: 0,
    finalAmount: plan.price,
    autoRenew: previous.autoRenew,
    renewalStatus: "RENEWED",
    notes: `Renewed from membership ID: ${membershipId}`,
  });

  previous.renewalStatus = "RENEWED";
  await previous.save();
  try {
    await cancelPendingPaymentReminders({
      businessId: previous.businessId,
      memberId: previous.memberId,
    });
  } catch (error) {
    logger.warn("[renewMembership] whatsapp reminder cancel skipped", getErrorMessage(error));
  }

  return renewed.toObject();
};

/**
 * Customer-facing online purchase of gym membership plan (Razorpay Orders).
 */
export const purchaseMembership = async ({ userId, userAuth, purchaseData }: ServiceParams) => {
  const pd = (purchaseData as ServiceParams) || {};
  const auth = (userAuth as ServiceParams) || {};
  const {
    businessId,
    planId,
    membershipId: resumeMembershipId,
    couponCode,
    couponId,
    name: bodyName,
    email: bodyEmail,
    gender: bodyGender,
    notes,
    autoRenew: purchaseAutoRenew,
  } = pd;

  if (!businessId) {
    throw codedError("invalid_field", "businessId is required.");
  }
  if (!planId) {
    throw codedError("invalid_field", "planId is required.");
  }

  const business = await Business.findById(businessId).lean();
  if (!business) {
    throw codedError("business_not_found", "Gym business not found.");
  }
  if (business.status === "SUSPENDED") {
    throw codedError("business_suspended", "This gym business is currently suspended.");
  }

  const plan = await MembershipPlan.findOne({
    _id: planId,
    businessId: business._id,
    isDeleted: { $ne: true },
  }).lean();

  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }
  if (plan.status === "STOPPED") {
    throw codedError("plan_stopped", "Cannot purchase or assign a stopped membership plan.");
  }
  if (plan.status === "DRAFT" || plan.status !== "ACTIVE") {
    throw codedError("plan_not_active", "Cannot purchase a draft or inactive membership plan.");
  }

  const user = userId ? await UserModel.findOne({ uid: userId }).lean() : null;
  const rawPhone = String(user?.contactNo || auth.phone || "").trim();
  const candidateName = String(
    bodyName ||
    user?.username ||
    user?.receiverName ||
    auth.name ||
    "STRON Member",
  ).trim();
  const candidateEmail = bodyEmail || user?.email || auth.email || null;

  let member = null;
  if (rawPhone) {
    member = await Member.findOne({
      businessId: business._id,
      phone: rawPhone,
      isDeleted: false,
    });
  }

  if (!member) {
    if (!rawPhone) {
      throw codedError(
        "invalid_field",
        "A valid phone number is required to create a gym membership. Please complete your profile.",
      );
    }
    member = await Member.create({
      businessId: business._id,
      name: candidateName,
      phone: rawPhone,
      email: candidateEmail ? String(candidateEmail).trim().toLowerCase() : null,
      gender:
        bodyGender ||
        (user?.gender === "male" ? "MALE" : user?.gender === "female" ? "FEMALE" : null),
      profileImage: user?.profileImageUrl || null,
      status: "ACTIVE",
    });
  }

  if (plan.isFreeTrial) {
    await assertGymTrialEligibility({
      businessId: business._id,
      memberId: member._id,
    });

    const now = new Date();
    const trialDays = Number(plan.trialDuration) || Number(plan.duration) || 7;
    const startDate = now;
    const endDate = calculateEndDate(startDate, trialDays, "DAYS");

    const membership = await Membership.create({
      businessId: business._id,
      memberId: member._id,
      planId: plan._id,
      status: "ACTIVE",
      purchasedAt: now,
      activatedAt: now,
      startDate,
      endDate,
      priceAtPurchase: 0,
      discountAmount: 0,
      finalAmount: 0,
      autoRenew: false,
      renewalStatus: "NONE",
      notes: notes || "GYM_FREE_TRIAL",
    });

    const payment = await Payment.create({
      businessId: business._id,
      memberId: member._id,
      membershipId: membership._id,
      planId: plan._id,
      planName: plan.name,
      amount: 0,
      discountAmount: 0,
      finalAmount: 0,
      currency: plan.currency || "INR",
      method: "ONLINE",
      source: "GATEWAY",
      status: "SUCCESS",
      transactionId: `FREE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      paidAt: now,
      notes: notes || "GYM_FREE_TRIAL",
    });

    await notifyGymPurchase({
      membership,
      member,
      customerUid: userId,
      planName: plan.name,
      isTrial: true,
      notifyOwner: false,
    });

    return {
      membership: membership.toObject(),
      payment: payment.toObject(),
      member: member.toObject ? member.toObject() : member,
      isFree: true,
      alreadyPaid: true,
      order: null as null,
      amount: 0,
      currency: "INR",
      key: (process.env.RAZORPAY_KEY_ID || "").trim(),
      checkoutText: "Pay securely with Razorpay",
      message: "Your free trial has started. Check in at the gym anytime during the trial.",
    };
  }

  let membership = null;
  let reusedMembership = false;

  if (resumeMembershipId) {
    membership = await Membership.findOne({
      _id: resumeMembershipId,
      businessId: business._id,
      memberId: member._id,
      planId: plan._id,
      status: "PENDING",
    });
    if (!membership) {
      throw codedError(
        "membership_not_found",
        "Pending membership not found for retry. Start a new purchase.",
      );
    }
    reusedMembership = true;

    const paidAlready = await Payment.findOne({
      membershipId: membership._id,
      status: "SUCCESS",
    })
      .sort({ paidAt: -1 })
      .lean();

    if (paidAlready) {
      return {
        membership: membership.toObject(),
        payment: paidAlready,
        member: member.toObject ? member.toObject() : member,
        isFree: Number(membership.finalAmount) === 0,
        alreadyPaid: true,
        order: null as null,
        amount: membership.finalAmount,
        currency: "INR",
        key: (process.env.RAZORPAY_KEY_ID || "").trim(),
        checkoutText: "Pay securely with Razorpay",
        message: "Payment successful. Your plan will activate on first check-in.",
      };
    }
  } else if (!plan.isFreeTrial) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existingPending = await Membership.findOne({
      businessId: business._id,
      memberId: member._id,
      planId: plan._id,
      status: "PENDING",
      $or: [
        { createdAt: { $gte: twoHoursAgo } },
        { notes: { $regex: /TRIAL_CONVERT/ } },
      ],
    }).sort({ createdAt: -1 });

    if (existingPending) {
      const successfulPayment = await Payment.findOne({
        membershipId: existingPending._id,
        status: "SUCCESS",
      })
        .sort({ paidAt: -1 })
        .lean();

      if (successfulPayment) {
        return {
          membership: existingPending.toObject(),
          payment: successfulPayment,
          member: member.toObject ? member.toObject() : member,
          isFree: Number(existingPending.finalAmount) === 0,
          alreadyPaid: true,
          order: null as null,
          amount: existingPending.finalAmount,
          currency: "INR",
          key: (process.env.RAZORPAY_KEY_ID || "").trim(),
          checkoutText: "Pay securely with Razorpay",
          message: "Payment successful. Your plan will activate on first check-in.",
        };
      }

      membership = existingPending;
      reusedMembership = true;
    }
  }

  let discountAmount = Number(membership?.discountAmount) || 0;
  let couponDoc = null;
  const codeToValidate = String(couponCode || "").trim();

  if (!reusedMembership) {
    discountAmount = 0;
    if (codeToValidate) {
      const couponRes = await validateCoupon({
        businessId: business._id,
        code: codeToValidate,
        planId: plan._id,
        orderAmount: plan.price,
      });
      if (couponRes.valid) {
        discountAmount = couponRes.discountAmount || 0;
        couponDoc = couponRes.coupon;
      }
    } else if (couponId) {
      couponDoc = await Coupon.findOne({
        _id: couponId,
        businessId: business._id,
        isDeleted: false,
      }).lean();
    }
  } else if (membership?.couponId) {
    couponDoc = { _id: membership.couponId };
  }

  const basePrice = plan.isFreeTrial ? 0 : Number(plan.price) || 0;
  const finalAmount = Math.max(0, Math.round(basePrice - discountAmount));
  const now = new Date();

  if (membership) {
    membership.priceAtPurchase = plan.price;
    membership.discountAmount = discountAmount;
    membership.finalAmount = finalAmount;
    if (couponDoc?._id) membership.couponId = couponDoc._id;
    if (purchaseAutoRenew !== undefined) membership.autoRenew = Boolean(purchaseAutoRenew);
    const isUnpaidTrialConvert =
      /TRIAL_CONVERT/.test(String(membership.notes || "")) && !membership.purchasedAt;
    if (!isUnpaidTrialConvert) {
      membership.purchasedAt = membership.purchasedAt || now;
    }
    await membership.save();
  } else {
    membership = await Membership.create({
      businessId: business._id,
      memberId: member._id,
      planId: plan._id,
      status: "PENDING",
      purchasedAt: now,
      activatedAt: null,
      startDate: null,
      endDate: null,
      priceAtPurchase: plan.price,
      discountAmount,
      finalAmount,
      couponId: couponDoc?._id || couponId || null,
      autoRenew: Boolean(purchaseAutoRenew),
      notes: notes || `Purchased online by user ${userId || "guest"}`,
    });
  }

  const memberPayload = member.toObject ? member.toObject() : member;
  const membershipPayload = membership.toObject ? membership.toObject() : membership;

  // Free (100% discount) — payment SUCCESS, membership stays PENDING until check-in
  if (finalAmount === 0) {
    let payment = await Payment.findOne({
      membershipId: membership._id,
      status: "SUCCESS",
    }).sort({ paidAt: -1 });

    if (!payment) {
      payment = await Payment.create({
        businessId: business._id,
        memberId: member._id,
        membershipId: membership._id,
        planId: plan._id,
        planName: plan.name,
        couponId: couponDoc?._id || couponId || null,
        amount: basePrice,
        discountAmount,
        finalAmount: 0,
        currency: "INR",
        method: "ONLINE",
        source: "GATEWAY",
        status: "SUCCESS",
        transactionId: `FREE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        paidAt: now,
        notes: notes || "Free plan/trial purchase",
      });
      await incrementCouponUsageForMembership(membership._id);
      await notifyGymPurchase({
        membership,
        member,
        customerUid: userId,
        planName: plan.name,
        isTrial: false,
        notifyOwner: false,
      });
    }

    return {
      membership: membershipPayload,
      payment: payment.toObject ? payment.toObject() : payment,
      member: memberPayload,
      isFree: true,
      alreadyPaid: Boolean(reusedMembership),
      order: null as null,
      amount: 0,
      currency: "INR",
      key: (process.env.RAZORPAY_KEY_ID || "").trim(),
      checkoutText: "Pay securely with Razorpay",
      message: "Payment successful. Your plan will activate on first check-in.",
    };
  }

  const receipt = `gym_${business._id}_${Date.now()}`.slice(0, 40);
  const amountInPaise = Math.round(finalAmount * 100);

  const razorpayOrder = await createOrder(amountInPaise, "INR", receipt, {
    businessId: String(business._id),
    memberId: String(member._id),
    membershipId: String(membership._id),
    planId: String(plan._id),
    customerUid: String(userId || ""),
  });

  let payment = await Payment.findOne({
    membershipId: membership._id,
    status: "PENDING",
  }).sort({ createdAt: -1 });

  if (payment) {
    payment.amount = basePrice;
    payment.discountAmount = discountAmount;
    payment.finalAmount = finalAmount;
    payment.couponId = couponDoc?._id || payment.couponId || null;
    payment.gatewayOrderId = (razorpayOrder as ServiceParams).id as string;
    payment.planId = plan._id;
    payment.planName = plan.name;
    if (notes) payment.notes = String(notes);
    await payment.save();
  } else {
    payment = await Payment.create({
      businessId: business._id,
      memberId: member._id,
      membershipId: membership._id,
      planId: plan._id,
      planName: plan.name,
      couponId: couponDoc?._id || couponId || null,
      amount: basePrice,
      discountAmount,
      finalAmount,
      currency: "INR",
      method: "ONLINE",
      source: "GATEWAY",
      status: "PENDING",
      gatewayOrderId: razorpayOrder.id,
      notes: notes || null,
    });
  }

  return {
    membership: membershipPayload,
    payment: payment.toObject ? payment.toObject() : payment,
    member: memberPayload,
    isFree: false,
    alreadyPaid: false,
    reusedMembership,
    order: razorpayOrder,
    amount: finalAmount,
    currency: "INR",
    key: (process.env.RAZORPAY_KEY_ID || "").trim(),
    checkoutText: "Pay securely with Razorpay",
    message: "Pay securely with Razorpay",
  };
};

/**
 * Increment coupon usage after a confirmed payment SUCCESS.
 */
export const incrementCouponUsageForMembership = async (membershipId: unknown) => {
  if (!membershipId) return;
  try {
    const updatedMembership = await Membership.findOneAndUpdate(
      {
        _id: membershipId,
        couponId: { $ne: null },
        couponUsageApplied: { $ne: true },
      },
      {
        $set: { couponUsageApplied: true },
      },
      { new: false },
    )
      .select("couponId")
      .lean();

    if (!updatedMembership?.couponId) {
      return;
    }

    await Coupon.findByIdAndUpdate(updatedMembership.couponId, { $inc: { usedCoupons: 1 } });
  } catch (err: unknown) {
    logger.warn("[incrementCouponUsageForMembership] Failed to increment coupon usage:", getErrorMessage(err));
  }
};

/**
 * Activates a member's PENDING membership upon first gym check-in.
 */
export const activateMembershipOnCheckIn = async (
  memberIdOrParams: unknown,
  businessIdParam?: unknown,
) => {
  let memberId: unknown = memberIdOrParams;
  let businessId: unknown = businessIdParam;

  if (
    typeof memberIdOrParams === "object" &&
    memberIdOrParams !== null &&
    !(memberIdOrParams as ServiceParams)._bsontype &&
    typeof (memberIdOrParams as ServiceParams).toHexString !== "function"
  ) {
    memberId = (memberIdOrParams as ServiceParams).memberId;
    businessId = (memberIdOrParams as ServiceParams).businessId;
  }

  if (!memberId || !businessId) {
    return { activated: false, isNewlyActivated: false, membership: null as null };
  }

  const now = new Date();

  const existingActive = await Membership.findOne({
    businessId,
    memberId,
    status: "ACTIVE",
    endDate: { $gte: now },
  })
    .populate(
      "planId",
      "name price currency duration durationUnit billingCycle isFreeTrial trialDuration gatewayPlanId",
    )
    .sort({ endDate: -1 });

  if (existingActive) {
    return {
      activated: true,
      isNewlyActivated: false,
      membership: existingActive,
      message: "Membership is already active.",
    };
  }

  const pendingCandidates = await Membership.find({
    businessId,
    memberId,
    status: "PENDING",
  })
    .populate(
      "planId",
      "name price currency duration durationUnit billingCycle isFreeTrial trialDuration gatewayPlanId",
    )
    .sort({ purchasedAt: 1, createdAt: 1 });

  let oldestPending = null;
  const candidateIds = pendingCandidates.map((c) => c._id);
  if (candidateIds.length > 0) {
    const paidPayments = await Payment.find({
      membershipId: { $in: candidateIds },
      status: "SUCCESS",
    })
      .select("membershipId")
      .lean();
    const paidMembershipIds = new Set(paidPayments.map((p) => String(p.membershipId)));
    oldestPending = pendingCandidates.find((c) => paidMembershipIds.has(String(c._id))) || null;
  }

  if (!oldestPending) {
    return {
      activated: false,
      isNewlyActivated: false,
      membership: null as null,
    };
  }

  const plan = asPopulatedGymPlan(oldestPending.planId);
  const duration =
    plan && plan.isFreeTrial && plan.trialDuration
      ? plan.trialDuration
      : plan?.duration || 1;
  const durationUnit =
    plan && plan.isFreeTrial && plan.trialDuration
      ? "DAYS"
      : plan?.durationUnit || "MONTHS";
  const endDate = calculateEndDate(now, duration, durationUnit);

  const activatedDoc = await Membership.findOneAndUpdate(
    {
      _id: oldestPending._id,
      businessId,
      memberId,
      status: "PENDING",
    },
    {
      $set: {
        status: "ACTIVE",
        activatedAt: now,
        startDate: now,
        endDate,
      },
    },
    { new: true },
  ).populate(
    "planId",
    "name duration durationUnit billingCycle isFreeTrial trialDuration gatewayPlanId",
  );

  if (!activatedDoc) {
    const racedActive = await Membership.findOne({
      businessId,
      memberId,
      status: "ACTIVE",
      endDate: { $gte: now },
    })
      .populate(
        "planId",
        "name price currency duration durationUnit billingCycle isFreeTrial trialDuration gatewayPlanId",
      )
      .sort({ endDate: -1 });

    return {
      activated: Boolean(racedActive),
      isNewlyActivated: false,
      membership: racedActive,
      message: racedActive ? "Membership is already active." : undefined,
    };
  }

  let subscriptionResult = null;

  try {
    const subResult = await ensureGatewaySubscriptionForMembership({
      membership: activatedDoc,
      plan,
      businessId,
      memberId,
    });
    subscriptionResult = subResult.subscription;
  } catch (subErr: unknown) {
    logger.warn(
      "[activateMembershipOnCheckIn] Auto-renew subscription creation skipped/failed:",
      getErrorMessage(subErr),
    );
  }

  const activateMessage = `Plan "${plan?.name || "Membership"}" activated successfully upon first check-in!`;
  await notifyGymActivated({
    membership: activatedDoc,
    message: activateMessage,
  });

  return {
    activated: true,
    isNewlyActivated: true,
    membership: activatedDoc,
    message: activateMessage,
    subscription: subscriptionResult,
  };
};

/**
 * Customer or staff toggle for gym plan auto-renew.
 */
export const setMembershipAutoRenew = async ({
  businessId,
  userId,
  membershipId,
  autoRenew,
}: ServiceParams) => {
  const query: MongoFilter = { _id: membershipId };
  if (businessId) {
    query.businessId = businessId;
  }

  let membership = await Membership.findOne(query);
  if (!membership && businessId && userId) {
    membership = await Membership.findOne({ _id: membershipId });
    if (membership) {
      await assertCustomerOwnsMembership({ membership, userId });
    }
  }
  if (!membership) {
    throw codedError("membership_not_found", "Membership not found.");
  }

  if (!businessId && userId) {
    await assertCustomerOwnsMembership({ membership, userId });
  } else if (!businessId) {
    throw codedError("forbidden", "You are not authorized to update this membership.");
  }

  if (autoRenew === false) {
    const wasAutoRenewOn =
      membership.autoRenew === true || Boolean(membership.gatewaySubscriptionId);
    if (membership.gatewaySubscriptionId) {
      try {
        await cancelSubscription(membership.gatewaySubscriptionId);
      } catch (cancelErr: unknown) {
        logger.warn(
          "[setMembershipAutoRenew] Razorpay subscription cancellation skipped/failed:",
          getErrorMessage(cancelErr),
        );
      }
    }

    membership.autoRenew = false;
    membership.renewalStatus = "NONE";
    membership.gatewaySubscriptionId = null;
    await membership.save();

    if (wasAutoRenewOn) {
      await notifyGymAutoRenewOff({
        membership,
        customerUid: userId,
      });
    }

    return {
      message: "Auto-renew disabled. Gym access continues until the current plan end date.",
      membership: membership.toObject(),
      accessUntil: membership.endDate || null,
    };
  }

  if (!["ACTIVE", "PENDING"].includes(membership.status)) {
    throw codedError(
      "auto_renew_not_allowed",
      "Auto-renew can only be enabled on an active or pending membership.",
    );
  }

  const plan = await MembershipPlan.findOne({
    _id: membership.planId,
    isDeleted: { $ne: true },
  }).lean();

  if (!plan) {
    throw codedError("plan_not_found", "Membership plan is no longer available.");
  }
  if (plan.billingCycle === "ONE_TIME" || plan.isFreeTrial) {
    throw codedError(
      "auto_renew_not_allowed",
      "Auto-renew is not available for one-time or free-trial plans.",
    );
  }

  membership.autoRenew = true;
  await membership.save();

  let subscription = null;
  if (membership.status === "ACTIVE") {
    try {
      const result = await ensureGatewaySubscriptionForMembership({
        membership,
        plan,
        businessId: membership.businessId,
        memberId: membership.memberId,
      });
      subscription = result.subscription;
    } catch (subErr: unknown) {
      logger.warn(
        "[setMembershipAutoRenew] subscription create skipped/failed:",
        getErrorMessage(subErr),
      );
    }
  }

  return {
    message: membership.gatewaySubscriptionId
      ? "Auto-renew enabled. Your plan will renew 1 day before expiry."
      : "Auto-renew enabled. It will schedule on first check-in.",
    membership: membership.toObject(),
    accessUntil: membership.endDate || null,
    subscription,
  };
};

/**

 * At trial end: expire the trial; if convertToPlanId is an ACTIVE paid plan,
 * create a PENDING paid membership + Razorpay Order for in-app checkout.
 */
export const convertExpiredGymTrials = async ({ now = new Date() }: ServiceParams = {}) => {
  const currentDate = now instanceof Date ? now : new Date(now as string | number);
  let convertedCount = 0;
  let expiredCount = 0;
  let failedCount = 0;

  const activeTrials = await Membership.find({
    status: "ACTIVE",
    endDate: { $lt: currentDate },
  }).populate("planId");

  for (const mem of activeTrials) {
    const plan = asPopulatedGymPlan(mem.planId);
    if (!plan?.isFreeTrial) continue;

    mem.status = "EXPIRED";
    mem.autoRenew = false;
    mem.renewalStatus = "NONE";
    await mem.save();
    expiredCount += 1;

    const trialPlanStopped = plan.status === "STOPPED";
    let convertPlan = null;
    if (plan.convertToPlanId) {
      convertPlan = await MembershipPlan.findOne({
        _id: plan.convertToPlanId,
        businessId: mem.businessId,
        isDeleted: { $ne: true },
      }).lean();
    }

    if (
      trialPlanStopped ||
      !convertPlan ||
      convertPlan.status !== "ACTIVE" ||
      convertPlan.isFreeTrial
    ) {
      continue;
    }

    try {
      const existingConvert = await Membership.findOne({
        businessId: mem.businessId,
        memberId: mem.memberId,
        planId: convertPlan._id,
        status: "PENDING",
        notes: { $regex: /TRIAL_CONVERT/ },
      });
      if (existingConvert) {
        convertedCount += 1;
        continue;
      }

      const finalAmount = Math.max(0, Number(convertPlan.price) || 0);
      const convertMem = await Membership.create({
        businessId: mem.businessId,
        memberId: mem.memberId,
        planId: convertPlan._id,
        status: "PENDING",
        purchasedAt: null,
        activatedAt: null,
        startDate: null,
        endDate: null,
        priceAtPurchase: convertPlan.price,
        discountAmount: 0,
        finalAmount,
        autoRenew: false,
        renewalStatus: "NONE",
        notes: `TRIAL_CONVERT from ${mem._id}`,
      });

      if (finalAmount > 0) {
        const receipt = `gym_trial_${String(convertMem._id)}_${Date.now()}`.slice(0, 40);
        const razorpayOrder = await createOrder(
          Math.round(finalAmount * 100),
          "INR",
          receipt,
          {
            businessId: String(mem.businessId),
            memberId: String(mem.memberId),
            membershipId: String(convertMem._id),
            planId: String(convertPlan._id),
            trialConvert: "true",
          },
        );
        await Payment.create({
          businessId: mem.businessId,
          memberId: mem.memberId,
          membershipId: convertMem._id,
          planId: convertPlan._id,
          planName: convertPlan.name,
          amount: convertPlan.price,
          discountAmount: 0,
          finalAmount,
          currency: convertPlan.currency || "INR",
          method: "ONLINE",
          source: "GATEWAY",
          status: "PENDING",
          gatewayOrderId: razorpayOrder.id,
          notes: "TRIAL_CONVERT",
        });
      }

      convertedCount += 1;
    } catch (err: unknown) {
      logger.warn(
        "[convertExpiredGymTrials] convert failed for membership:",
        mem._id,
        getErrorMessage(err),
      );
      failedCount += 1;
    }
  }

  const stale = await Membership.find({
    status: "PENDING",
    notes: { $regex: /TRIAL_CONVERT/ },
    createdAt: { $lt: new Date(currentDate.getTime() - TRIAL_CONVERT_WINDOW_MS) },
  });

  if (stale.length > 0) {
    const staleIds = stale.map((m) => m._id);
    const paidPayments = await Payment.find({
      membershipId: { $in: staleIds },
      status: "SUCCESS",
    })
      .select("membershipId")
      .lean();
    const paidIds = new Set(paidPayments.map((p) => String(p.membershipId)));

    for (const mem of stale) {
      if (paidIds.has(String(mem._id))) continue;
      mem.status = "EXPIRED";
      mem.renewalStatus = "FAILED";
      mem.autoRenew = false;
      if (!mem.startDate) mem.startDate = mem.createdAt || currentDate;
      if (!mem.endDate) mem.endDate = currentDate;
      await mem.save();
      failedCount += 1;
    }
  }

  return {
    convertedCount,
    expiredCount,
    failedCount,
    processedAt: currentDate,
  };
};

export const getMyPurchasedPlans = async ({ userId }: ServiceParams) => {
  if (!userId || typeof userId !== "string" || !userId.trim()) {
    return { plans: [] };
  }

  const uid = userId.trim();
  const user = await UserModel.findOne({ uid }).lean();
  const rawPhone = user?.contactNo;
  const rawEmail = user?.email;

  const phoneVariants: string[] = [];
  if (rawPhone) {
    const cleanDigits = String(rawPhone).replace(/\D/g, "").slice(-10);
    if (cleanDigits) {
      phoneVariants.push(
        cleanDigits,
        `+91${cleanDigits}`,
        `+91 ${cleanDigits}`,
        `91${cleanDigits}`,
      );
    }
  }

  const queryOr: MongoFilter[] = [];
  if (phoneVariants.length > 0) {
    queryOr.push({ phone: { $in: phoneVariants } });
  }
  if (rawEmail) {
    queryOr.push({ email: String(rawEmail).toLowerCase().trim() });
  }

  let memberIds: unknown[] = [];
  if (queryOr.length > 0) {
    const memberDocs = await Member.find({
      $or: queryOr,
      isDeleted: false,
    })
      .select("_id")
      .lean();
    memberIds = memberDocs.map((m) => m._id);
  }

  const memOr: MongoFilter[] = [{ customerUid: uid }];
  if (memberIds.length > 0) {
    memOr.push({ memberId: { $in: memberIds } });
  }

  const formatTime12h = (timeStr: unknown) => {
    if (!timeStr) return "";
    const ts = String(timeStr);
    if (ts.includes("AM") || ts.includes("PM")) return ts;
    const [hStr, mStr] = ts.split(":");
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    if (isNaN(h)) return ts;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
  };

  const DAY_MAP = {
    MONDAY: "M",
    TUESDAY: "T",
    WEDNESDAY: "W",
    THURSDAY: "Th",
    FRIDAY: "F",
    SATURDAY: "Sat",
    SUNDAY: "S",
  };

  const memberships = await Membership.find({
    $or: memOr,
    isDeleted: { $ne: true },
  })
    .populate(
      "planId",
      "name price billingCycle duration durationUnit trialDuration perks isFreeTrial",
    )
    .populate(
      "businessId",
      "businessName logo location mapLink phone services openingHours email",
    )
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const formatted = memberships.map((m) => {
    const plan = asPopulatedGymPlan(m.planId) || {};
    const business = asPopulatedGymBusiness(m.businessId) || {};
    const billingCycle =
      plan.billingCycle ||
      (plan.durationUnit === "YEARS"
        ? "Yearly"
        : plan.durationUnit === "DAYS"
          ? "Daily"
          : "Monthly");

    const openingHours =
      Array.isArray(business.openingHours) && business.openingHours.length > 0
        ? business.openingHours.map((oh) => ({
            day: DAY_MAP[oh.day as keyof typeof DAY_MAP] || oh.day,
            opens: oh.openTime ? formatTime12h(oh.openTime) : "",
            closes: oh.closeTime ? formatTime12h(oh.closeTime) : "",
            isAvailable: Boolean(oh.isAvailable),
          }))
        : [];

    let validityDays = null;
    if (m.endDate) {
      validityDays = Math.max(
        0,
        Math.ceil((new Date(m.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      );
    }

    return {
      id: String(m._id),
      planId: plan._id ? String(plan._id) : null,
      planName: plan.name || "Gym Membership",
      price: plan.price != null ? plan.price : m.finalAmount || 0,
      billingCycle:
        billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1).toLowerCase(),
      status: m.status || "ACTIVE",
      startDate: m.startDate,
      endDate: m.endDate,
      purchasedAt: m.purchasedAt,
      autoRenew: Boolean(m.autoRenew),
      renewalStatus: m.renewalStatus || "NONE",
      duration: plan.duration,
      durationUnit: plan.durationUnit,
      trialDuration: plan.trialDuration,
      validityDays,
      perks: Array.isArray(plan.perks) ? plan.perks : [],
      isFreeTrial: Boolean(plan.isFreeTrial),
      gym: {
        id: String(business._id || ""),
        name: business.businessName || "Fitness Center",
        phone: business.phone || "",
        email: business.email || "",
        address: business.location || "",
        mapLink: business.mapLink || "",
        logo: business.logo || null,
        coverImage: business.logo || null,
        avatarImage: business.logo || null,
        services: Array.isArray(business.services) ? business.services : [],
        openingHours,
      },
    };
  });

  return { plans: formatted };
};

export default {
  calculateEndDate,
  listMemberships,
  getMembershipById,
  createMembershipForMember,
  updateMembership,
  cancelMembership,
  renewMembership,
  purchaseMembership,
  activateMembershipOnCheckIn,
  getMyPurchasedPlans,
  ensureGatewaySubscriptionForMembership,
  setMembershipAutoRenew,
  assertGymTrialEligibility,
  convertExpiredGymTrials,
};

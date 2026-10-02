import { randomBytes } from "crypto";
import mongoose from "mongoose";
import MembershipPlan from "../models/membershipPlan.model.js";
import Membership from "../models/membership.model.js";
import type { IMembershipPlan } from "../types/index.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { MongoFilter, PaginationQuery, RazorpayPlanCreateParams, ServiceParams } from "../../../types/service.util.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";
import { createRazorpayPlan } from "../../../services/razorpay.service.js";
import { buildPublicPlanInviteUrl } from "../../../constants/index.js";

const slugifyPlanName = (name: string): string =>
  String(name || "plan")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "plan";

export const generatePlanInviteSlug = (name: string): string =>
  `${slugifyPlanName(name)}-${randomBytes(2).toString("hex")}`;

const withPlanInvite = <T extends { inviteSlug?: string | null }>(plan: T) => {
  const inviteSlug = plan.inviteSlug ? String(plan.inviteSlug) : null;
  return {
    ...plan,
    inviteUrl: inviteSlug ? buildPublicPlanInviteUrl(inviteSlug) : null,
  };
};

/**
 * Map STRON billingCycle → Razorpay plans.create period/interval.
 * MONTHLY → monthly/1, QUARTERLY → monthly/3, YEARLY → yearly/1
 */
export const mapBillingCycleToRazorpayPeriod = (billingCycle: unknown) => {
  const cycle = String(billingCycle || "").toUpperCase();
  if (cycle === "QUARTERLY") return { period: "monthly", interval: 3 };
  if (cycle === "YEARLY") return { period: "yearly", interval: 1 };
  if (cycle === "MONTHLY") return { period: "monthly", interval: 1 };
  return null;
};

/**
 * Ensure MembershipPlan has a Razorpay gatewayPlanId for recurring cycles.
 * Creates a Razorpay Plan when missing and persists it on the MembershipPlan.
 */
export const ensureGatewayPlanId = async (planDocOrLean: ServiceParams | null | undefined) => {
  if (!planDocOrLean) return null;
  if (planDocOrLean.gatewayPlanId) return planDocOrLean.gatewayPlanId;

  const cycle = planDocOrLean.billingCycle;
  const mapping = mapBillingCycleToRazorpayPeriod(cycle);
  if (!mapping || planDocOrLean.isFreeTrial || !(Number(planDocOrLean.price) > 0)) {
    return null;
  }

  const rzpPlan = await createRazorpayPlan({
    name: planDocOrLean.name,
    amount: Math.round(Number(planDocOrLean.price) * 100),
    currency: planDocOrLean.currency || "INR",
    period: mapping.period,
    interval: mapping.interval,
    description: `Gym Plan: ${planDocOrLean.name} (${cycle})`,
    notes: {
      businessId: String(planDocOrLean.businessId || ""),
      membershipPlanId: String(planDocOrLean._id || ""),
      billingCycle: cycle,
    },
  } as RazorpayPlanCreateParams);

  if (!rzpPlan?.id) return null;

  if (planDocOrLean._id) {
    await MembershipPlan.findByIdAndUpdate(planDocOrLean._id, {
      $set: { gatewayPlanId: rzpPlan.id },
    });
  }

  return rzpPlan.id;
};

/**
 * List membership plans for a gym
 */
export const listPlans = async ({ businessId, paginationParams }: ServiceParams) => {
  const {
    page = 1,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 },
    status = "",
    listingCategory = "",
  } = (paginationParams as PaginationQuery & { listingCategory?: string }) || {};

  const query: MongoFilter = { businessId, isDeleted: false };
  if (status && status !== "ALL") {
    query.status = status === "LIVE" ? "ACTIVE" : status;
  }
  if (
    listingCategory === "plan" ||
    listingCategory === "workshop" ||
    listingCategory === "class" ||
    listingCategory === "training"
  ) {
    query.listingCategory = listingCategory;
  }

  const [total, rawPlans] = await Promise.all([
    MembershipPlan.countDocuments(query),
    MembershipPlan.find(query).sort(sort as Record<string, 1 | -1>).skip(skip).limit(limit).lean(),
  ]);

  if (!rawPlans || rawPlans.length === 0) {
    return {
      plans: [],
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  const planIds = rawPlans.map((p) => p._id);

  // Aggregate active members count and total sold/revenue per plan
  const membershipStats = await Membership.aggregate([
    {
      $match: {
        businessId: new mongoose.Types.ObjectId(String(businessId)),
        planId: { $in: planIds },
      },
    },
    {
      $group: {
        _id: "$planId",
        totalSold: { $sum: 1 },
        activeMembersCount: {
          $sum: { $cond: [{ $eq: ["$status", "ACTIVE"] }, 1, 0] },
        },
        totalRevenue: { $sum: "$finalAmount" },
      },
    },
  ]);

  const statsMap = new Map();
  for (const stat of membershipStats) {
    statsMap.set(String(stat._id), stat);
  }

  const plans = rawPlans.map((p) => {
    const stat = statsMap.get(String(p._id));
    return withPlanInvite({
      ...p,
      activeMembersCount: stat ? stat.activeMembersCount : 0,
      totalSold: stat ? stat.totalSold : 0,
      totalRevenue: stat ? stat.totalRevenue : 0,
    });
  });

  return {
    plans,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get plan details by ID
 */
export const getPlanById = async ({ businessId, planId }: ServiceParams) => {
  const plan = await MembershipPlan.findOne({
    _id: planId,
    businessId,
    isDeleted: false,
  })
    .populate("trainerIds", "name profileImage role status")
    .lean();

  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }

  const [activeMembersCount, totalSold] = await Promise.all([
    Membership.countDocuments({
      businessId,
      planId,
      status: "ACTIVE",
    }),
    Membership.countDocuments({
      businessId,
      planId,
    }),
  ]);

  const trainerDocs = Array.isArray(plan.trainerIds) ? plan.trainerIds : [];
  const trainers = trainerDocs
    .map((row) => {
      if (!row || typeof row !== "object" || !("name" in row)) return null;
      const trainer = row as {
        _id?: unknown;
        name?: string;
        profileImage?: string | null;
        role?: string;
      };
      const name = String(trainer.name || "").trim();
      if (!name) return null;
      return {
        id: String(trainer._id),
        name,
        specialty: trainer.role === "TRAINER" ? "Personal Trainer" : String(trainer.role || "Trainer"),
        profileImage: trainer.profileImage || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
  const trainerIds = trainerDocs.map((row) =>
    String(
      row && typeof row === "object" && "_id" in row
        ? (row as { _id: unknown })._id
        : row,
    ),
  );

  return withPlanInvite({
    ...plan,
    trainerIds,
    trainers,
    activeMembersCount,
    totalSold,
  });
};

/**
 * Create a new membership plan
 */
export const createPlan = async ({
  businessId,
  planData,
}: ServiceParams): Promise<IMembershipPlan> => {
  const pd = planData as ServiceParams;
  let gatewayPlanId = pd.gatewayPlanId || null;
  const cycle = pd.billingCycle;

  if (
    !gatewayPlanId &&
    cycle &&
    cycle !== "ONE_TIME" &&
    !pd.isFreeTrial &&
    Number(pd.price) > 0
  ) {
    try {
      const mapping = mapBillingCycleToRazorpayPeriod(cycle);
      if (mapping) {
        const rzpPlan = await createRazorpayPlan({
          name: String(pd.name).trim(),
          amount: Math.round(Number(pd.price) * 100),
          currency: (pd.currency as string) || "INR",
          period: mapping.period,
          interval: mapping.interval,
          description: `Gym Plan: ${String(pd.name).trim()} (${cycle})`,
          notes: {
            businessId: String(businessId),
            billingCycle: cycle,
          },
        } as RazorpayPlanCreateParams);

        if ((rzpPlan as ServiceParams)?.id) {
          gatewayPlanId = (rzpPlan as ServiceParams).id as string;
        }
      }
    } catch (err: unknown) {
      logger.warn("[createPlan] Automatic Razorpay plan creation skipped/failed:", getErrorMessage(err));
    }
  }

  const visibility =
    pd.visibility === "MEMBERS_ONLY" || pd.visibility === "PRIVATE" ? pd.visibility : "PUBLIC";
  const allowedPlanIds =
    visibility === "MEMBERS_ONLY" && Array.isArray(pd.allowedPlanIds) ? pd.allowedPlanIds : [];

  let inviteSlug = generatePlanInviteSlug(String(pd.name).trim());
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const taken = await MembershipPlan.exists({ inviteSlug });
    if (!taken) break;
    inviteSlug = generatePlanInviteSlug(String(pd.name).trim());
  }

  const plan = await MembershipPlan.create({
    businessId,
    name: String(pd.name).trim(),
    price: Number(pd.price),
    currency: (pd.currency as string) || "INR",
    billingCycle: pd.billingCycle,
    duration: Number(pd.duration),
    durationUnit: (pd.durationUnit as string) || "MONTHS",
    isFreeTrial: Boolean(pd.isFreeTrial),
    trialDuration: Number(pd.trialDuration) || 0,
    convertToPlanId: pd.convertToPlanId || null,
    perks: Array.isArray(pd.perks) ? pd.perks : [],
    status: (pd.status as string) || "ACTIVE",
    gatewayPlanId,
    listingCategory:
      pd.listingCategory === "workshop" ||
      pd.listingCategory === "class" ||
      pd.listingCategory === "training"
        ? pd.listingCategory
        : "plan",
    visibility,
    allowedPlanIds,
    inviteSlug,
  });

  return withPlanInvite(plan.toObject() as unknown as IMembershipPlan) as unknown as IMembershipPlan;
};

/**
 * Refund all PENDING purchases for a stopped plan and cancel them
 */
export const refundAndCancelPendingPurchasesForPlan = async ({
  businessId,
  planId,
  reason = "Plan stopped before activation",
}: ServiceParams) => {
  const { refundPayment, cancelSubscription } = await import("../../../services/razorpay.service.js");
  const Payment = (await import("../models/payment.model.js")).default;

  const pendingMemberships = await Membership.find({
    businessId,
    planId,
    status: "PENDING",
  });

  const membershipIds = pendingMemberships.map((mem) => mem._id);
  const successPayments = membershipIds.length
    ? await Payment.find({
        businessId,
        membershipId: { $in: membershipIds },
        status: "SUCCESS",
      }).sort({ paidAt: -1, createdAt: -1 })
    : [];

  const paymentByMembershipId = new Map();
  for (const payment of successPayments) {
    const key = String(payment.membershipId);
    if (!paymentByMembershipId.has(key)) {
      paymentByMembershipId.set(key, payment);
    }
  }

  let refundedCount = 0;
  let cancelledCount = 0;

  for (const mem of pendingMemberships) {
    const payment = paymentByMembershipId.get(String(mem._id));

    if (payment && payment.gatewayPaymentId) {
      try {
        const refundAmountPaise = Math.round(
          (payment.finalAmount || payment.amount || 0) * 100,
        );
        const refundRes = await refundPayment(
          payment.gatewayPaymentId,
          refundAmountPaise > 0 ? refundAmountPaise : undefined,
          {
            membershipId: String(mem._id),
            planId: String(planId),
            businessId: String(businessId),
            reason,
          },
        );
        payment.status = "REFUNDED";
        payment.notes = `${payment.notes || ""}; Refunded on plan stop: ${(refundRes as ServiceParams)?.id || "processed"}`.trim();
        await payment.save();
        refundedCount++;
      } catch (err: unknown) {
        logger.warn(
          `[refundAndCancelPendingPurchasesForPlan] Refund failed for membership ${mem._id}:`,
          getErrorMessage(err),
        );
      }
    }

    if (mem.gatewaySubscriptionId) {
      try {
        await cancelSubscription(mem.gatewaySubscriptionId);
      } catch (cancelErr: unknown) {
        logger.warn(
          `[refundAndCancelPendingPurchasesForPlan] Subscription cancel failed for membership ${mem._id}:`,
          getErrorMessage(cancelErr),
        );
      }
    }

    mem.status = "CANCELLED";
    mem.autoRenew = false;
    mem.renewalStatus = "NONE";
    mem.gatewaySubscriptionId = null;
    await mem.save();
    cancelledCount++;
  }

  const planDoc = await MembershipPlan.findById(planId).select("isFreeTrial").lean();
  let expiredTrialCount = 0;
  if (planDoc?.isFreeTrial) {
    const trialExpire = await Membership.updateMany(
      { businessId, planId, status: "ACTIVE" },
      {
        $set: {
          status: "EXPIRED",
          autoRenew: false,
          renewalStatus: "NONE",
          gatewaySubscriptionId: null,
        },
      },
    );
    expiredTrialCount = trialExpire.modifiedCount || 0;
  }

  return {
    refundedCount,
    cancelledCount,
    expiredTrialCount,
  };
};

/**
 * Update an existing membership plan
 */
export const updatePlan = async ({ businessId, planId, updateData }: ServiceParams) => {
  const updates = updateData as ServiceParams;
  const plan = await MembershipPlan.findOne({
    _id: planId,
    businessId,
    isDeleted: false,
  });

  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }

  if (updates.status) {
    const targetStatus = updates.status === "LIVE" ? "ACTIVE" : updates.status;
    if (plan.status === "ACTIVE" && targetStatus === "DRAFT") {
      throw codedError(
        "invalid_plan_status_transition",
        "A live membership plan cannot be moved back to draft status.",
      );
    }
    if (plan.status === "STOPPED" && targetStatus === "DRAFT") {
      throw codedError(
        "invalid_plan_status_transition",
        "A stopped membership plan cannot be moved back to draft status.",
      );
    }
    if (targetStatus === "STOPPED" && plan.status !== "STOPPED") {
      await refundAndCancelPendingPurchasesForPlan({
        businessId,
        planId,
        reason: `Membership plan "${plan.name}" was moved to STOPPED before activation.`,
      });
    }
  }

  const fields = [
    "name",
    "price",
    "currency",
    "billingCycle",
    "duration",
    "durationUnit",
    "isFreeTrial",
    "trialDuration",
    "convertToPlanId",
    "perks",
    "status",
    "visibility",
    "allowedPlanIds",
    "listingCategory",
  ];

  for (const field of fields) {
    if (updates[field] !== undefined) {
      (plan as unknown as ServiceParams)[field] = updates[field] === "LIVE" ? "ACTIVE" : updates[field];
    }
  }

  if (String(plan.visibility) !== "MEMBERS_ONLY") {
    plan.allowedPlanIds = [];
  }

  if (!plan.inviteSlug) {
    plan.inviteSlug = generatePlanInviteSlug(String(plan.name));
  }

  await plan.save();
  return withPlanInvite(plan.toObject());
};

/**
 * Stop a membership plan (moves it to STOPPED status).
 * Refunds + cancels all PENDING (unactivated) purchases for that plan.
 * ACTIVE paid members keep access until their endDate.
 * ACTIVE free-trial members expire immediately with no charge.
 */
export const stopPlan = async ({ businessId, planId }: ServiceParams) => {
  const plan = await MembershipPlan.findOne({
    _id: planId,
    businessId,
    isDeleted: false,
  });

  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }

  if (plan.status === "STOPPED") {
    return {
      message: "Membership plan is already stopped.",
      plan: plan.toObject(),
      refundedCount: 0,
      cancelledCount: 0,
    };
  }

  plan.status = "STOPPED";
  await plan.save();

  const refundSummary = await refundAndCancelPendingPurchasesForPlan({
    businessId,
    planId,
    reason: `Membership plan "${plan.name}" was stopped before activation.`,
  });

  return {
    message:
      "Membership plan stopped successfully. Unactivated buyers have been refunded.",
    plan: plan.toObject(),
    ...refundSummary,
  };
};

export const deletePlan = stopPlan;

export default {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  stopPlan,
  deletePlan,
  generatePlanInviteSlug,
  mapBillingCycleToRazorpayPeriod,
  ensureGatewayPlanId,
  refundAndCancelPendingPurchasesForPlan,
};

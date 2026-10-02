import { UserModel } from "../../identity-auth/index.js";
import Payment from "../models/payment.model.js";
import Membership from "../models/membership.model.js";
import Member from "../models/member.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Business from "../models/business.model.js";
import type { IPayment } from "../types/index.js";
import {
  createOrder,
  createSubscription,
  verifySignature,
  verifyWebhookSignature,
} from "../../../services/razorpay.service.js";
import { calculateEndDate } from "../../../utils/membershipDate.util.js";
import { incrementCouponUsageForMembership } from "./membership.service.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";
import { buildPublicPayUrl } from "../../../constants/index.js";
import {
  notifyGymPurchase,
  notifyGymAutoRenewed,
  notifyGymAutoRenewFailed,
} from "./gymLifecycleNotify.service.js";
import type { MongoFilter, PaginationQuery, ServiceParams } from "../../../types/service.util.js";
import { asPopulatedPlan } from "../../../types/service.util.js";
import { getErrorMessage, isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import { notifyPaymentReceipt, scheduleAutopayFailedReminders } from "./whatsapp.service.js";
import { cancelPendingPaymentReminders } from "./reminder.service.js";

const queuePaymentReceipt = async (
  businessId: unknown,
  memberId: unknown,
  paymentId?: unknown,
) => {
  if (!businessId || !memberId) return;
  await cancelPendingPaymentReminders({
    businessId: String(businessId),
    memberId: String(memberId),
  });
  await notifyPaymentReceipt({ businessId, memberId, paymentId });
};

const assertPlanPurchasable = (plan: ServiceParams | null | undefined) => {
  if (!plan) return;
  if (plan.status === "STOPPED") {
    throw codedError("plan_stopped", "Cannot purchase or pay for a stopped membership plan.");
  }
  if (plan.status !== "ACTIVE") {
    throw codedError("plan_not_active", "Membership plan is not active.");
  }
};

const formatInrAmount = (amount: number): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₹${value.toLocaleString("en-IN")}`;
};

const formatIstDayMonth = (value: Date | string | null | undefined): string => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(date);
};

const toDisplayStatus = (
  status: string,
): { displayStatus: "PROCESSED" | "PROCESSING" | "FAILED"; displayStatusLabel: string } => {
  if (status === "SUCCESS" || status === "REFUNDED") {
    return { displayStatus: "PROCESSED", displayStatusLabel: "Processed" };
  }
  if (status === "PENDING") {
    return { displayStatus: "PROCESSING", displayStatusLabel: "Processing" };
  }
  return { displayStatus: "FAILED", displayStatusLabel: "Failed" };
};

const toMemberPreview = (memberId: unknown) => {
  if (memberId && typeof memberId === "object") {
    const member = memberId as {
      name?: string;
      phone?: string;
      profileImage?: string | null;
    };
    return {
      name: member.name || "",
      phone: member.phone || "",
      profileImage: member.profileImage ?? null,
    };
  }
  return { name: "", phone: "", profileImage: null };
};

const withPaymentDisplay = (payment: ServiceParams) => {
  const amount = Number(payment.finalAmount ?? payment.amount) || 0;
  const status = String(payment.status || "");
  return {
    ...payment,
    formattedAmount: formatInrAmount(amount),
    formattedDate: formatIstDayMonth(payment.paidAt || payment.createdAt),
    ...toDisplayStatus(status),
    member: toMemberPreview(payment.memberId),
  };
};

const phoneDigitsMatch = (memberPhone: unknown, user: ServiceParams | null | undefined) => {
  const digits = (v: unknown) => String(v || "").replace(/\D/g, "");
  const memberDigits = digits(memberPhone);
  const userDigits = digits(user?.contactNo || user?.phone);
  return (
    Boolean(memberDigits) &&
    Boolean(userDigits) &&
    (memberDigits === userDigits || memberDigits.slice(-10) === userDigits.slice(-10))
  );
};

const assertCustomerOwnsMembership = async ({ membership, userId, userAuth }: ServiceParams) => {
  const mem = membership as ServiceParams;
  const auth = (userAuth as ServiceParams) || {};
  if (!userId && !auth.uid) {
    throw codedError("forbidden", "You are not authorized to initiate payment for this membership.");
  }
  const uid = userId || auth.uid;
  if (mem.customerUid && String(mem.customerUid) === String(uid)) {
    return;
  }
  const user = uid ? await UserModel.findOne({ uid }).select("uid contactNo phone").lean() : null;
  const member = mem.memberId
    ? await Member.findById(mem.memberId).select("phone").lean()
    : null;
  if (member && phoneDigitsMatch(member.phone, user)) {
    return;
  }
  throw codedError(
    "forbidden",
    "You are not authorized to initiate payment for this membership.",
  );
};

/**
 * List payments for gym
 */
export const listPayments = async ({
  businessId,
  paginationParams,
  filters = {},
}: {
  businessId: unknown;
  paginationParams?: PaginationQuery & { sort?: Record<string, 1 | -1> };
  filters?: ServiceParams;
}) => {
  const { page = 1, limit = 20, skip = 0, sort = { createdAt: -1 } } = paginationParams || {};

  const query: MongoFilter = { businessId };
  if (filters.status && filters.status !== "ALL") query.status = filters.status;
  if (filters.method && filters.method !== "ALL") query.method = filters.method;
  if (filters.memberId) query.memberId = filters.memberId;

  if (filters.from || filters.to) {
    const createdAt: MongoFilter = {};
    query.createdAt = createdAt;
    if (filters.from) createdAt.$gte = new Date(String(filters.from));
    if (filters.to) createdAt.$lte = new Date(String(filters.to));
  }

  const [total, payments] = await Promise.all([
    Payment.countDocuments(query),
    Payment.find(query)
      .populate("memberId", "name phone email profileImage")
      .populate("membershipId", "planId startDate endDate finalAmount")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    payments: payments.map((payment) => withPaymentDisplay(payment as ServiceParams)),
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get payment by ID
 */
export const getPaymentById = async ({
  businessId,
  paymentId,
}: ServiceParams): Promise<IPayment> => {
  const payment = await Payment.findOne({ _id: paymentId, businessId })
    .populate("memberId", "name phone email profileImage")
    .populate("membershipId")
    .populate("couponId", "code type discountPercentage discountAmount")
    .lean();

  if (!payment) {
    throw codedError("payment_not_found", "Payment record not found.");
  }

  return payment as unknown as IPayment;
};

/**
 * Record manual cash/UPI/card payment
 * Defaults associated membership to PENDING unless staff override flag activateMembership is set.
 */
export const recordManualPayment = async ({ businessId, recordedBy, paymentData }: ServiceParams) => {
  const pd = paymentData as ServiceParams;
  const member = await Member.findOne({ _id: pd.memberId, businessId, isDeleted: false }).lean();
  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }

  const amount = Number(pd.amount) || 0;
  const discountAmount = Number(pd.discountAmount) || 0;
  const finalAmount = Number(pd.finalAmount) || Math.max(0, amount - discountAmount);

  if (amount <= 0 || finalAmount <= 0) {
    throw codedError("invalid_amount", "Payment amount must be greater than zero.");
  }

  if (pd.planId) {
    const plan = await MembershipPlan.findOne({ _id: pd.planId, businessId, isDeleted: false }).lean();
    assertPlanPurchasable(plan);
  }

  let membershipId = pd.membershipId || null;
  if (!membershipId) {
    const current = await Membership.findOne({
      businessId,
      memberId: member._id,
      status: { $in: ["ACTIVE", "PENDING"] },
    })
      .sort({ status: 1, createdAt: -1 })
      .select("_id")
      .lean();
    membershipId = current?._id || null;
  }

  const payment = await Payment.create({
    businessId,
    memberId: member._id,
    membershipId,
    planId: pd.planId || null,
    planName: pd.planName || pd.planOrListingName || null,
    eventName: pd.eventName || null,
    couponId: pd.couponId || null,
    amount,
    discountAmount,
    finalAmount,
    currency: (pd.currency as string) || "INR",
    method: pd.method,
    source: "MANUAL",
    status: "SUCCESS",
    transactionId: (pd.transactionId as string) || `MANUAL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    notes: pd.notes || null,
    paidAt: pd.paidAt ? new Date(pd.paidAt as string) : new Date(),
    recordedBy: recordedBy || null,
  });

  // If associated with a membership, update purchasedAt. Only activate if staff override flag is set.
  if (membershipId) {
    const shouldActivate =
      pd.activateMembership === true || pd.membershipStatus === "ACTIVE";
    const updateSet: MongoFilter = {
      purchasedAt: payment.paidAt || new Date(),
    };

    if (shouldActivate) {
      updateSet.status = "ACTIVE";
      updateSet.activatedAt = new Date();

      const mem = await Membership.findOne({ _id: membershipId, businessId });
      if (mem && !mem.startDate) {
        const plan = await MembershipPlan.findOne({ _id: mem.planId, businessId }).lean();
        const duration = plan ? (plan.isFreeTrial && plan.trialDuration ? plan.trialDuration : plan.duration) : 1;
        const durationUnit = plan ? (plan.isFreeTrial && plan.trialDuration ? "DAYS" : plan.durationUnit) : "MONTHS";
        const startDate = new Date();
        updateSet.startDate = startDate;
        if (!mem.endDate) {
          updateSet.endDate = calculateEndDate(startDate, duration, durationUnit);
        }
      }
    }

    await Membership.findOneAndUpdate(
      { _id: membershipId, businessId },
      { $set: updateSet },
    );
  }

  const populated = await Payment.findById(payment._id)
    .populate("memberId", "name phone email profileImage")
    .populate("membershipId")
    .lean();

  await queuePaymentReceipt(businessId, member._id, payment._id);
  return populated || payment.toObject();
};

/**
 * Initiate Razorpay online payment order.
 * Charge amount is always derived from stored membership/plan — never from the client.
 */
export const createOnlinePaymentOrder = async ({
  businessId,
  orderData,
  userId,
  userAuth,
}: ServiceParams) => {
  const od = (orderData as ServiceParams) || {};
  let effectiveBusinessId = businessId;

  if (!effectiveBusinessId) {
    if (!od.membershipId) {
      throw codedError(
        "invalid_field",
        "businessId or membershipId is required to create a payment order.",
      );
    }
    const tenantMembership = await Membership.findOne({
      _id: od.membershipId,
    })
      .select("businessId memberId customerUid")
      .lean();
    if (!tenantMembership) {
      throw codedError("membership_not_found", "Membership not found.");
    }
    effectiveBusinessId = tenantMembership.businessId;
    await assertCustomerOwnsMembership({
      membership: tenantMembership,
      userId,
      userAuth,
    });
  }

  let membership = null;
  if (od.membershipId) {
    membership = await Membership.findOne({
      _id: od.membershipId,
      businessId: effectiveBusinessId,
    }).lean();
    if (!membership) {
      throw codedError("membership_not_found", "Membership not found.");
    }
  }

  const effectiveMemberId = od.memberId || membership?.memberId;
  const member = await Member.findOne({
    _id: effectiveMemberId,
    businessId: effectiveBusinessId,
    isDeleted: false,
  }).lean();
  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }

  const planId = od.planId || membership?.planId;
  let plan = null;
  if (planId) {
    plan = await MembershipPlan.findOne({
      _id: planId,
      businessId: effectiveBusinessId,
      isDeleted: false,
    }).lean();
    assertPlanPurchasable(plan);
  }

  let amount = 0;
  if (membership) {
    const due = Number(membership.finalAmount) || 0;
    const paidAgg = await Payment.aggregate([
      {
        $match: {
          businessId: membership.businessId,
          membershipId: membership._id,
          status: "SUCCESS",
        },
      },
      {
        $group: {
          _id: null,
          paid: { $sum: { $ifNull: ["$finalAmount", { $ifNull: ["$amount", 0] }] } },
        },
      },
    ]);
    const alreadyPaid = Number(paidAgg[0]?.paid) || 0;
    amount = Math.max(0, Math.round((due - alreadyPaid) * 100) / 100);
  } else if (plan) {
    amount = Math.max(0, Number(plan.price) || 0);
  }

  if (!amount || amount <= 0) {
    throw codedError("invalid_field", "Invalid payment amount.");
  }

  const receipt = `gym_${effectiveBusinessId}_${Date.now()}`.slice(0, 40);
  const amountInPaise = Math.round(amount * 100);

  const razorpayOrder = await createOrder(amountInPaise, "INR", receipt, {
    businessId: String(effectiveBusinessId),
    memberId: String(member._id),
    membershipId: String(od.membershipId || membership?._id || ""),
  });

  const payment = await Payment.create({
    businessId: effectiveBusinessId,
    memberId: member._id,
    membershipId: od.membershipId || membership?._id || null,
    couponId: od.couponId || null,
    amount,
    discountAmount: 0,
    finalAmount: amount,
    currency: "INR",
    method: "ONLINE",
    source: "GATEWAY",
    status: "PENDING",
    gatewayOrderId: (razorpayOrder as ServiceParams).id as string,
    notes: od.notes || null,
  });

  return {
    order: razorpayOrder,
    paymentId: payment._id,
    amount,
    currency: "INR",
    key: (process.env.RAZORPAY_KEY_ID || "").trim(),
  };
};

/**
 * Verify Razorpay payment signature and capture payment.
 * Payment → SUCCESS; membership stays PENDING unless gym staff explicitly activates.
 * Customer purchase path never activates. Gateway IDs are never taken from the client.
 */
export const verifyOnlinePayment = async ({
  businessId,
  verificationData,
  hasGymStaffContext = false,
}: ServiceParams) => {
  const vd = verificationData as ServiceParams;
  const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = vd;

  const isValid = verifySignature(
    String(gatewayOrderId),
    String(gatewayPaymentId),
    String(gatewaySignature),
  );
  if (!isValid) {
    throw codedError(
      "payment_failed",
      "Payment failed. You can retry without creating a duplicate membership.",
    );
  }

  const payment = await Payment.findOne({ gatewayOrderId });
  if (!payment) {
    throw codedError("payment_not_found", "Payment record not found for this gateway order.");
  }
  if (businessId && String(payment.businessId) !== String(businessId)) {
    throw codedError("payment_not_found", "Payment record not found for this gateway order.");
  }

  const tenantId = payment.businessId;

  if (payment.status === "SUCCESS") {
    let mem = null;
    if (payment.membershipId) {
      mem = await Membership.findOne({
        _id: payment.membershipId,
        businessId: tenantId,
      }).lean();
    }
    return {
      ...payment.toObject(),
      membershipStatus: mem?.status || "PENDING",
      membershipId: payment.membershipId || null,
      message: "Payment successful. Your plan will activate on first check-in.",
    };
  }

  payment.status = "SUCCESS";
  payment.gatewayPaymentId = String(gatewayPaymentId);
  payment.transactionId = String(gatewayPaymentId);
  payment.paidAt = new Date();
  await payment.save();

  // Increment coupon usage now that payment is confirmed SUCCESS
  if (payment.membershipId) {
    await incrementCouponUsageForMembership(payment.membershipId);
  }

  let membership = null;
  if (payment.membershipId) {
    const shouldActivate =
      hasGymStaffContext === true && vd.activateMembership === true;
    const updateSet: MongoFilter = {
      purchasedAt: payment.paidAt || new Date(),
    };

    if (shouldActivate) {
      updateSet.status = "ACTIVE";
      updateSet.activatedAt = new Date();

      const mem = await Membership.findOne({
        _id: payment.membershipId,
        businessId: tenantId,
      });
      if (mem && !mem.startDate) {
        const plan = await MembershipPlan.findOne({
          _id: mem.planId,
          businessId: tenantId,
        }).lean();
        const duration = plan
          ? plan.isFreeTrial && plan.trialDuration
            ? plan.trialDuration
            : plan.duration
          : 1;
        const durationUnit = plan
          ? plan.isFreeTrial && plan.trialDuration
            ? "DAYS"
            : plan.durationUnit
          : "MONTHS";
        const startDate = new Date();
        updateSet.startDate = startDate;
        if (!mem.endDate) {
          updateSet.endDate = calculateEndDate(startDate, duration, durationUnit);
        }
      }
    }

    membership = await Membership.findOneAndUpdate(
      { _id: payment.membershipId, businessId: tenantId },
      { $set: updateSet },
      { new: true },
    ).lean();

    await notifyGymPurchase({
      membership: membership || {
        _id: payment.membershipId,
        businessId: tenantId,
        memberId: payment.memberId,
      },
      customerUid: null,
      planName: payment.planName ?? undefined,
      isTrial: false,
      notifyOwner: Number(payment.finalAmount) > 0,
    });
  }

  await queuePaymentReceipt(tenantId, payment.memberId, payment._id);
  return {
    ...payment.toObject(),
    membershipStatus: membership?.status || "PENDING",
    membershipId: payment.membershipId || null,
    message: "Payment successful. Your plan will activate on first check-in.",
  };
};

/**
 * Process Razorpay Webhook idempotently
 * Handles order payments and subscription recurring charges/halts/cancellations.
 * Security: Fails closed if signature is missing or invalid
 */
const findMembershipForSubscriptionWebhook = async ({
  subId,
  subEntity,
  paymentEntity,
}: ServiceParams) => {
  const sub = subEntity as ServiceParams;
  const pay = paymentEntity as ServiceParams;
  if (subId) {
    const bySub = await Membership.findOne({ gatewaySubscriptionId: subId as string });
    if (bySub) return bySub;
  }
  const subNotes = sub?.notes as ServiceParams | undefined;
  const payNotes = pay?.notes as ServiceParams | undefined;
  const membershipId =
    subNotes?.membershipId || payNotes?.membershipId || null;
  const notesBusinessId =
    subNotes?.businessId || payNotes?.businessId || null;
  if (membershipId) {
    const query: MongoFilter = { _id: membershipId };
    if (notesBusinessId) query.businessId = notesBusinessId;
    return Membership.findOne(query);
  }
  return null;
};

export const handleRazorpayWebhook = async ({ rawBody, signature, eventPayload }: ServiceParams) => {
  if (!signature) {
    throw codedError("forbidden", "Missing webhook signature header.");
  }

  const isValid = verifyWebhookSignature(rawBody as string, signature as string);
  if (!isValid) {
    throw codedError("forbidden", "Invalid webhook signature.");
  }

  const payload = eventPayload as ServiceParams;
  const event = payload?.event;
  const paymentEntity = ((payload?.payload as ServiceParams)?.payment as ServiceParams)?.entity as ServiceParams | undefined;
  const subEntity = ((payload?.payload as ServiceParams)?.subscription as ServiceParams)?.entity as ServiceParams | undefined;
  const orderId = paymentEntity?.order_id;
  const subId = subEntity?.id || paymentEntity?.subscription_id;

  // 1. Subscription Charged Event -> Extend membership + Payment SUCCESS
  if (event === "subscription.charged") {
    const membership = await findMembershipForSubscriptionWebhook({
      subId,
      subEntity,
      paymentEntity,
    });

    if (membership) {
      const gatewayPaymentId = paymentEntity?.id;
      // Idempotent by gatewayPaymentId
      if (gatewayPaymentId) {
        const existingPayment = await Payment.findOne({
          businessId: membership.businessId,
          gatewayPaymentId,
          status: "SUCCESS",
        });
        if (existingPayment) {
          return { received: true, event, idempotent: true };
        }
      }

      const plan = await MembershipPlan.findOne({
        _id: membership.planId,
        businessId: membership.businessId,
      }).lean();
      const duration =
        plan && plan.isFreeTrial && plan.trialDuration
          ? plan.trialDuration
          : plan?.duration || 1;
      const durationUnit =
        plan && plan.isFreeTrial && plan.trialDuration
          ? "DAYS"
          : plan?.durationUnit || "MONTHS";

      const now = new Date();
      const baseDate =
        membership.endDate && new Date(membership.endDate) > now
          ? new Date(membership.endDate)
          : now;
      const newEndDate = calculateEndDate(baseDate, duration, durationUnit);

      membership.status = "ACTIVE";
      membership.endDate = newEndDate;
      membership.renewalStatus = "RENEWED";
      membership.autoRenew = true;
      if (subId && !membership.gatewaySubscriptionId) {
        membership.gatewaySubscriptionId = String(subId);
      }
      if (subEntity?.customer_id && !membership.gatewayCustomerId) {
        membership.gatewayCustomerId = String(subEntity.customer_id);
      }
      await membership.save();

      const paidAmount = paymentEntity?.amount
        ? Number(paymentEntity.amount) / 100
        : membership.finalAmount || plan?.price || 0;

      let createdPayment = null;
      try {
        createdPayment = await Payment.create({
          businessId: membership.businessId,
          memberId: membership.memberId,
          membershipId: membership._id,
          planId: membership.planId,
          planName: plan?.name || "Auto-Renewed Membership",
          amount: paidAmount,
          discountAmount: 0,
          finalAmount: paidAmount,
          currency: paymentEntity?.currency || "INR",
          method: "ONLINE",
          source: "GATEWAY",
          status: "SUCCESS",
          transactionId: gatewayPaymentId || `SUBPAY-${Date.now()}`,
          gatewayPaymentId: gatewayPaymentId || null,
          gatewayOrderId: paymentEntity?.order_id || null,
          paidAt: paymentEntity?.created_at
            ? new Date(Number(paymentEntity.created_at) * 1000)
            : now,
          notes: `Auto-renewal subscription charged (${subId || "gateway"})`,
        });
      } catch (err: unknown) {
        if (isMongoDuplicateKeyError(err) && gatewayPaymentId) {
          return { received: true, event, idempotent: true };
        }
        throw err;
      }
      await incrementCouponUsageForMembership(membership._id);
      await notifyGymAutoRenewed({ membership });
      await queuePaymentReceipt(membership.businessId, membership.memberId, createdPayment?._id);
    }
    return { received: true, event };
  }

  // 2. Subscription Halted / Payment Failed on Subscription -> EXPIRED immediately
  if (event === "subscription.halted" || (event === "payment.failed" && subId)) {
    const membership = await findMembershipForSubscriptionWebhook({
      subId,
      subEntity,
      paymentEntity,
    });

    if (membership) {
      const alreadyFailed =
        membership.status === "EXPIRED" && membership.renewalStatus === "FAILED";
      membership.status = "EXPIRED";
      membership.renewalStatus = "FAILED";
      membership.autoRenew = false;
      await membership.save();
      if (!alreadyFailed) {
        await notifyGymAutoRenewFailed({ membership });
        void scheduleAutopayFailedReminders({
          businessId: membership.businessId,
          memberId: membership.memberId,
        });
      }
    }
    return { received: true, event };
  }

  // 3. Subscription Cancelled / Completed -> autoRenew = false, keep ACTIVE until current endDate
  if (event === "subscription.cancelled" || event === "subscription.completed") {
    const membership = await findMembershipForSubscriptionWebhook({
      subId,
      subEntity,
      paymentEntity,
    });

    if (membership) {
      membership.autoRenew = false;
      membership.renewalStatus = "NONE";
      await membership.save();
    }
    return { received: true, event };
  }

  // 4. Standard Order Payments (payment.captured / order.paid / payment.failed)
  if (orderId) {
    const payment = await Payment.findOne({ gatewayOrderId: orderId });
    if (payment) {
      if (event === "payment.captured" || event === "order.paid") {
        if (payment.status !== "SUCCESS") {
          payment.status = "SUCCESS";
          payment.gatewayPaymentId = String(paymentEntity?.id || payment.gatewayPaymentId);
          payment.paidAt = new Date();
          await payment.save();

          if (payment.membershipId) {
            await incrementCouponUsageForMembership(payment.membershipId);

            const membership = await Membership.findOneAndUpdate(
              { _id: payment.membershipId, businessId: payment.businessId },
              { $set: { purchasedAt: payment.paidAt } },
              { new: true },
            ).lean();
            await queuePaymentReceipt(payment.businessId, payment.memberId, payment._id);
            await notifyGymPurchase({
              membership: membership || {
                _id: payment.membershipId,
                businessId: payment.businessId,
                memberId: payment.memberId,
              },
              planName: payment.planName ?? undefined,
              isTrial: false,
              notifyOwner: Number(payment.finalAmount) > 0,
            });
          }
        }
      } else if (event === "payment.failed") {
        payment.status = "FAILED";
        await payment.save();
      }
    }
  }

  return { received: true, event };
};

/**
 * Nightly reconciliation cron safety net for gym auto-renew subscriptions.
 */
export const reconcileGymSubscriptions = async ({ now = new Date() }: ServiceParams = {}) => {
  const currentDate = now instanceof Date ? now : new Date(now as string | number);
  const next24h = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);

  let healedCount = 0;
  let expiredCount = 0;

  // 1. Heal ACTIVE autoRenew near expiry missing gatewaySubscriptionId
  const toHeal = await Membership.find({
    status: "ACTIVE",
    autoRenew: true,
    gatewaySubscriptionId: { $in: [null, ""] },
    endDate: { $lte: next24h, $gt: currentDate },
  }).populate("planId");

  for (const mem of toHeal) {
    const plan = asPopulatedPlan(mem.planId);
    if (plan && plan.billingCycle && plan.billingCycle !== "ONE_TIME" && !plan.isFreeTrial) {
      try {
        const { ensureGatewayPlanId } = await import("../../gym-business/services/membershipPlan.service.js");
        const gatewayPlanId = plan.gatewayPlanId || (await ensureGatewayPlanId(plan));
        if (!gatewayPlanId) {
          logger.warn(
            "[reconcileGymSubscriptions] Skipping healing: could not resolve gatewayPlanId for plan:",
            plan._id,
          );
          continue;
        }
        if (!mem.endDate) continue;
        const endSec = Math.floor(new Date(mem.endDate).getTime() / 1000);
        const oneDayBeforeSec = endSec - 86400;
        const minStartSec = Math.floor(currentDate.getTime() / 1000) + 60;
        const startAt = Math.max(minStartSec, oneDayBeforeSec);

        const sub = await createSubscription({
          planId: gatewayPlanId as string,
          customerId: mem.gatewayCustomerId || null,
          startAt,
          notes: {
            businessId: String(mem.businessId),
            memberId: String(mem.memberId),
            membershipId: String(mem._id),
            planId: String(plan._id),
            autoRenew: "true",
            healed: "true",
          },
        } as ServiceParams);

        const subResult = sub as ServiceParams;
        if (subResult?.id) {
          mem.gatewaySubscriptionId = subResult.id as string;
          mem.renewalStatus = "SCHEDULED";
          await mem.save();
          healedCount++;
        }
      } catch (err: unknown) {
        logger.warn(
          "[reconcileGymSubscriptions] Failed to heal subscription for membership:",
          mem._id,
          getErrorMessage(err),
        );
      }
    }
  }

  // 2. Expire ACTIVE memberships past endDate where auto-renew charge was missed or failed
  const toExpire = await Membership.find({
    status: "ACTIVE",
    endDate: { $lt: currentDate },
  });

  for (const mem of toExpire) {
    const wasAutoRenew = mem.autoRenew === true;
    mem.status = "EXPIRED";
    if (wasAutoRenew) {
      mem.autoRenew = false;
      mem.renewalStatus = "FAILED";
    }
    await mem.save();
    expiredCount++;
    if (wasAutoRenew) {
      await notifyGymAutoRenewFailed({ membership: mem });
    }
  }

  return {
    healedCount,
    expiredCount,
    processedAt: currentDate,
  };
};

/**
 * Aggregate manual payment summaries for gym members.
 * Paid/due is scoped to the selected (ACTIVE, else PENDING) membership.
 */
export const getMemberPaymentSummaries = async ({ businessId, memberId }: ServiceParams) => {
  const memberQuery: MongoFilter = { businessId, isDeleted: false };
  if (memberId) memberQuery._id = memberId;

  const members = await Member.find(memberQuery).sort({ createdAt: -1 }).lean();
  const memberIds = members.map((m) => m._id);
  const [memberships, payments, business] = await Promise.all([
    Membership.find({ businessId, memberId: { $in: memberIds } })
      .populate("planId", "name billingCycle price")
      .sort({ createdAt: -1 })
      .lean(),
    Payment.find({ businessId, memberId: { $in: memberIds }, status: "SUCCESS" })
      .sort({ paidAt: -1, createdAt: -1 })
      .lean(),
    Business.findById(businessId).select("slug").lean(),
  ]);

  const slug = business?.slug ? String(business.slug) : null;
  const membershipRank = (status: unknown) => {
    if (status === "ACTIVE") return 0;
    if (status === "PENDING") return 1;
    return 9;
  };
  const memberMembershipMap = new Map();
  for (const m of memberships) {
    const mId = String(m.memberId);
    const existing = memberMembershipMap.get(mId);
    if (!existing || membershipRank(m.status) < membershipRank(existing.status)) {
      memberMembershipMap.set(mId, m);
    }
  }

  const memberPaymentsMap = new Map();
  for (const p of payments) {
    const mId = String(p.memberId);
    if (!memberPaymentsMap.has(mId)) {
      memberPaymentsMap.set(mId, []);
    }
    memberPaymentsMap.get(mId).push(p);
  }

  const now = new Date();
  const summaries: ServiceParams[] = [];

  for (const member of members) {
    const mId = String(member._id);
    const membership = memberMembershipMap.get(mId);
    const memberPayments = memberPaymentsMap.get(mId) || [];
    const membershipId = membership ? String(membership._id) : "";
    const membershipPayments = membershipId
      ? memberPayments.filter(
          (p: ServiceParams) => p.membershipId && String(p.membershipId) === membershipId,
        )
      : [];

    const plan = asPopulatedPlan(membership?.planId);
    const planName = plan?.name || (membership as ServiceParams)?.planName || "STRON Plan";
    const cycle = plan?.billingCycle || "Monthly";
    const billingCycleText = `${planName} - ${cycle.charAt(0).toUpperCase() + cycle.slice(1).toLowerCase()}`;

    const fromFinal = Number(membership?.finalAmount);
    const fromPurchase = Number((membership as ServiceParams)?.priceAtPurchase);
    const fromPlan = Number(plan?.price);
    const totalPrice =
      (Number.isFinite(fromFinal) && fromFinal > 0 && fromFinal) ||
      (Number.isFinite(fromPurchase) && fromPurchase > 0 && fromPurchase) ||
      (Number.isFinite(fromPlan) && fromPlan > 0 && fromPlan) ||
      0;
    const totalPaid = membershipPayments.reduce(
      (acc: number, p: ServiceParams) => acc + (Number(p.finalAmount) || Number(p.amount) || 0),
      0,
    );
    const totalDue = Math.max(0, Math.round((totalPrice - totalPaid) * 100) / 100);
    const paidPercentage = totalPrice > 0 ? Math.min(100, Math.round((totalPaid / totalPrice) * 100)) : 0;
    const hasPaidMembership = membershipPayments.length > 0;

    let daysLeft = 0;
    let isOverdue = false;
    let overdueDays = 0;
    let daysLeftText = "No Active Plan";

    if (membership?.status === "PENDING") {
      daysLeft = 0;
      daysLeftText = hasPaidMembership
        ? "Paid — awaiting first check-in."
        : totalDue > 0
          ? "Payment due"
          : "No Active Plan";
    } else if (membership?.endDate) {
      const diffTime = new Date(membership.endDate).getTime() - now.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (daysLeft <= 0) {
        isOverdue = totalDue > 0;
        overdueDays = Math.abs(daysLeft);
        daysLeftText = "Expired";
      } else {
        daysLeftText = `${daysLeft} Days left`;
      }
    }

    const latestPayment = membershipPayments[0] || memberPayments[0];
    const paymentUrl = buildPublicPayUrl(slug, mId);
    const autoPayUrl = buildPublicPayUrl(slug, mId, "autoRenew=1");

    summaries.push({
      memberId: mId,
      memberName: member.name || "Member",
      phone: member.phone || "",
      profileImage: member.profileImage || undefined,
      member: {
        name: member.name || "",
        phone: member.phone || "",
        profileImage: member.profileImage ?? null,
      },
      planName,
      billingCycleText,
      totalPrice,
      totalPaid,
      totalDue,
      formattedAmount: formatInrAmount(totalPaid),
      formattedDate: formatIstDayMonth(latestPayment?.paidAt || latestPayment?.createdAt),
      ...toDisplayStatus(String(latestPayment?.status || (totalDue > 0 ? "PENDING" : "SUCCESS"))),
      paidPercentage,
      daysLeftText,
      isOverdue,
      overdueDays,
      activeMembershipId: membershipId || undefined,
      planId: plan?._id
        ? String(plan._id)
        : membership?.planId
          ? String(membership.planId)
          : undefined,
      latestPaymentDate: latestPayment?.paidAt ? new Date(latestPayment.paidAt).toISOString() : undefined,
      paymentUrl,
      autoPayUrl,
    });
  }

  return {
    summaries,
    totalMembers: summaries.length,
    totalOverdueCount: summaries.filter((s) => s.isOverdue).length,
  };
};

export const getMemberPaymentSummary = async ({ businessId, memberId }: ServiceParams) => {
  const member = await Member.findOne({ _id: memberId, businessId, isDeleted: false }).select("_id").lean();
  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }
  const result = await getMemberPaymentSummaries({ businessId, memberId });
  return result.summaries[0];
};

export default {
  listPayments,
  getPaymentById,
  getMemberPaymentSummaries,
  getMemberPaymentSummary,
  recordManualPayment,
  createOnlinePaymentOrder,
  verifyOnlinePayment,
  handleRazorpayWebhook,
  reconcileGymSubscriptions,
};

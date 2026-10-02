import { getErrorMessage } from "../../../types/mongo.util.js";
import {
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  refundPayment,
  fetchPayment,
} from "../../../services/razorpay.service.js";
import { UserModel } from "../../identity-auth/index.js";
import {
  Registration,
  getActiveEnrollment,
  getEventDefinitionByKey,
  enrollUserInEvent,
  normalizePlanIdForEvent,
} from "../../catalog-events/index.js";
import Transaction from "../models/transaction.model.js";
import { isUserAdmin } from "../../../config/remoteConfigService.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import {
  generateTicketNumber,
  generateQrCodePayload,
  resolveEventKeyInput,
} from "../../../utils/razorpayPayment.util.js";
import { EVENT_KEYS } from "../../../config/eventCatalog.js";
import { sendNotificationToUser } from "../../notifications/index.js";
import {
  finalizeParticipation,
  getParticipationForTransaction,
  isStronTransaction,
} from "../../managed-events/index.js";
import type {
  PaymentRecord,
  RegistrationDoc,
  ITransaction,
  CreateEventPaymentOrderParams,
  VerifyEventPaymentParams,
  RefundEventPaymentParams,
  PaymentFlowError,
  ComputeOrderAmountParams,
  GetPaymentHistoryParams,
} from "../types/index.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";

const paymentFlowError = (code: string, message: string): PaymentFlowError => {
  const error = new Error(message) as PaymentFlowError;
  error.code = code;
  return error;
};

const PENDING_PAYMENT_STATUSES = new Set(["created", "authorized", "pending"]);

export const computeOrderAmountInr = async ({
  eventKey,
  planId = null,
  couponCode = null,
}: ComputeOrderAmountParams) => {
  const event = await getEventDefinitionByKey(eventKey);
  if (!event) {
    throw new Error("Event not found.");
  }

  const eventDef = event as ServiceParams & {
    plans?: ServiceParams[];
    price?: number;
    customMeta?: ServiceParams;
  };

  const normalizedPlanId = normalizePlanIdForEvent({ eventKey, planId });
  const plan =
    eventDef.plans?.find(
      (item: ServiceParams) => item.id === normalizedPlanId,
    ) || null;
  let amountInr = Number(plan?.price ?? eventDef.price ?? 0);

  if (!Number.isFinite(amountInr) || amountInr <= 0) {
    throw new Error("This event does not require payment.");
  }

  const normalizedCoupon = String(couponCode || "").trim().toUpperCase();
  if (normalizedCoupon) {
    const envCoupon = String(process.env.MARATHON_COUPON_CODE || "")
      .trim()
      .toUpperCase();

    if (envCoupon && normalizedCoupon === envCoupon) {
      throw new Error(
        "This coupon grants free registration. Use the free enrollment option.",
      );
    }

    const customCoupons = Array.isArray(eventDef.customMeta?.coupons)
      ? (eventDef.customMeta.coupons as ServiceParams[])
      : [];
    const matchedCoupon = customCoupons.find(
      (entry: ServiceParams) =>
        String(entry?.codename || "")
          .trim()
          .toUpperCase() === normalizedCoupon,
    );

    if (matchedCoupon) {
      const discountPercent = Number(matchedCoupon.discount) || 0;
      amountInr = Math.max(
        0,
        Math.round(amountInr * (1 - discountPercent / 100)),
      );
    }
  }

  if (amountInr <= 0) {
    throw new Error("No payment required for this registration.");
  }

  return {
    amountInr,
    event,
    normalizedPlanId,
  };
};

export const validatePaymentForEnrollment = async ({
  razorpayPaymentId,
  razorpayOrderId,
  expectedAmountPaise,
}: {
  razorpayPaymentId: string | null | undefined;
  razorpayOrderId: string | null | undefined;
  expectedAmountPaise: number;
}) => {
  if (!razorpayPaymentId || !razorpayOrderId) {
    throw paymentFlowError("PAYMENT_INVALID", "Missing payment details.");
  }

  const payment = await fetchPayment(razorpayPaymentId);

  if (payment.status !== "captured") {
    throw paymentFlowError(
      PENDING_PAYMENT_STATUSES.has(payment.status)
        ? "PAYMENT_PENDING"
        : "PAYMENT_INVALID",
      PENDING_PAYMENT_STATUSES.has(payment.status)
        ? "Payment is still processing. Complete the payment in your UPI or wallet app, then try again."
        : `Payment could not be completed (status: ${payment.status}).`,
    );
  }

  if (String(payment.order_id) !== String(razorpayOrderId)) {
    throw paymentFlowError("PAYMENT_INVALID", "Payment order mismatch.");
  }

  if (Number(payment.amount) !== Math.round(expectedAmountPaise)) {
    throw paymentFlowError("PAYMENT_INVALID", "Payment amount mismatch.");
  }

  if (Number((payment as unknown as ServiceParams).refunded_amount || 0) > 0) {
    throw paymentFlowError("PAYMENT_INVALID", "Payment was refunded.");
  }

  return payment;
};

const issueTicketIfNeeded = async (
  registration: PaymentRecord | null,
  transaction: PaymentRecord,
) => {
  if (!registration) return registration;

  if (!registration.ticketNumber) {
    registration.ticketNumber = generateTicketNumber();
    registration.qrCode = generateQrCodePayload({
      ticketNumber: registration.ticketNumber,
      uid: String(transaction.uid),
      eventKey: String(transaction.eventKey),
    });
  }

  registration.paymentStatus = "Success";
  registration.registrationStatus = "Confirmed";
  registration.paymentId = transaction._id;
  await registration.save?.();
  return registration;
};

export const confirmRazorpayPayment = async ({
  transaction,
  registration = null,
  razorpayPaymentId = null,
  razorpaySignature = null,
}: {
  transaction: PaymentRecord | null;
  registration?: PaymentRecord | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
}) => {
  if (!transaction) {
    throw new Error("Transaction not found.");
  }

  if (transaction.status === "captured") {
    // STRON-managed tickets resolve to a participation, not a legacy enrollment.
    if (isStronTransaction(transaction)) {
      const participation = await getParticipationForTransaction(transaction);
      return { alreadyProcessed: true, participation, registration };
    }

    const existingEnrollment = await getActiveEnrollment({
      uid: String(transaction.uid),
      eventKey: String(transaction.eventKey),
      seasonKey:
        transaction.eventKey === EVENT_KEYS.SURVIVOR ? null : null,
    });
    return {
      alreadyProcessed: true,
      enrollment: existingEnrollment,
      registration,
    };
  }

  if (!razorpayPaymentId) {
    throw new Error("Payment id is required before confirming enrollment.");
  }

  await validatePaymentForEnrollment({
    razorpayPaymentId,
    razorpayOrderId: String(transaction.razorpayOrderId),
    expectedAmountPaise: Math.round(Number(transaction.amount) * 100),
  });

  if (razorpayPaymentId) {
    transaction.razorpayPaymentId = razorpayPaymentId;
  }
  if (razorpaySignature) {
    transaction.razorpaySignature = razorpaySignature;
  }
  transaction.status = "captured";
  transaction.paidAt = new Date();
  await transaction.save?.();

  const resolvedRegistration =
    registration ||
    ((await Registration.findOne({
      razorpayOrderId: transaction.razorpayOrderId,
    })) as PaymentRecord | null) ||
    ((await Registration.findOne({
      uid: transaction.uid,
      eventKey: transaction.eventKey,
      paymentStatus: "Pending",
    }).sort({ createdAt: -1 })) as unknown as PaymentRecord | null);

  const confirmedRegistration = await issueTicketIfNeeded(
    resolvedRegistration,
    transaction,
  );

  // STRON-managed capture: claim a seat and create the participation (or auto-refund).
  if (isStronTransaction(transaction)) {
    if (!confirmedRegistration) {
      throw paymentFlowError(
        "REGISTRATION_NOT_FOUND",
        "Registration not found for this transaction.",
      );
    }
    const result = await finalizeParticipation({
      transaction,
      registration: confirmedRegistration as RegistrationDoc,
    });
    return {
      alreadyProcessed: result.alreadyProcessed === true,
      participation: result.participation,
      registration: result.registration || confirmedRegistration,
      refunded: result.refunded === true,
    };
  }

  let enrollment = await getActiveEnrollment({
    uid: String(transaction.uid),
    eventKey: String(transaction.eventKey),
    seasonKey: null,
  });

  if (!enrollment) {
    enrollment = await enrollUserInEvent({
      uid: String(transaction.uid),
      eventKey: String(transaction.eventKey),
      planId: (transaction.planId as string | null) || confirmedRegistration?.planId,
      paymentAmountOverride: Number(transaction.amount),
      currentStepCount: confirmedRegistration?.currentStepCount ?? null,
    });
  }

  try {
    await sendNotificationToUser(
      String(transaction.uid),
      "Payment successful",
      `You are registered for ${String(transaction.eventKey)}. Ticket: ${confirmedRegistration?.ticketNumber || "confirmed"}`,
    );
  } catch (notificationError) {
    logger.warn("[RAZORPAY] push notification failed:", getErrorMessage(notificationError));
  }

  return {
    alreadyProcessed: false,
    enrollment,
    registration: confirmedRegistration,
  };
};

export const markPaymentFailed = async ({
  transaction,
  registration = null,
  reason = "Payment failed",
}: {
  transaction: PaymentRecord | null;
  registration?: PaymentRecord | null;
  reason?: string;
}) => {
  if (!transaction) return;

  if (transaction.status !== "captured") {
    transaction.status = "failed";
    await transaction.save?.();
  }

  const resolvedRegistration =
    registration ||
    ((await Registration.findOne({
      razorpayOrderId: transaction.razorpayOrderId,
    })) as PaymentRecord | null);

  if (
    resolvedRegistration &&
    resolvedRegistration.paymentStatus === "Pending"
  ) {
    resolvedRegistration.paymentStatus = "Failed";
    resolvedRegistration.registrationStatus = "Cancelled";
    await resolvedRegistration.save?.();
  }

  try {
    await sendNotificationToUser(
      String(transaction.uid),
      "Payment failed",
      reason,
    );
  } catch (notificationError) {
    logger.warn("[RAZORPAY] failure notification failed:", getErrorMessage(notificationError));
  }
};

export const appendWebhookLog = async (
  transaction: PaymentRecord | null,
  eventName: string,
  payload: unknown,
) => {
  if (!transaction) return;
  const existingLogs = Array.isArray(transaction.webhookLogs)
    ? transaction.webhookLogs
    : [];
  transaction.webhookLogs = [
    ...existingLogs,
    {
      event: eventName,
      payload,
      receivedAt: new Date(),
    },
  ].slice(-20);
  await transaction.save?.();
};

const getOptionalErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

export const createPaymentOrderService = async ({
  uid,
  eventKey,
  eventId,
  planId = null,
  currentStepCount = null,
  couponCode = null,
  countryCode = null,
}: CreateEventPaymentOrderParams) => {
  if (!uid) {
    throw codedError("unauthorized", "Unauthorized.");
  }

  const resolvedEventKey = resolveEventKeyInput(eventKey, eventId);

  if (countryCode) {
    await UserModel.updateOne(
      { uid },
      {
        $set: {
          lastKnownCountryCode: countryCode,
          lastKnownCountryUpdatedAt: new Date(),
        },
      },
    );
  }

  const existingEnrollment = await getActiveEnrollment({
    uid,
    eventKey: resolvedEventKey,
    seasonKey: null,
  });

  if (existingEnrollment) {
    throw codedError("bad_request", "You are already enrolled in this event.");
  }

  const { amountInr, normalizedPlanId } = await computeOrderAmountInr({
    eventKey: resolvedEventKey,
    planId,
    couponCode,
  });

  const amountPaise = Math.round(amountInr * 100);
  const currency = "INR";
  const receipt = `rcpt_${uid}_${Date.now()}`.substring(0, 40);

  const order = await createOrder(amountPaise, currency, receipt, {
    eventKey: resolvedEventKey,
    uid,
    planId: normalizedPlanId,
  });

  let registration = await Registration.findOne({
    uid,
    eventKey: resolvedEventKey,
    paymentStatus: "Pending",
  });

  if (!registration) {
    registration = new Registration({
      uid,
      eventKey: resolvedEventKey,
      planId: normalizedPlanId,
      currentStepCount:
        Number.isFinite(Number(currentStepCount)) ? Number(currentStepCount) : null,
      couponCode: couponCode ? String(couponCode).trim() : null,
      paymentStatus: "Pending",
      registrationStatus: "Pending",
      razorpayOrderId: order.id,
    });
  } else {
    registration.planId = normalizedPlanId;
    registration.currentStepCount =
      Number.isFinite(Number(currentStepCount)) ? Number(currentStepCount) : registration.currentStepCount;
    registration.couponCode = couponCode ? String(couponCode).trim() : registration.couponCode;
    registration.razorpayOrderId = order.id;
    registration.paymentStatus = "Pending";
    registration.registrationStatus = "Pending";
  }
  await registration.save();

  const transaction = new Transaction({
    uid,
    eventKey: resolvedEventKey,
    planId: normalizedPlanId,
    registrationId: registration._id,
    amount: amountInr,
    currency,
    razorpayOrderId: order.id,
    status: "created",
    receipt,
    description: `Payment for ${resolvedEventKey}`,
  });
  await transaction.save();

  registration.paymentId = transaction._id;
  await registration.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID || "",
    eventKey: resolvedEventKey,
    planId: normalizedPlanId,
  };
};

export const verifyPaymentService = async ({
  uid,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}: VerifyEventPaymentParams) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw codedError("bad_request", "Missing Razorpay payment verification fields.");
  }

  const isValid = verifySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  );
  if (!isValid) {
    trackEvent(ANALYTICS_EVENTS.PAYMENT_FAILED, {
      user_id: uid,
      stage: "verify",
      reason: "Invalid signature",
      order_id: razorpayOrderId,
    });
    throw codedError("bad_request", "Invalid signature.");
  }

  const transaction = await Transaction.findOne({
    razorpayOrderId,
  });
  if (!transaction) {
    throw codedError("not_found", "Transaction not found.");
  }

  if (transaction.uid !== uid) {
    throw codedError("forbidden", "Forbidden.");
  }

  try {
    await validatePaymentForEnrollment({
      razorpayPaymentId,
      razorpayOrderId,
      expectedAmountPaise: Math.round(transaction.amount * 100),
    });
  } catch (validationError) {
    if (getOptionalErrorCode(validationError) === "PAYMENT_PENDING") {
      const err = codedError("bad_request", getErrorMessage(validationError));
      (err as unknown as { pending: boolean; statusCode: number }).pending = true;
      (err as unknown as { statusCode: number }).statusCode = 202;
      throw err;
    }
    trackEvent(ANALYTICS_EVENTS.PAYMENT_FAILED, {
      user_id: uid,
      stage: "verify",
      reason: getErrorMessage(validationError) || "Payment validation failed",
      order_id: razorpayOrderId,
    });
    throw codedError("bad_request", getErrorMessage(validationError) || "Payment validation failed.");
  }

  const registration = await Registration.findOne({
    razorpayOrderId,
  });

  const result = await confirmRazorpayPayment({
    transaction: transaction as PaymentRecord,
    registration: registration as PaymentRecord | null,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (result.refunded === true) {
    trackEvent(ANALYTICS_EVENTS.PAYMENT_FAILED, {
      user_id: uid,
      event_key: transaction.eventKey,
      amount: transaction.amount,
      stage: "verify",
      reason: "Ticket unavailable — payment refunded",
      order_id: razorpayOrderId,
    });
  } else {
    trackEvent(ANALYTICS_EVENTS.PAYMENT_SUCCEEDED, {
      user_id: uid,
      event_key: transaction.eventKey,
      amount: transaction.amount,
      order_id: razorpayOrderId,
    });
  }

  return {
    alreadyProcessed: result.alreadyProcessed,
    enrollment: result.enrollment,
    participation: result.participation || null,
    registration: result.registration,
    ticketNumber: result.registration?.ticketNumber || null,
    refunded: result.refunded === true,
  };
};

export const handleRazorpayWebhookService = async ({
  signature,
  rawBody,
  body,
}: {
  signature?: string;
  rawBody: string;
  body: Record<string, unknown>;
}) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || null;

  if (!secret) {
    logger.error("[RAZORPAY] RAZORPAY_WEBHOOK_SECRET is not configured.");
    throw codedError("bad_request", "Webhook secret not configured");
  }

  if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
    throw codedError("bad_request", "Invalid webhook signature");
  }

  const event = body as Record<string, unknown>;
  const eventName = event?.event as string;
  const payload = event?.payload as Record<string, Record<string, Record<string, unknown>>>;
  const paymentEntity = payload?.payment?.entity;
  const orderEntity = payload?.order?.entity;
  const refundEntity = payload?.refund?.entity;
  const orderId =
    (paymentEntity?.order_id as string) ||
    (orderEntity?.id as string) ||
    null;

  let transaction = orderId
    ? await Transaction.findOne({ razorpayOrderId: orderId })
    : null;

  if (!transaction && paymentEntity?.id) {
    transaction = await Transaction.findOne({
      razorpayPaymentId: paymentEntity.id as string,
    });
  }

  if (!transaction && refundEntity?.payment_id) {
    transaction = await Transaction.findOne({
      razorpayPaymentId: refundEntity.payment_id as string,
    });
  }

  if (transaction) {
    await appendWebhookLog(transaction as PaymentRecord, eventName, event);
  }

  if (eventName === "payment.captured") {
    if (!transaction || !paymentEntity?.id) {
      return;
    }

    if (paymentEntity.status && paymentEntity.status !== "captured") {
      return;
    }

    try {
      await validatePaymentForEnrollment({
        razorpayPaymentId: paymentEntity.id as string,
        razorpayOrderId: transaction.razorpayOrderId,
        expectedAmountPaise: Math.round(transaction.amount * 100),
      });
    } catch (validationError) {
      logger.warn("[RAZORPAY] webhook payment rejected:", getErrorMessage(validationError));
      return;
    }

    const registration = await Registration.findOne({
      razorpayOrderId: transaction.razorpayOrderId,
    });

    await confirmRazorpayPayment({
      transaction: transaction as PaymentRecord,
      registration: registration as PaymentRecord | null,
      razorpayPaymentId: paymentEntity.id as string,
    });
  } else if (eventName === "payment.failed") {
    if (transaction) {
      const registration = await Registration.findOne({
        razorpayOrderId: transaction.razorpayOrderId,
      });
      await markPaymentFailed({
        transaction: transaction as PaymentRecord,
        registration: registration as PaymentRecord | null,
        reason: (paymentEntity?.error_description as string) || "Payment failed",
      });
    }
  } else if (eventName === "refund.processed") {
    if (transaction && refundEntity) {
      transaction.refundAmount = Number(refundEntity.amount || 0) / 100;
      transaction.refundStatus = "processed";
      transaction.status = "refunded";
      await transaction.save();

      const registration = await Registration.findOne({
        razorpayOrderId: transaction.razorpayOrderId,
      });
      if (registration) {
        registration.paymentStatus = "Refunded";
        registration.registrationStatus = "Cancelled";
        await registration.save();
      }
    }
  }
};

export const getPaymentHistoryService = async ({ uid }: GetPaymentHistoryParams) => {
  if (!uid) throw codedError("unauthorized", "Unauthorized.");
  return Transaction.find({ uid })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

export const refundRazorpayPaymentService = async ({
  uid,
  razorpayOrderId,
  amount,
}: RefundEventPaymentParams) => {
  if (!razorpayOrderId) {
    throw codedError("bad_request", "razorpayOrderId is required.");
  }

  const transaction = await Transaction.findOne({ razorpayOrderId });
  if (!transaction) {
    throw codedError("not_found", "Transaction not found.");
  }

  const user = await UserModel.findOne({ uid }).lean();
  const isAdmin = isUserAdmin(user?.email);
  if (!isAdmin && transaction.uid !== uid) {
    throw codedError("forbidden", "Forbidden.");
  }

  if (!transaction.razorpayPaymentId) {
    throw codedError("bad_request", "Payment has not been captured yet.");
  }

  const refundAmountPaise = amount
    ? Math.round(Number(amount) * 100)
    : Math.round(transaction.amount * 100);

  const refund = await refundPayment(
    transaction.razorpayPaymentId,
    refundAmountPaise,
    { razorpayOrderId },
  );

  transaction.refundAmount = refundAmountPaise / 100;
  transaction.refundStatus = "pending";
  await transaction.save();

  return refund;
};

export default {
  computeOrderAmountInr,
  validatePaymentForEnrollment,
  confirmRazorpayPayment,
  markPaymentFailed,
  appendWebhookLog,
  createPaymentOrderService,
  verifyPaymentService,
  handleRazorpayWebhookService,
  getPaymentHistoryService,
  refundRazorpayPaymentService,
};

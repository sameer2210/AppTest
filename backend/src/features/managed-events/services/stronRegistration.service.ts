// Participation + payment glue for STRON Managed Events.
// Creates Razorpay orders for tickets and finalizes a participation on payment capture,
// with idempotency, capacity claiming, oversell auto-refund, and duplicate protection.

import { Registration, type IRegistration } from "../../catalog-events/index.js";
import { Transaction } from "../../payments-payouts/index.js";
import { UserModel } from "../../identity-auth/index.js";
import crypto from "crypto";
import { createOrder, refundPayment } from "../../../services/razorpay.service.js";
import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { getEventByKey, isRegistrationOpen } from "./stronEvent.service.js";
import { notifyUser } from "./stronNotification.service.js";
import { STRON_FORMATS } from "./stronFormats.service.js";
import { computeMoneySplit } from "../../../utils/stronMoney.util.js";
import { dayKey, addIstDays } from "../../../utils/stronTime.util.js";
import {
  resolveRegistrationCouponDiscount,
  validateParticipantInfoAnswers,
} from "../../../utils/stronParticipantInfo.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { logger } from "../../../utils/logger.util.js";
import type { EventDoc, TransactionDoc, RegistrationDoc, IStronParticipation } from "../types/index.js";
import {
  FREE_TICKET_MARKER,
  FREE_EVENT_MARKER,
  ACTIVE_PARTICIPATION_STATUSES,
} from "../../../constants/index.js";


const asEventDoc = (event: unknown): EventDoc => event as unknown as EventDoc;

const generateQrCodePayload = ({
  ticketNumber,
  uid,
  eventKey,
}: ServiceParams & { ticketNumber: string; uid: string; eventKey: string }) =>
  `STRON|${ticketNumber}|${eventKey}|${uid}`;

const labelLooksFree = (label: unknown) => {
  const value = String(label || "").trim();
  if (!value) return false;
  if (/^free(\b|[_\s-]|$)/i.test(value)) return true;
  return /free\s+(entry|external|registration|ticket)/i.test(value);
};

/** True for ₹0 tickets and legacy apidev free placeholders (₹1 + Free label / markers). */
const ticketIsFree = (ticket: ServiceParams, event: EventDoc) => {
  const price = Number(ticket?.price);
  if (Number.isFinite(price) && price <= 0) return true;
  if (String(ticket?.benefits || "").includes(FREE_TICKET_MARKER)) return true;
  if (labelLooksFree(ticket?.label)) return true;
  // Legacy: ₹1 placeholder stamped as free
  if (price === 1 && labelLooksFree(ticket?.label)) return true;
  if (String(event?.description || "").includes(FREE_EVENT_MARKER)) return true;
  if ((event?.rules || []).some((rule: unknown) => String(rule).includes(FREE_EVENT_MARKER))) {
    return true;
  }
  return false;
};

const generateTicketNumber = () =>
  `TKT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
export const isStronTransaction = (transaction: ServiceParams) =>
  transaction?.listingType === "stron_managed";


const resolveTicket = (event: EventDoc, ticketTypeId: unknown) => {
  if (!ticketTypeId) {
    return (event.ticketTypes as ServiceParams[])?.[0] || null;
  }
  return (
    (event.ticketTypes as ServiceParams[])?.find(
      (t: ServiceParams) => t.id === String(ticketTypeId),
    ) || null
  );
};

// Build the format-specific fields for a new participation.
const buildFormatParticipation = (
  event: EventDoc,
  ticket: ServiceParams,
  enrolledAt: Date,
) => {
  if (event.format === STRON_FORMATS.MARATHON) {
    const deadline = addIstDays(enrolledAt, ticket.days || event.durationDays || 1);
    const eventEndDate = event.endDate ? new Date(event.endDate) : null;
    const boundedDeadline = eventEndDate && deadline > eventEndDate ? eventEndDate : deadline;
    return {
      targetSteps: ticket.targetSteps,
      distanceKm: ticket.distanceKm,
      daysAllowed: ticket.days,
      deadlineDayKey: dayKey(boundedDeadline),
    };
  }

  if (event.format === STRON_FORMATS.STEP_CHALLENGE) {
    return {
      requiredDays: event.successfulDaysRequired,
      dailyStepTarget: ticket.dailyStepTarget,
    };
  }
  return {};
};

/** ₹0 tickets skip Razorpay and claim a seat immediately. */
const claimFreeParticipation = async ({
  uid,
  event,
  ticket,
  currentStepCount = null,
  money,
  participantInfo = [],
  couponCode = null,
}: ServiceParams & {
  uid: string;
  event: EventDoc;
  ticket: ServiceParams;
  currentStepCount?: number | null;
  money: ServiceParams;
  participantInfo?: { field: string; value: string }[];
  couponCode?: string | null;
}) => {
  const eventKey = event.key;
  if (!eventKey) {
    throw codedError("validation_error", "Event key is required.");
  }

  // Idempotent retry: a prior attempt may have finished (or partially finished).
  const existingParticipation = await StronParticipation.findOne({
    uid,
    eventKey,
    status: { $in: ACTIVE_PARTICIPATION_STATUSES },
  });
  if (existingParticipation) {
    return {
      free: true,
      orderId: null as null,
      amount: 0,
      currency: "INR",
      key: "",
      eventKey,
      ticketTypeId: existingParticipation.ticketTypeId || ticket.id,
      breakdown: money,
      participation: existingParticipation,
      ticketNumber: existingParticipation.ticketNumber,
    };
  }

  const existingSuccessReg = await Registration.findOne({
    uid,
    eventKey,
    paymentStatus: "Success",
    registrationStatus: "Confirmed",
  });
  if (existingSuccessReg?.ticketNumber) {
    // Registration succeeded earlier but participation insert may have failed — finish it.
    let transaction = existingSuccessReg.paymentId
      ? await Transaction.findById(existingSuccessReg.paymentId)
      : await Transaction.findOne({
          uid,
          eventKey,
          razorpayOrderId: existingSuccessReg.razorpayOrderId,
        });
    if (!transaction && existingSuccessReg.razorpayOrderId) {
      transaction = await Transaction.create({
        uid,
        eventKey,
        planId: ticket.id,
        registrationId: existingSuccessReg._id,
        amount: 0,
        currency: "INR",
        razorpayOrderId: `${existingSuccessReg.razorpayOrderId}_p`,
        status: "captured",
        receipt: existingSuccessReg.razorpayOrderId,
        description: `Free STRON ticket for ${event.title}`,
        ticketPrice: money.ticketPrice,
        gatewayFee: 0,
        platformCommission: 0,
        organizerNet: 0,
        listingType: "stron_managed",
      });
      existingSuccessReg.paymentId = transaction._id;
      await existingSuccessReg.save();
    }

    const enrolledAt = existingSuccessReg.updatedAt || new Date();
    const user = await UserModel.findOne({ uid }).lean();
    const userSteps = Math.max(0, Number(user?.todaysStepCount || 0));
    const regSteps = Number.isFinite(Number(existingSuccessReg.currentStepCount))
      ? Number(existingSuccessReg.currentStepCount)
      : 0;
    const baselineSteps = Math.max(userSteps, regSteps);

    const participation = await StronParticipation.create({
      uid,
      eventKey,
      format: event.format,
      organizerUid: event.organizerUid,
      ticketTypeId: ticket.id,
      ticketLabel: ticket.label || null,
      transactionId: transaction?._id || null,
      razorpayOrderId: existingSuccessReg.razorpayOrderId,
      ticketNumber: existingSuccessReg.ticketNumber,
      qrCode: existingSuccessReg.qrCode,
      ticketPrice: 0,
      gatewayFee: 0,
      totalCharged: 0,
      platformCommission: 0,
      organizerNet: 0,
      status: event.status === "live" ? "active" : "registered",
      enrolledAt,
      activatedAt: event.status === "live" ? enrolledAt : null,
      baselineSteps,
      baselineDayKey: dayKey(enrolledAt),
      participantInfo: existingSuccessReg.participantInfo || participantInfo,
      couponCode: existingSuccessReg.couponCode || couponCode,
      couponDiscount: existingSuccessReg.couponDiscount || money.couponDiscount || 0,
      ...buildFormatParticipation(event, ticket, enrolledAt),
    });

    trackEvent(ANALYTICS_EVENTS.STRON_TICKET_PURCHASED, {
      user_id: uid,
      event_key: eventKey,
      ticket_type_id: ticket.id,
      is_free: true,
      amount: 0,
    });

    return {
      free: true,
      orderId: null as null,
      amount: 0,
      currency: "INR",
      key: "",
      eventKey,
      ticketTypeId: ticket.id,
      breakdown: money,
      participation,
      ticketNumber: existingSuccessReg.ticketNumber,
    };
  }

  const claimed = await StronEvent.findOneAndUpdate(
    {
      key: eventKey,
      status: { $in: ["published", "live"] },
      $or: [
        { capacity: null },
        { $expr: { $lt: ["$registrationCount", "$capacity"] } },
      ],
    },
    { $inc: { registrationCount: 1 } },
    { new: true },
  );
  if (!claimed) {
    throw codedError("sold_out", "This event is sold out.");
  }

  const rollbackSeat = async () => {
    try {
      await StronEvent.updateOne(
        { key: eventKey, registrationCount: { $gt: 0 } },
        { $inc: { registrationCount: -1 }, $set: { soldOut: false } },
      );
      await StronEvent.updateOne(
        { key: eventKey, "ticketTypes.id": ticket.id, "ticketTypes.soldCount": { $gt: 0 } },
        { $inc: { "ticketTypes.$.soldCount": -1 } },
      );
    } catch (rollbackError: unknown) {
      logger.warn(
        "[stronManaged] free ticket seat rollback failed:",
        getErrorMessage(rollbackError),
      );
    }
  };

  try {
    await StronEvent.updateOne(
      { key: eventKey, "ticketTypes.id": ticket.id },
      { $inc: { "ticketTypes.$.soldCount": 1 } },
    );
    if (claimed.capacity != null && claimed.registrationCount >= claimed.capacity) {
      await StronEvent.updateOne({ key: eventKey }, { $set: { soldOut: true } });
    }

    const ticketNumber = generateTicketNumber();
    const qrCode = generateQrCodePayload({ ticketNumber, uid, eventKey });
    // Keep unique under the 40-char razorpayOrderId index — never truncate uid+timestamp.
    const freeOrderId = `free_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    let registration = await Registration.findOne({
      uid,
      eventKey,
      paymentStatus: "Pending",
    });
    if (!registration) {
      registration = new Registration({ uid, eventKey });
    }
    const parsedSteps = Number.isFinite(Number(currentStepCount))
      ? Number(currentStepCount)
      : null;
    registration.planId = ticket.id;
    registration.currentStepCount = parsedSteps ?? registration.currentStepCount;
    registration.razorpayOrderId = freeOrderId;
    registration.paymentStatus = "Success";
    registration.registrationStatus = "Confirmed";
    registration.ticketNumber = ticketNumber;
    registration.qrCode = qrCode;
    registration.participantInfo = participantInfo as typeof registration.participantInfo;
    registration.couponCode = couponCode;
    registration.couponDiscount = money.couponDiscount || 0;
    await registration.save();

    const transaction = await Transaction.create({
      uid,
      eventKey,
      planId: ticket.id,
      registrationId: registration._id,
      amount: 0,
      currency: "INR",
      razorpayOrderId: freeOrderId,
      status: "captured",
      receipt: freeOrderId,
      description: `Free STRON ticket for ${event.title}`,
      ticketPrice: money.ticketPrice,
      gatewayFee: 0,
      platformCommission: 0,
      organizerNet: 0,
      listingType: "stron_managed",
    });

    registration.paymentId = transaction._id;
    await registration.save();

    const enrolledAt = new Date();
    const user = await UserModel.findOne({ uid }).lean();
    const userSteps = Math.max(0, Number(user?.todaysStepCount || 0));
    const regSteps = Number.isFinite(Number(registration?.currentStepCount))
      ? Number(registration.currentStepCount)
      : 0;
    const baselineSteps = Math.max(userSteps, regSteps);

    const participation = await StronParticipation.create({
      uid,
      eventKey,
      format: event.format,
      organizerUid: event.organizerUid,
      ticketTypeId: ticket.id,
      ticketLabel: ticket.label || null,
      transactionId: transaction._id,
      razorpayOrderId: freeOrderId,
      ticketNumber,
      qrCode,
      ticketPrice: 0,
      gatewayFee: 0,
      totalCharged: 0,
      platformCommission: 0,
      organizerNet: 0,
      status: event.status === "live" ? "active" : "registered",
      enrolledAt,
      activatedAt: event.status === "live" ? enrolledAt : null,
      baselineSteps,
      baselineDayKey: dayKey(enrolledAt),
      participantInfo,
      couponCode,
      couponDiscount: money.couponDiscount || 0,
      ...buildFormatParticipation(event, ticket, enrolledAt),
    });

    try {
      await notifyUser(
        uid,
        `You're in · ${event.title}`,
        `Free ticket confirmed for ${event.title}. Ticket: ${ticketNumber}`,
        { eventKey, tag: "Ticket Confirmed" },
      );
    } catch (notifyError: unknown) {
      logger.warn("[stronManaged] free ticket push failed:", getErrorMessage(notifyError));
    }

    return {
      free: true,
      orderId: null as null,
      amount: 0,
      currency: "INR",
      key: "",
      eventKey,
      ticketTypeId: ticket.id,
      breakdown: money,
      participation,
      ticketNumber,
    };
  } catch (error: unknown) {
    await rollbackSeat();
    throw error;
  }
};

// Create a Razorpay order for a ticket and persist the pending Registration + Transaction.
export const createParticipationOrder = async ({
  uid,
  eventKey,
  ticketTypeId = null,
  currentStepCount = null,
  participantInfo: participantInfoRaw = null,
  couponCode: couponCodeRaw = null,
}: ServiceParams & {
  uid: string;
  eventKey: string;
  ticketTypeId?: string | null;
  currentStepCount?: number | null;
  participantInfo?: unknown;
  couponCode?: string | null;
}) => {
  const event = await getEventByKey(eventKey);

  const eventDoc = asEventDoc(event);

  // Organizers manage the event; they cannot buy their own tickets.
  if (eventDoc.organizerUid && eventDoc.organizerUid === uid) {
    throw codedError(
      "organizer_cannot_enroll",
      "Organizers cannot enroll in their own event. Use another account to participate.",
    );
  }

  if (eventDoc.soldOut) {
    throw codedError("sold_out", "This event is sold out.");
  }
  if (!isRegistrationOpen(eventDoc)) {
    throw codedError("registration_closed", "Registration is closed for this event.");
  }

  const existing = await StronParticipation.findOne({
    uid,
    eventKey,
    status: { $in: ACTIVE_PARTICIPATION_STATUSES },
  });
  if (existing) {
    throw codedError("already_registered", "You are already registered for this event.");
  }

  const ticket = resolveTicket(eventDoc, ticketTypeId);
  if (!ticket) {
    throw codedError("invalid_field", "Selected ticket type does not exist.");
  }

  const participantInfo = validateParticipantInfoAnswers(
    eventDoc.participantInfoFields,
    participantInfoRaw,
  );

  const basePrice = ticketIsFree(ticket, eventDoc) ? 0 : Number(ticket.price) || 0;
  let couponCode = null;
  let couponDiscount = 0;
  if (couponCodeRaw && basePrice > 0) {
    const coupon = resolveRegistrationCouponDiscount(
      eventDoc,
      couponCodeRaw,
      basePrice,
    );
    couponCode = coupon.code;
    couponDiscount = coupon.discountRupees;
  }

  const money = computeMoneySplit(basePrice, couponDiscount);
  if (ticketIsFree(ticket, eventDoc) || !(money.totalCharged > 0)) {
    return claimFreeParticipation({
      uid,
      event: eventDoc,
      ticket,
      currentStepCount,
      money: computeMoneySplit(0, 0),
      participantInfo,
      couponCode,
    });
  }

  const amountPaise = Math.round(money.totalCharged * 100);
  const receipt = `sm_${uid}_${Date.now()}`.substring(0, 40);
  const order = await createOrder(amountPaise, "INR", receipt, {
    eventKey,
    uid,
    ticketTypeId: ticket.id,
    listingType: "stron_managed",
  });

  const parsedSteps = Number.isFinite(Number(currentStepCount))
    ? Number(currentStepCount)
    : null;

  let registration = await Registration.findOne({
    uid,
    eventKey,
    paymentStatus: "Pending",
  });
  if (!registration) {
    registration = new Registration({ uid, eventKey });
  }
  registration.planId = ticket.id;
  registration.currentStepCount = parsedSteps ?? registration.currentStepCount;
  registration.razorpayOrderId = order.id;
  registration.paymentStatus = "Pending";
  registration.registrationStatus = "Pending";
  registration.participantInfo = participantInfo as typeof registration.participantInfo;
  registration.couponCode = couponCode;
  registration.couponDiscount = couponDiscount;
  await registration.save();

  const transaction = await Transaction.create({
    uid,
    eventKey,
    planId: ticket.id,
    registrationId: registration._id,
    amount: money.totalCharged,
    currency: "INR",
    razorpayOrderId: order.id,
    status: "created",
    receipt,
    description: `STRON ticket for ${eventDoc.title}`,
    ticketPrice: money.ticketPrice,
    gatewayFee: money.gatewayFee,
    platformCommission: money.platformCommission,
    organizerNet: money.organizerNet,
    listingType: "stron_managed",
  });

  registration.paymentId = transaction._id;
  await registration.save();

  return {
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    key: process.env.RAZORPAY_KEY_ID || "",
    eventKey,
    ticketTypeId: ticket.id,
    breakdown: money,
    couponCode,
  };
};

/** Preview / apply coupon without creating an order. */
export const validateEventRegistrationCoupon = async ({
  eventKey,
  ticketTypeId = null,
  couponCode,
}: ServiceParams & {
  eventKey: string;
  ticketTypeId?: string | null;
  couponCode: string;
}) => {
  const event = await getEventByKey(eventKey);
  const eventDoc = asEventDoc(event);
  const ticket = resolveTicket(eventDoc, ticketTypeId);
  if (!ticket) {
    throw codedError("invalid_field", "Selected ticket type does not exist.");
  }
  const basePrice = ticketIsFree(ticket, eventDoc) ? 0 : Number(ticket.price) || 0;
  if (!(basePrice > 0)) {
    throw codedError("invalid_coupon", "Coupons cannot be applied to free tickets.");
  }
  const coupon = resolveRegistrationCouponDiscount(
    eventDoc,
    couponCode,
    basePrice,
  );
  const money = computeMoneySplit(basePrice, coupon.discountRupees);
  return {
    couponCode: coupon.code,
    discountRupees: coupon.discountRupees,
    discountPercent: coupon.discountPercent || 0,
    breakdown: money,
  };
};

// Refund a captured transaction and mark the linked registration cancelled. Idempotent.
const refundTransaction = async (
  transaction: TransactionDoc,
  registration: RegistrationDoc | null,
  reason: string,
) => {
  try {
    if (transaction.razorpayPaymentId && transaction.status !== "refunded") {
      await refundPayment(
        String(transaction.razorpayPaymentId),
        Math.round(Number(transaction.amount || 0) * 100),
        { reason },
      );
    }
  } catch (refundError: unknown) {
    logger.warn("[stronManaged] auto-refund failed:", getErrorMessage(refundError));
  }
  transaction.refundAmount = Number(transaction.amount || 0);
  transaction.refundStatus = "pending";
  transaction.status = "refunded";
  await transaction.save?.();

  if (registration) {
    registration.paymentStatus = "Refunded";
    registration.registrationStatus = "Cancelled";
    await registration.save?.();
  }
};

export const getParticipationForTransaction = async (transaction: ServiceParams) =>
  StronParticipation.findOne({ transactionId: transaction._id });

// Called from confirmRazorpayPayment once a STRON ticket payment is captured.
// The shared Registration already carries the ticket/QR; here we claim a seat and
// create the participation, or auto-refund when no seat can be honored.
export const finalizeParticipation = async ({
  transaction,
  registration,
}: ServiceParams & { transaction: TransactionDoc; registration: RegistrationDoc }) => {
  const eventKey = transaction.eventKey;

  const alreadyDone = await StronParticipation.findOne({ transactionId: transaction._id });
  if (alreadyDone) {
    return { alreadyProcessed: true, participation: alreadyDone, registration };
  }

  const event = await StronEvent.findOne({ key: eventKey });
  if (!event) {
    await refundTransaction(transaction, registration, "event_missing");
    return { refunded: true, participation: null as null, registration };
  }

  // Duplicate: the user already secured a seat via another payment -> refund this one.
  const existingActive = await StronParticipation.findOne({
    uid: transaction.uid,
    eventKey,
    status: { $in: ACTIVE_PARTICIPATION_STATUSES },
  });
  if (existingActive) {
    await refundTransaction(transaction, registration, "duplicate_registration");
    return { refunded: true, duplicate: true, participation: existingActive, registration };
  }

  // Atomically claim one seat only while registration capacity remains.
  const claimed = await StronEvent.findOneAndUpdate(
    {
      key: eventKey,
      status: { $in: ["published", "live"] },
      $or: [
        { capacity: null },
        { $expr: { $lt: ["$registrationCount", "$capacity"] } },
      ],
    },
    { $inc: { registrationCount: 1 } },
    { new: true },
  );
  if (!claimed) {
    await refundTransaction(transaction, registration, "sold_out_or_closed");
    return { refunded: true, soldOut: true, participation: null as null, registration };
  }

  const eventDoc = asEventDoc(event);
  const ticket = resolveTicket(eventDoc, transaction.planId);
  if (ticket) {
    await StronEvent.updateOne(
      { key: eventKey, "ticketTypes.id": ticket.id },
      { $inc: { "ticketTypes.$.soldCount": 1 } },
    );
  }
  // Flip soldOut when the final seat has just been claimed.
  if (claimed.capacity != null && claimed.registrationCount >= claimed.capacity) {
    await StronEvent.updateOne({ key: eventKey }, { $set: { soldOut: true } });
  }

  const enrolledAt = new Date();
  const user = await UserModel.findOne({ uid: transaction.uid }).lean();
  const baselineSteps = Number.isFinite(Number(registration?.currentStepCount))
    ? Number(registration.currentStepCount)
    : Number(user?.todaysStepCount || 0);

  const participation = await StronParticipation.create({
    uid: transaction.uid,
    eventKey,
    format: eventDoc.format,
    organizerUid: eventDoc.organizerUid,
    ticketTypeId: ticket?.id || transaction.planId,
    ticketLabel: ticket?.label || null,
    transactionId: transaction._id,
    razorpayOrderId: transaction.razorpayOrderId,
    ticketNumber: registration?.ticketNumber || null,
    qrCode: registration?.qrCode || null,
    ticketPrice: transaction.ticketPrice ?? ticket?.price ?? 0,
    gatewayFee: transaction.gatewayFee ?? 0,
    totalCharged: transaction.amount ?? 0,
    platformCommission: transaction.platformCommission ?? 0,
    organizerNet: transaction.organizerNet ?? 0,
    status: eventDoc.status === "live" ? "active" : "registered",
    enrolledAt,
    activatedAt: eventDoc.status === "live" ? enrolledAt : null,
    baselineSteps,
    baselineDayKey: dayKey(enrolledAt),
    participantInfo: Array.isArray(registration?.participantInfo)
      ? registration.participantInfo
      : [],
    couponCode: registration?.couponCode || null,
    couponDiscount: Number(registration?.couponDiscount) || 0,
    ...buildFormatParticipation(eventDoc, (ticket || {}) as ServiceParams, enrolledAt),
  });

  trackEvent(ANALYTICS_EVENTS.STRON_TICKET_PURCHASED, {
    user_id: transaction.uid,
    event_key: eventKey,
    ticket_type_id: participation.ticketTypeId,
    is_free: false,
    amount: transaction.amount || 0,
    order_id: transaction.razorpayOrderId,
  });

  try {
    const notifyUid = transaction.uid;
    if (notifyUid) {
      await notifyUser(
        notifyUid,
        `You're in · ${event.title}`,
        `Ticket confirmed for ${eventDoc.title}. Ticket: ${participation.ticketNumber || "confirmed"}`,
        { eventKey: eventDoc.key, tag: "Ticket Confirmed" },
      );
    }
  } catch (notifyError: unknown) {
    logger.warn("[stronManaged] ticket push failed:", getErrorMessage(notifyError));
  }

  return { alreadyProcessed: false, participation, registration };
};

// Participant-facing view of their own participation for an event.
/** Latest non-empty participantInfo from a prior registration (for checkout prefill). */
export const getLatestParticipantInfoPrefill = async (
  uid: string,
): Promise<{ field: string; value: string }[]> => {
  if (!uid) return [];
  const participation = await StronParticipation.findOne({
    uid,
    status: { $nin: ["cancelled", "refunded"] },
    "participantInfo.0": { $exists: true },
  })
    .sort({ enrolledAt: -1 })
    .select("participantInfo")
    .lean();

  return Array.isArray(participation?.participantInfo)
    ? participation.participantInfo
    : [];
};

export const getMyParticipation = async ({
  uid,
  eventKey,
}: ServiceParams & { uid: string; eventKey: string }) =>
  StronParticipation.findOne({ uid, eventKey });

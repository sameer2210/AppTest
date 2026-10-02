// Event lifecycle side effects: refunds on cancellation and the published->live->completed
// transitions used by the scheduler. Kept separate from eventService to avoid import cycles
// (registrationService already depends on eventService).

import { Transaction } from "../../payments-payouts/index.js";
import { Registration } from "../../catalog-events/index.js";
import { refundPayment } from "../../../services/razorpay.service.js";
import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { notifyEventParticipants, notifyUser } from "./stronNotification.service.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { dayKey } from "../../../utils/stronTime.util.js";
import { issueRewardsForEvent } from "./stronReward.service.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { logger } from "../../../utils/logger.util.js";

// Refund one captured transaction, idempotently, and cancel its participation.
const refundOne = async (transaction: ServiceParams, reason: string) => {
  if (transaction.status === "refunded") {
    return false;
  }
  try {
    if (transaction.razorpayPaymentId) {
      await refundPayment(
        transaction.razorpayPaymentId,
        Math.round(transaction.amount * 100),
        { reason },
      );
    }
    transaction.refundAmount = transaction.amount;
    transaction.refundStatus = "pending";
    transaction.status = "refunded";
    await transaction.save();

    await Registration.updateOne(
      { razorpayOrderId: transaction.razorpayOrderId },
      { $set: { paymentStatus: "Refunded", registrationStatus: "Cancelled" } },
    );
    await StronParticipation.updateOne(
      { transactionId: transaction._id },
      { $set: { status: "refunded" } },
    );
    return true;
  } catch (error: unknown) {
    logger.warn(
      "[stronManaged] cancellation refund failed:",
      transaction._id?.toString(),
      getErrorMessage(error),
    );
    return false;
  }
};

// Refund every captured ticket for an event and notify participants. Idempotent.
export const refundAndNotifyCancellation = async (event: ServiceParams) => {
  const captured = await Transaction.find({
    eventKey: event.key,
    listingType: "stron_managed",
    status: "captured",
  });

  let refundedCount = 0;
  for (const transaction of captured) {
    const done = await refundOne(transaction, `event_cancelled:${event.key}`);
    if (done) refundedCount += 1;
  }

  // Expire any still-pending orders so they cannot be captured after cancellation.
  await Transaction.updateMany(
    { eventKey: event.key, listingType: "stron_managed", status: { $in: ["created", "authorized"] } },
    { $set: { status: "failed" } },
  );

  await notifyEventParticipants(
    event.key,
    "Event cancelled",
    `${event.title} was cancelled. If you paid for a ticket, your refund will be processed within 7 working days.`,
    { tag: "Event Cancelled" },
  );

  return { refundedCount };
};

// Promote a published event to live once its start day arrives.
export const markLive = async (event: ServiceParams) => {
  if (event.status !== "published") {
    return event;
  }
  event.status = "live";
  event.liveAt = new Date();
  await event.save();

  const now = new Date();
  const today = dayKey(now);
  const registered = await StronParticipation.find({
    eventKey: event.key,
    status: "registered",
  });
  if (registered.length) {
    const uids = registered.map((p) => p.uid);
    const users = await UserModel.find({ uid: { $in: uids } })
      .select("uid todaysStepCount")
      .lean();
    const stepsByUid = new Map(
      users.map((u) => [u.uid, Math.max(0, Number(u.todaysStepCount || 0))]),
    );
    // Refresh baseline at activation so pre-start walking does not count.
    await Promise.all(
      registered.map((p) => {
        p.status = "active";
        p.activatedAt = now;
        p.baselineSteps = stepsByUid.get(p.uid) || 0;
        p.baselineDayKey = today;
        return p.save();
      }),
    );
  }

  trackEvent(ANALYTICS_EVENTS.STRON_EVENT_LIVE, { event_key: event.key });
  await notifyEventParticipants(
    event.key,
    "It's on!",
    `${event.title} is now live. Good luck!`,
    { tag: "Event Started" },
  );
  return event;
};

// Freeze a live event as completed once its end date passes.
export const markCompleted = async (event: ServiceParams) => {
  if (event.status !== "live") {
    return event;
  }
  event.status = "completed";
  event.completedAt = new Date();
  await event.save();

  // Expire unfinished participants; ranking + medals/certificates happen in issueRewardsForEvent.
  await StronParticipation.updateMany(
    { eventKey: event.key, status: { $in: ["registered", "active"] } },
    { $set: { status: "expired", expiredAt: new Date() } },
  );

  try {
    await issueRewardsForEvent(event);
  } catch (error: unknown) {
    logger.warn(
      "[stronManaged] reward issue failed:",
      event.key,
      getErrorMessage(error),
    );
  }

  trackEvent(ANALYTICS_EVENTS.STRON_EVENT_COMPLETED, { event_key: event.key });
  await notifyUser(
    event.organizerUid,
    "Event completed",
    `${event.title} has finished. Settlement will follow within a few business days.`,
    { eventKey: event.key, tag: "Event Completed" },
  );
  await notifyEventParticipants(
    event.key,
    "Event completed",
    `${event.title} has finished. Check My Rewards for your medal & certificate!`,
    { tag: "Event Completed" },
  );
  return event;
};

// Periodic sweep: promote published events whose start day has arrived, and complete live
// events whose end day has passed. Safe to run frequently; each transition is idempotent.
export const sweepLifecycle = async () => {
  const now = new Date();
  let promoted = 0;
  let completed = 0;

  const toGoLive = await StronEvent.find({
    status: "published",
    startDate: { $lte: now },
  });
  for (const event of toGoLive) {
    await markLive(event);
    promoted += 1;
  }

  const toComplete = await StronEvent.find({
    status: "live",
    endDate: { $lte: now },
  });
  for (const event of toComplete) {
    await markCompleted(event);
    completed += 1;
  }

  return { promoted, completed };
};

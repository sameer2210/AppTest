import mongoose from "mongoose";
import WhatsappReminder from "../models/whatsappReminder.model.js";
import WhatsappMessage from "../models/whatsappMessage.model.js";
import WhatsappContact from "../models/whatsappContact.model.js";
import Member from "../models/member.model.js";
import Membership from "../models/membership.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Business from "../models/business.model.js";
import Payment from "../models/payment.model.js";
import { toWhatsappE164 } from "../../../services/whatsapp/phone.util.js";
import { getWhatsappProvider } from "../../../services/whatsapp/index.js";
import {
  getWhatsappTemplateLanguage,
  getWhatsappTemplateName,
  buildPublicPayUrl,
} from "../../../constants/infra.constants.js";
import {
  WHATSAPP_DEFAULT_TIMEZONE,
  WHATSAPP_QUEUE_DEFAULTS,
  getWhatsappJobAttempts,
  isRetryableWhatsappError,
  type WhatsappOutboundType,
} from "../../../constants/whatsapp.constants.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import { logger } from "../../../utils/logger.util.js";
import { delayMsUntil } from "../../../utils/whatsappSchedule.util.js";
import {
  enqueueOutgoingWhatsapp,
  enqueueReminderJob,
  removeReminderJob,
} from "../../../queues/producers.js";
import type { OutgoingWhatsappJobData } from "../../../queues/types.js";
import { getActiveWhatsappAccount } from "../../../services/whatsapp/whatsappAccount.service.js";

const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(String(id));
};

const formatInr = (amount: number) => `₹${Number(amount || 0).toLocaleString("en-IN")}`;

const bodyComponents = (values: string[]) => [
  {
    type: "body" as const,
    parameters: values.map((text) => ({ type: "text" as const, text: text || "-" })),
  },
];

export type CreateReminderInput = {
  businessId: string | mongoose.Types.ObjectId;
  memberId: string | mongoose.Types.ObjectId;
  type: WhatsappOutboundType;
  body: string;
  idempotencyKey: string;
  scheduledAt?: Date;
  timezone?: string;
  dayOffset?: number | null;
};

const resolveTemplateVariables = async ({
  businessId,
  memberId,
  type,
  body,
  dayOffset,
}: {
  businessId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  type: WhatsappOutboundType;
  body: string;
  dayOffset?: number | null;
}) => {
  const [business, member] = await Promise.all([
    Business.findById(businessId).select("businessName slug").lean(),
    Member.findById(memberId).select("name phone").lean(),
  ]);
  const gymName = String(business?.businessName || "STRON");
  const slug = String(business?.slug || "");
  const memberName = String(member?.name || "");
  const to = toWhatsappE164(member?.phone);

  const membership = await Membership.findOne({ businessId, memberId })
    .sort({ updatedAt: -1 })
    .select("planId finalAmount")
    .lean();
  const plan = membership?.planId
    ? await MembershipPlan.findById(membership.planId).select("name").lean()
    : null;
  const latestPayment = await Payment.findOne({
    businessId,
    memberId,
    status: "SUCCESS",
  })
    .sort({ paidAt: -1 })
    .select("finalAmount amount")
    .lean();

  const payUrl =
    type === "AUTOPAY_FAILED"
      ? buildPublicPayUrl(slug, String(memberId), "autoRenew=1")
      : type === "MANUAL_PAYMENT"
        ? buildPublicPayUrl(slug, String(memberId))
        : "";

  const templateName = getWhatsappTemplateName(
    type === "BROADCAST" || type === "PAYMENT_RECEIPT" || type === "AUTOPAY_FAILED" || type === "MANUAL_PAYMENT"
      ? type
      : "BROADCAST",
    dayOffset,
  );
  const templateLanguage = getWhatsappTemplateLanguage();
  const templateVariables =
    type === "PAYMENT_RECEIPT"
      ? [gymName, memberName, formatInr(Number(latestPayment?.finalAmount ?? latestPayment?.amount ?? 0))]
      : type === "BROADCAST"
        ? [gymName, body]
        : [memberName, String(plan?.name || "your plan"), gymName, payUrl || "-"];

  return { to, gymName, memberName, templateName, templateLanguage, templateVariables, payUrl };
};

const upsertOutboundContact = async ({
  phoneE164,
  memberId,
  businessId,
}: {
  phoneE164: string;
  memberId: mongoose.Types.ObjectId;
  businessId: mongoose.Types.ObjectId;
}) => {
  await WhatsappContact.findOneAndUpdate(
    { phoneE164 },
    {
      $set: {
        memberId,
        businessId,
        lastOutboundAt: new Date(),
        waId: phoneE164,
      },
      $setOnInsert: { optIn: true, phoneE164 },
    },
    { upsert: true },
  );
};

export const createAndEnqueueReminder = async (input: CreateReminderInput) => {
  const businessId = toObjectId(input.businessId);
  const memberId = toObjectId(input.memberId);
  const timezone = input.timezone || WHATSAPP_DEFAULT_TIMEZONE;
  const scheduledAt = input.scheduledAt || new Date();
  const context = await resolveTemplateVariables({
    businessId,
    memberId,
    type: input.type,
    body: input.body,
    dayOffset: input.dayOffset,
  });

  const account = await getActiveWhatsappAccount();
  const invalidPhone = !context.to;

  const existing = await WhatsappReminder.findOne({ idempotencyKey: input.idempotencyKey }).lean();
  if (existing) {
    return { reminder: existing, message: null, duplicate: true, failed: false };
  }

  try {
    const reminder = await WhatsappReminder.create({
      businessId,
      memberId,
      to: context.to || "invalid",
      type: input.type,
      templateName: context.templateName,
      templateLanguage: context.templateLanguage,
      templateVariables: context.templateVariables,
      dayOffset: input.dayOffset ?? null,
      scheduledAt,
      timezone,
      status: invalidPhone ? "FAILED" : "SCHEDULED",
      failureReason: invalidPhone ? "invalid_phone" : null,
      retryPolicy: {
        maxAttempts: WHATSAPP_QUEUE_DEFAULTS.JOB_ATTEMPTS,
        backoffMs: WHATSAPP_QUEUE_DEFAULTS.BACKOFF_MS,
      },
      idempotencyKey: input.idempotencyKey,
    });

    const message = await WhatsappMessage.create({
      businessId,
      memberId,
      accountId: account?._id || null,
      reminderId: reminder._id,
      type: input.type,
      direction: "OUTBOUND",
      kind: "TEMPLATE",
      templateName: context.templateName,
      to: context.to,
      body: input.body.slice(0, 4096),
      status: invalidPhone ? "FAILED" : "QUEUED",
      failureReason: invalidPhone ? "invalid_phone" : null,
      creditsUsed: 1,
    });

    reminder.messageId = message._id;
    if (invalidPhone) {
      await reminder.save();
      return { reminder, message, duplicate: false, failed: true };
    }

    const delay = delayMsUntil(scheduledAt);
    const queued = await enqueueReminderJob(String(reminder._id), delay);
    reminder.jobId = queued.id;
    reminder.status = "QUEUED";
    await reminder.save();
    if (context.to) {
      await upsertOutboundContact({ phoneE164: context.to, memberId, businessId });
    }
    return { reminder, message, duplicate: false, failed: false };
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      const existing = await WhatsappReminder.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      return { reminder: existing, message: null, duplicate: true, failed: false };
    }
    throw error;
  }
};

export const cancelPendingPaymentReminders = async ({
  businessId,
  memberId,
}: {
  businessId: string | mongoose.Types.ObjectId;
  memberId: string | mongoose.Types.ObjectId;
}) => {
  const rows = await WhatsappReminder.find({
    businessId: toObjectId(businessId),
    memberId: toObjectId(memberId),
    type: { $in: ["MANUAL_PAYMENT", "AUTOPAY_FAILED"] },
    status: { $in: ["SCHEDULED", "QUEUED"] },
  }).lean();
  for (const row of rows) {
    await WhatsappReminder.updateOne({ _id: row._id }, { $set: { status: "CANCELLED" } });
    await removeReminderJob(String(row._id));
  }
  return { cancelled: rows.length };
};

const outgoingPayloadForReminder = (reminder: {
  _id: unknown;
  messageId?: unknown;
  to: string;
  businessId: unknown;
  memberId: unknown;
  templateName: string;
  templateLanguage: string;
  templateVariables?: string[];
}): OutgoingWhatsappJobData | null => {
  const messageId = reminder.messageId ? String(reminder.messageId) : null;
  if (!messageId) return null;
  return {
    messageId,
    reminderId: String(reminder._id),
    to: reminder.to,
    businessId: String(reminder.businessId),
    memberId: String(reminder.memberId),
    kind: "template",
    body: (reminder.templateVariables || []).join(" "),
    template: {
      name: reminder.templateName,
      language: reminder.templateLanguage,
      components: bodyComponents(reminder.templateVariables || []),
    },
  };
};

export const processReminderJob = async (reminderId: string) => {
  const reminder = await WhatsappReminder.findById(reminderId);
  if (!reminder) return;
  if (["CANCELLED", "SENT", "DELIVERED", "READ", "FAILED"].includes(String(reminder.status))) {
    return;
  }

  if (String(reminder.status) === "SENDING") {
    const payload = outgoingPayloadForReminder(reminder);
    if (payload) await enqueueOutgoingWhatsapp(payload);
    return;
  }

  const claimed = await WhatsappReminder.findOneAndUpdate(
    { _id: reminder._id, status: { $in: ["SCHEDULED", "QUEUED"] } },
    { $set: { status: "SENDING" }, $inc: { attempts: 1 } },
    { new: true },
  );
  if (!claimed) return;

  const payload = outgoingPayloadForReminder(claimed);
  if (!payload) {
    await WhatsappReminder.updateOne(
      { _id: claimed._id },
      { $set: { status: "FAILED", failureReason: "missing_message" } },
    );
    return;
  }
  await enqueueOutgoingWhatsapp(payload);
};

export const processOutgoingJob = async (
  data: OutgoingWhatsappJobData,
  meta: { attemptsMade?: number } = {},
) => {
  const message = await WhatsappMessage.findById(data.messageId);
  if (!message) return;
  if (["SENT", "DELIVERED", "READ", "FAILED"].includes(String(message.status))) return;

  if (!data.to) {
    await WhatsappMessage.updateOne(
      { _id: message._id },
      { $set: { status: "FAILED", failureReason: "invalid_phone" } },
    );
    if (data.reminderId) {
      await WhatsappReminder.updateOne(
        { _id: data.reminderId },
        { $set: { status: "FAILED", failureReason: "invalid_phone" } },
      );
    }
    return;
  }

  const result = await getWhatsappProvider().send({
    to: data.to,
    businessId: data.businessId,
    memberId: data.memberId,
    kind: data.kind,
    body: data.body,
    template: data.template,
  });

  const providerResponse = {
    ok: result.ok,
    providerMessageId: result.providerMessageId,
    errorCode: result.errorCode || null,
    errorMessage: result.errorMessage || null,
    httpStatus: result.httpStatus || null,
    rawResponse: result.rawResponse || null,
  };

  if (result.ok) {
    await WhatsappMessage.updateOne(
      { _id: message._id },
      {
        $set: {
          status: "SENT",
          providerMessageId: result.providerMessageId,
          providerResponse,
          sentAt: new Date(),
          failureReason: null,
        },
      },
    );
    if (data.reminderId) {
      await WhatsappReminder.updateOne(
        { _id: data.reminderId },
        {
          $set: {
            status: "SENT",
            providerMessageId: result.providerMessageId,
            failureReason: null,
          },
        },
      );
    }
    logger.info("[whatsapp] outgoing sent", {
      messageId: data.messageId,
      reminderId: data.reminderId || null,
      wamid: result.providerMessageId,
    });
    return;
  }

  const retryable = result.retryable ?? isRetryableWhatsappError(result.errorCode, result.httpStatus);
  const attemptsMade = Number(meta.attemptsMade) || 0;
  const exhausted =
    retryable && attemptsMade > 0 && attemptsMade >= getWhatsappJobAttempts();
  const shouldFail = !retryable || exhausted;
  const failureReason = result.errorMessage || result.errorCode || "provider_rejected";
  await WhatsappMessage.updateOne(
    { _id: message._id },
    {
      $set: {
        providerResponse,
        providerMessageId: result.providerMessageId,
        failureReason,
        ...(shouldFail ? { status: "FAILED" } : {}),
      },
    },
  );
  if (shouldFail && data.reminderId) {
    await WhatsappReminder.updateOne(
      { _id: data.reminderId },
      {
        $set: {
          status: "FAILED",
          failureReason,
          providerMessageId: result.providerMessageId,
        },
      },
    );
  }
  if (retryable) {
    throw new Error(failureReason);
  }
};

const STATUS_RANK: Record<string, number> = {
  QUEUED: 0,
  SCHEDULED: 0,
  SENDING: 1,
  SENT: 2,
  DELIVERED: 3,
  READ: 4,
  FAILED: 5,
  CANCELLED: 6,
};

const mapGraphStatus = (status: string): "SENT" | "DELIVERED" | "READ" | "FAILED" | null => {
  const value = String(status || "").toLowerCase();
  if (value === "sent") return "SENT";
  if (value === "delivered") return "DELIVERED";
  if (value === "read") return "READ";
  if (value === "failed") return "FAILED";
  return null;
};

export const applyWhatsappDeliveryStatuses = async (
  statuses: Array<{ id?: string; status?: string; errors?: Array<{ title?: string; message?: string }> }>,
) => {
  let updated = 0;
  for (const item of statuses) {
    const providerMessageId = String(item.id || "").trim();
    const next = mapGraphStatus(String(item.status || ""));
    if (!providerMessageId || !next) continue;
    const row = await WhatsappMessage.findOne({ providerMessageId }).lean();
    if (!row) continue;
    const currentRank = STATUS_RANK[String(row.status)] ?? 0;
    const nextRank = STATUS_RANK[next] ?? 0;
    if (row.status !== "FAILED" && next !== "FAILED" && nextRank < currentRank) continue;
    const failureReason =
      next === "FAILED"
        ? item.errors?.[0]?.title || item.errors?.[0]?.message || "webhook_failed"
        : row.failureReason;
    await WhatsappMessage.updateOne(
      { _id: row._id },
      {
        $set: {
          status: next,
          failureReason: failureReason ?? null,
          sentAt: next === "SENT" && !row.sentAt ? new Date() : row.sentAt,
        },
      },
    );
    await WhatsappReminder.updateOne(
      { $or: [{ providerMessageId }, { messageId: row._id }] },
      {
        $set: {
          status: next,
          failureReason: failureReason ?? null,
          providerMessageId,
        },
      },
    );
    updated += 1;
  }
  return { updated };
};

export default {
  createAndEnqueueReminder,
  cancelPendingPaymentReminders,
  processReminderJob,
  processOutgoingJob,
  applyWhatsappDeliveryStatuses,
};

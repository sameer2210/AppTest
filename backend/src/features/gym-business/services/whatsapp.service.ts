import mongoose from "mongoose";
import WhatsappWallet from "../models/whatsappWallet.model.js";
import WhatsappReminderConfig from "../models/whatsappReminderConfig.model.js";
import WhatsappMessage from "../models/whatsappMessage.model.js";
import WhatsappReminder from "../models/whatsappReminder.model.js";
import Member from "../models/member.model.js";
import Membership from "../models/membership.model.js";
import Payment from "../models/payment.model.js";
import { hasFeature } from "./entitlement.service.js";
import {
  WHATSAPP_REMINDER_DEFAULTS,
  WHATSAPP_REMINDER_TYPES,
  type WhatsappReminderType,
} from "../../../constants/index.js";
import type { WhatsappOutboundType } from "../../../constants/whatsapp.constants.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { buildPaginationMeta, getPaginationParams } from "../../../utils/pagination.js";
import { logger } from "../../../utils/logger.util.js";
import { whatsappDayKey, reminderScheduledAt } from "../../../utils/whatsappSchedule.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import type { WhatsappWalletView, WhatsappReminderConfigView } from "../types/index.js";
import {
  applyWhatsappDeliveryStatuses,
  createAndEnqueueReminder,
} from "./reminder.service.js";

const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const uniqueMemberIds = (ids: unknown[]): mongoose.Types.ObjectId[] => {
  const seen = new Set<string>();
  const result: mongoose.Types.ObjectId[] = [];
  for (const value of ids) {
    const id = String(value || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(toObjectId(id));
  }
  return result;
};

const requireEntitlement = async (businessId: unknown) => {
  const entitled = await hasFeature({
    businessId,
    featureName: "WHATSAPP_REMINDERS",
  });
  if (!entitled) {
    throw codedError(
      "whatsapp_not_entitled",
      "WhatsApp Reminders require an active STRON PRO subscription.",
    );
  }
};

const getOrCreateWallet = async (businessId: mongoose.Types.ObjectId) => {
  const wallet = await WhatsappWallet.findOneAndUpdate(
    { businessId },
    { $setOnInsert: { businessId, balance: 0, ledger: [] } },
    { upsert: true, new: true },
  );
  return wallet;
};

const toWalletView = async (
  businessId: mongoose.Types.ObjectId,
): Promise<WhatsappWalletView> => {
  const [wallet, memberCount, hasEntitlement] = await Promise.all([
    getOrCreateWallet(businessId),
    Member.countDocuments({ businessId, isDeleted: false }),
    hasFeature({ businessId, featureName: "WHATSAPP_REMINDERS" }),
  ]);
  return {
    creditsLeft: Number(wallet.balance) || 0,
    memberCount,
    hasEntitlement: Boolean(hasEntitlement),
  };
};

const defaultConfig = (businessId: mongoose.Types.ObjectId, type: WhatsappReminderType) => {
  const defaults = WHATSAPP_REMINDER_DEFAULTS[type];
  return {
    businessId,
    type,
    isActive: false,
    ...defaults,
  };
};

const toConfigView = (config: {
  type: string;
  isActive: boolean;
  dayOffsets: number[];
  audience: string;
  audienceLimit?: number | null;
  templateOverride?: string | null;
  title: string;
  subtitle: string;
  targetLabel: string;
}): WhatsappReminderConfigView => {
  const limit = config.audienceLimit ?? WHATSAPP_REMINDER_DEFAULTS.MANUAL_PAYMENT.audienceLimit;
  const queueLabel =
    config.audience === "QUEUE_TOP_N" && limit ? `Top ${limit} in queue` : config.targetLabel;
  return {
    type: config.type,
    isActive: config.isActive,
    dayOffsets: config.dayOffsets || [],
    audience: config.audience,
    audienceLimit: config.audienceLimit ?? null,
    templateOverride: config.templateOverride ?? null,
    title: config.title,
    subtitle: config.subtitle,
    targetLabel: queueLabel,
  };
};

const seedConfigs = async (businessId: mongoose.Types.ObjectId) => {
  const existing = await WhatsappReminderConfig.find({ businessId }).lean();
  const have = new Set(existing.map((row) => row.type));
  const missing = WHATSAPP_REMINDER_TYPES.filter((type) => !have.has(type));
  if (missing.length > 0) {
    try {
      await WhatsappReminderConfig.insertMany(
        missing.map((type) => defaultConfig(businessId, type)),
        { ordered: false },
      );
    } catch {
      // unique races during parallel first-reads are fine
    }
  }
  return WhatsappReminderConfig.find({ businessId }).sort({ type: 1 }).lean();
};

const debitWallet = async ({
  businessId,
  amount,
  reason,
  refId,
}: {
  businessId: mongoose.Types.ObjectId;
  amount: number;
  reason: string;
  refId?: string;
}) => {
  await getOrCreateWallet(businessId);
  const updated = await WhatsappWallet.findOneAndUpdate(
    { businessId, balance: { $gte: amount } },
    {
      $inc: { balance: -amount },
      $push: {
        ledger: {
          type: "DEBIT",
          amount,
          reason,
          refId: refId || null,
          at: new Date(),
        },
      },
    },
    { new: true },
  );
  if (!updated) {
    throw codedError(
      "insufficient_whatsapp_credits",
      "Not enough WhatsApp credits for this send.",
    );
  }
  return updated;
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const istDayStartMs = (date: Date) => {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
};

const istDayDiff = (from: Date, to: Date) =>
  Math.round((istDayStartMs(from) - istDayStartMs(to)) / 86_400_000);

const matchingOffset = (eventDate: Date | null | undefined, offsets: number[]) => {
  if (!offsets.length) return 0;
  if (!eventDate) return offsets[0] ?? 0;
  const diff = istDayDiff(new Date(), eventDate);
  return offsets.includes(diff) ? diff : null;
};

export const getWallet = async ({ businessId }: ServiceParams): Promise<WhatsappWalletView> =>
  toWalletView(toObjectId(String(businessId)));

export const creditWallet = async ({
  businessId,
  amount,
  reason = "CREDIT",
}: ServiceParams) => {
  const id = toObjectId(String(businessId));
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) {
    throw codedError("invalid_field", "Credit amount must be a positive integer.");
  }
  await getOrCreateWallet(id);
  await WhatsappWallet.updateOne(
    { businessId: id },
    {
      $inc: { balance: value },
      $push: { ledger: { type: "CREDIT", amount: value, reason, at: new Date() } },
    },
  );
  return toWalletView(id);
};

export const listReminderConfigs = async ({
  businessId,
}: ServiceParams): Promise<WhatsappReminderConfigView[]> => {
  const rows = await seedConfigs(toObjectId(String(businessId)));
  return rows.map((row) => toConfigView(row));
};

export const updateReminderConfig = async ({
  businessId,
  type,
  patch,
}: ServiceParams): Promise<WhatsappReminderConfigView> => {
  const id = toObjectId(String(businessId));
  if (!WHATSAPP_REMINDER_TYPES.includes(type as WhatsappReminderType)) {
    throw codedError("reminder_config_not_found", "Unknown reminder type.");
  }
  await seedConfigs(id);
  const allowed: Record<string, unknown> = {};
  if (typeof patch?.isActive === "boolean") allowed.isActive = patch.isActive;
  if (Array.isArray(patch?.dayOffsets)) allowed.dayOffsets = patch.dayOffsets;
  if (patch?.audience === "ALL" || patch?.audience === "QUEUE_TOP_N") {
    allowed.audience = patch.audience;
  }
  if (patch?.audienceLimit === null || typeof patch?.audienceLimit === "number") {
    allowed.audienceLimit = patch.audienceLimit;
  }
  if (patch?.templateOverride === null || typeof patch?.templateOverride === "string") {
    allowed.templateOverride = patch.templateOverride;
  }

  const updated = await WhatsappReminderConfig.findOneAndUpdate(
    { businessId: id, type },
    { $set: allowed },
    { new: true },
  ).lean();
  if (!updated) {
    throw codedError("reminder_config_not_found", "Reminder config not found.");
  }
  return toConfigView(updated);
};

const mapRecipients = (
  members: Array<{
    _id: unknown;
    name?: string;
    phone?: string;
    profileImage?: string | null;
  }>,
  extras: {
    offsetByMember: Map<string, number>;
    membershipByMember: Map<string, string>;
    eventDayByMember: Map<string, string>;
  },
) =>
  members.map((member) => {
    const id = String(member._id);
    return {
      id,
      name: String(member.name || ""),
      phone: String(member.phone || ""),
      profileImage: member.profileImage ?? null,
      dayOffset: extras.offsetByMember.get(id) ?? 0,
      membershipId: extras.membershipByMember.get(id) || null,
      eventDayKey: extras.eventDayByMember.get(id) || null,
    };
  });

export const previewRecipients = async ({ businessId, type }: ServiceParams) => {
  const id = toObjectId(String(businessId));
  await seedConfigs(id);
  const config = await WhatsappReminderConfig.findOne({ businessId: id, type }).lean();
  if (!config) {
    throw codedError("reminder_config_not_found", "Reminder config not found.");
  }

  const offsetByMember = new Map<string, number>();
  const membershipByMember = new Map<string, string>();
  const eventDayByMember = new Map<string, string>();
  let memberIds: mongoose.Types.ObjectId[] = [];
  const offsets = Array.isArray(config.dayOffsets) ? config.dayOffsets : [];

  const remember = (
    memberId: unknown,
    offset: number | null,
    extras?: { membershipId?: unknown; eventDate?: Date | null },
  ) => {
    if (offset == null) return;
    const key = String(memberId);
    if (!offsetByMember.has(key)) offsetByMember.set(key, offset);
    if (extras?.membershipId && !membershipByMember.has(key)) {
      membershipByMember.set(key, String(extras.membershipId));
    }
    if (extras?.eventDate && !eventDayByMember.has(key)) {
      eventDayByMember.set(key, whatsappDayKey(extras.eventDate));
    }
  };

  if (type === "PAYMENT_RECEIPT") {
    const payments = await Payment.find({
      businessId: id,
      status: "SUCCESS",
      paidAt: { $ne: null },
    })
      .select("memberId paidAt")
      .lean();
    for (const row of payments) {
      const offset = matchingOffset(row.paidAt ? new Date(row.paidAt) : null, offsets);
      if (offset == null) continue;
      remember(row.memberId, offset, {
        eventDate: row.paidAt ? new Date(row.paidAt) : null,
      });
    }
    memberIds = uniqueMemberIds([...offsetByMember.keys()]);
  } else if (type === "AUTOPAY_FAILED") {
    const memberships = await Membership.find({
      businessId: id,
      renewalStatus: "FAILED",
    })
      .select("_id memberId updatedAt")
      .lean();
    for (const row of memberships) {
      const failAt = row.updatedAt ? new Date(row.updatedAt) : null;
      const offset = matchingOffset(failAt, offsets);
      if (offset == null) continue;
      remember(row.memberId, offset, { membershipId: row._id, eventDate: failAt });
    }
    memberIds = uniqueMemberIds([...offsetByMember.keys()]);
  } else {
    const pending = await Payment.find({ businessId: id, status: "PENDING" })
      .select("memberId membershipId createdAt")
      .sort({ createdAt: 1 })
      .lean();
    const membershipIds = pending
      .map((row) => row.membershipId)
      .filter(Boolean)
      .map((value) => toObjectId(String(value)));
    const memberships = membershipIds.length
      ? await Membership.find({ _id: { $in: membershipIds } })
          .select("_id endDate")
          .lean()
      : [];
    const endByMembership = new Map(
      memberships.map((row) => [String(row._id), row.endDate ? new Date(row.endDate) : null]),
    );
    for (const row of pending) {
      const due = row.membershipId ? endByMembership.get(String(row.membershipId)) : null;
      const offset = matchingOffset(due, offsets);
      if (offset == null) continue;
      remember(row.memberId, offset, {
        membershipId: row.membershipId,
        eventDate: due,
      });
    }
    memberIds = uniqueMemberIds([...offsetByMember.keys()]);
    if (config.audience === "QUEUE_TOP_N") {
      const limit = Number(config.audienceLimit) || 42;
      memberIds = memberIds.slice(0, limit);
    }
  }

  const members = memberIds.length
    ? await Member.find({ _id: { $in: memberIds }, businessId: id, isDeleted: false })
        .select("name phone profileImage")
        .lean()
    : [];

  return {
    type: config.type,
    targetLabel: toConfigView(config).targetLabel,
    count: members.length,
    members: mapRecipients(members, { offsetByMember, membershipByMember, eventDayByMember }),
  };
};

export const sendBroadcast = async ({
  businessId,
  memberIds,
  message,
  type = "BROADCAST",
  dayOffset = null,
  paymentId = null,
}: ServiceParams) => {
  const id = toObjectId(String(businessId));
  await requireEntitlement(id);

  const ids = uniqueMemberIds(memberIds || []);
  if (ids.length === 0) {
    throw codedError("invalid_field", "Select at least one member.");
  }

  const members = await Member.find({
    _id: { $in: ids },
    businessId: id,
    isDeleted: false,
  })
    .select("_id")
    .lean();
  if (members.length !== ids.length) {
    throw codedError("member_not_found", "One or more members were not found in this gym.");
  }

  const body = String(message || "").trim();
  if (!body) {
    throw codedError("invalid_field", "Message body is required.");
  }

  const debit = await debitWallet({
    businessId: id,
    amount: ids.length,
    reason: type === "BROADCAST" ? "BROADCAST" : String(type),
  });

  const batchId = new mongoose.Types.ObjectId().toString();
  const outboundType = (type || "BROADCAST") as WhatsappOutboundType;
  let failed = 0;

  for (const memberId of ids) {
    const idempotencyKey =
      outboundType === "PAYMENT_RECEIPT" && paymentId
        ? `PAYMENT_RECEIPT:${paymentId}`
        : `${outboundType}:${batchId}:${String(memberId)}`;
    const result = await createAndEnqueueReminder({
      businessId: id,
      memberId,
      type: outboundType,
      body,
      idempotencyKey,
      scheduledAt: new Date(),
      dayOffset: typeof dayOffset === "number" ? dayOffset : outboundType === "BROADCAST" ? null : 0,
    });
    if (result.failed) failed += 1;
  }

  return {
    queued: ids.length,
    sent: 0,
    failed,
    creditsLeft: Number(debit.balance) || 0,
  };
};

export const listMessages = async ({ businessId, paginationParams }: ServiceParams) => {
  const id = toObjectId(String(businessId));
  const { page, limit, skip, type } = {
    ...getPaginationParams(paginationParams),
    type: paginationParams?.type,
  };
  const query: MongoFilter = { businessId: id };
  if (type) query.type = type;

  const [total, rows] = await Promise.all([
    WhatsappMessage.countDocuments(query),
    WhatsappMessage.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    messages: rows.map((row) => ({
      id: String(row._id),
      memberId: row.memberId ? String(row.memberId) : null,
      type: row.type,
      body: row.body,
      status: row.status,
      creditsUsed: row.creditsUsed,
      failureReason: row.failureReason ?? null,
      sentAt: row.sentAt,
      createdAt: row.createdAt,
    })),
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export { applyWhatsappDeliveryStatuses };

export const notifyPaymentReceipt = async ({
  businessId,
  memberId,
  paymentId,
}: ServiceParams) => {
  try {
    const id = toObjectId(String(businessId));
    const config = await WhatsappReminderConfig.findOne({
      businessId: id,
      type: "PAYMENT_RECEIPT",
      isActive: true,
    }).lean();
    if (!config || !memberId) return null;
    const entitled = await hasFeature({ businessId: id, featureName: "WHATSAPP_REMINDERS" });
    if (!entitled) return null;
    return sendBroadcast({
      businessId: id,
      memberIds: [memberId],
      message:
        config.templateOverride ||
        "Payment received. Thank you for staying with us.",
      type: "PAYMENT_RECEIPT",
      paymentId: paymentId ? String(paymentId) : null,
      dayOffset: 0,
    });
  } catch (error) {
    logger.warn("[whatsapp] payment receipt skipped", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

export const scheduleAutopayFailedReminders = async ({
  businessId,
  memberId,
}: ServiceParams) => {
  try {
    const id = toObjectId(String(businessId));
    if (!memberId) return { queued: 0 };
    const config = await WhatsappReminderConfig.findOne({
      businessId: id,
      type: "AUTOPAY_FAILED",
      isActive: true,
    }).lean();
    if (!config) return { queued: 0 };
    const entitled = await hasFeature({ businessId: id, featureName: "WHATSAPP_REMINDERS" });
    if (!entitled) return { queued: 0 };
    const offsets = Array.isArray(config.dayOffsets) && config.dayOffsets.length
      ? config.dayOffsets
      : [0, 1, 3];
    const failMembership = await Membership.findOne({
      businessId: id,
      memberId: toObjectId(String(memberId)),
    })
      .sort({ updatedAt: -1 })
      .select("_id updatedAt")
      .lean();
    const membershipKey = String(failMembership?._id || memberId);
    const failDay = whatsappDayKey(failMembership?.updatedAt || new Date());
    let queued = 0;
    for (const offset of offsets) {
      const existing = await WhatsappReminder.findOne({
        idempotencyKey: `AUTOPAY_FAILED:${membershipKey}:${offset}:${failDay}`,
      }).lean();
      if (existing) continue;
      try {
        await debitWallet({
          businessId: id,
          amount: 1,
          reason: "AUTOPAY_FAILED",
          refId: `AUTOPAY_FAILED:${membershipKey}:${offset}:${failDay}`,
        });
      } catch {
        break;
      }
      const created = await createAndEnqueueReminder({
        businessId: id,
        memberId,
        type: "AUTOPAY_FAILED",
        body: config.templateOverride || `${config.title}: ${config.subtitle || "Reminder from your gym."}`,
        idempotencyKey: `AUTOPAY_FAILED:${membershipKey}:${offset}:${failDay}`,
        scheduledAt: reminderScheduledAt(offset),
        dayOffset: offset,
      });
      if (!created.duplicate) queued += 1;
    }
    return { queued };
  } catch (error) {
    logger.warn("[whatsapp] autopay failed reminders skipped", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { queued: 0 };
  }
};

export const runScheduledReminders = async () => {
  const configs = await WhatsappReminderConfig.find({ isActive: true }).lean();
  let queued = 0;
  const dayKey = whatsappDayKey();
  for (const config of configs) {
    if (config.type === "PAYMENT_RECEIPT") continue;
    try {
      const entitled = await hasFeature({
        businessId: config.businessId,
        featureName: "WHATSAPP_REMINDERS",
      });
      if (!entitled) continue;
      const preview = await previewRecipients({
        businessId: config.businessId,
        type: config.type,
      });
      if (preview.members.length === 0) continue;
      const body =
        config.templateOverride ||
        `${config.title}: ${config.subtitle || "Reminder from your gym."}`;
      for (const member of preview.members) {
        const offset = member.dayOffset ?? 0;
        const identity = member.membershipId || member.id;
        const eventDay = member.eventDayKey || dayKey;
        const idempotencyKey = `${config.type}:${identity}:${offset}:${eventDay}`;
        const existing = await WhatsappReminder.findOne({ idempotencyKey }).lean();
        if (existing) continue;
        try {
          await debitWallet({
            businessId: config.businessId,
            amount: 1,
            reason: String(config.type),
            refId: idempotencyKey,
          });
        } catch {
          break;
        }
        const created = await createAndEnqueueReminder({
          businessId: config.businessId,
          memberId: member.id,
          type: config.type as WhatsappOutboundType,
          body,
          idempotencyKey,
          scheduledAt: new Date(),
          dayOffset: offset,
        });
        if (!created.duplicate) queued += 1;
      }
    } catch (error) {
      logger.warn("[whatsapp] scheduled reminder skipped", {
        type: config.type,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return { queued };
};

export default {
  getWallet,
  creditWallet,
  listReminderConfigs,
  updateReminderConfig,
  previewRecipients,
  sendBroadcast,
  listMessages,
  applyWhatsappDeliveryStatuses,
  notifyPaymentReceipt,
  runScheduledReminders,
  scheduleAutopayFailedReminders,
};

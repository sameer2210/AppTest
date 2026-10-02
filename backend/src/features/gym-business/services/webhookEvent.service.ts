import WebhookEvent from "../models/webhookEvent.model.js";
import WhatsappContact from "../models/whatsappContact.model.js";
import WhatsappMessage from "../models/whatsappMessage.model.js";
import Member from "../models/member.model.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import { collectWhatsappWebhookItems } from "../../../services/whatsapp/webhookPayload.js";
import { toWhatsappE164 } from "../../../services/whatsapp/phone.util.js";
import { enqueueIncomingWhatsapp, enqueueWebhookEvent } from "../../../queues/producers.js";
import { applyWhatsappDeliveryStatuses } from "./reminder.service.js";
import { logger } from "../../../utils/logger.util.js";

const inboundText = (payload: Record<string, unknown>) => {
  const text = payload.text as { body?: string } | undefined;
  if (text?.body) return String(text.body).slice(0, 4096);
  const type = String(payload.type || "unknown");
  return `[${type}]`;
};

export const acceptWhatsappWebhook = async (body: unknown) => {
  const items = collectWhatsappWebhookItems(body);
  let queued = 0;
  for (const item of items) {
    const existing = await WebhookEvent.findOne({ eventKey: item.eventKey }).select("_id").lean();
    if (existing) continue;
    try {
      await WebhookEvent.create({
        eventKey: item.eventKey,
        field: item.field,
        payload: item.payload,
        status: "RECEIVED",
      });
    } catch (error) {
      if (isMongoDuplicateKeyError(error)) continue;
      throw error;
    }
    const enqueued = await enqueueWebhookEvent(item.eventKey);
    await WebhookEvent.updateOne(
      { eventKey: item.eventKey },
      { $set: { jobId: enqueued.id } },
    );
    queued += 1;
  }
  return { queued };
};

export const processWebhookEventJob = async (eventKey: string) => {
  const event = await WebhookEvent.findOne({ eventKey });
  if (!event) return;
  if (event.status === "PROCESSED") return;
  try {
    if (event.field === "statuses") {
      await applyWhatsappDeliveryStatuses([
        event.payload as {
          id?: string;
          status?: string;
          errors?: Array<{ title?: string; message?: string }>;
        },
      ]);
    } else {
      await enqueueIncomingWhatsapp(eventKey);
    }
    event.status = "PROCESSED";
    event.processedAt = new Date();
    event.failureReason = null;
    await event.save();
  } catch (error) {
    event.status = "FAILED";
    event.failureReason = error instanceof Error ? error.message : String(error);
    await event.save();
    throw error;
  }
};

const resolveMemberForPhone = async (phoneE164: string) => {
  const local = phoneE164.replace(/^91/, "");
  const members = await Member.find({
    isDeleted: false,
    phone: { $in: [phoneE164, local, `+${phoneE164}`, `+91${local}`] },
  })
    .select("_id businessId phone")
    .limit(2)
    .lean();
  if (members.length === 1) return members[0];
  const matched = members.filter((row) => toWhatsappE164(row.phone) === phoneE164);
  return matched.length === 1 ? matched[0] : null;
};

export const processIncomingWhatsappJob = async (eventKey: string) => {
  const event = await WebhookEvent.findOne({ eventKey }).lean();
  if (!event || event.field !== "messages") return;
  const payload = event.payload as Record<string, unknown>;
  const from = String(payload.from || "").replace(/\D/g, "");
  const waId = from || String(payload.from || "");
  const wamid = String(payload.id || "").trim();
  if (!from && !wamid) return;

  const phoneE164 = toWhatsappE164(from) || from;
  const member = phoneE164 ? await resolveMemberForPhone(phoneE164) : null;
  const contact = await WhatsappContact.findOneAndUpdate(
    phoneE164 ? { phoneE164 } : { waId },
    {
      $set: {
        waId,
        lastInboundAt: new Date(),
        ...(member ? { memberId: member._id, businessId: member.businessId } : {}),
      },
      $setOnInsert: {
        phoneE164: phoneE164 || waId,
        optIn: true,
      },
    },
    { upsert: true, new: true },
  );

  try {
    await WhatsappMessage.create({
      businessId: member?.businessId || contact.businessId || null,
      memberId: member?._id || contact.memberId || null,
      contactId: contact._id,
      type: "INBOUND",
      direction: "INBOUND",
      kind: "TEXT",
      from: phoneE164 || waId,
      waId,
      to: null,
      body: inboundText(payload),
      status: "DELIVERED",
      creditsUsed: 0,
      providerMessageId: wamid || null,
      sentAt: new Date(),
    });
  } catch (error) {
    if (!isMongoDuplicateKeyError(error)) {
      logger.warn("[whatsapp] inbound persist failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
};

export default {
  acceptWhatsappWebhook,
  processWebhookEventJob,
  processIncomingWhatsappJob,
};

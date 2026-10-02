// Notification fan-out for STRON Managed Events.
// Push reuses the app's FCM sender. Email/SMS are best-effort hooks that no-op safely
// until a provider is wired, so lifecycle flows never fail on a missing channel.
// Every notify also persists an inbox row so the Notifications screen stays dynamic.

import { sendNotificationToUser, createInboxNotification } from "../../notifications/index.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { STRON_BOT_PREFIX } from "../../../config/stronConfig.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import { logger } from "../../../utils/logger.util.js";
import type { ServiceParams } from "../../../types/service.util.js";

// Push + inbox for a single user, swallowing transport errors.
export const notifyUser = async (
  uid: string,
  title: string,
  body: string,
  options: ServiceParams = {},
) => {
  const eventKey = options?.eventKey || null;
  const tag = options?.tag || null;
  const data = options?.data || null;
  try {
    await createInboxNotification({ uid, title, body, eventKey, tag, data });
  } catch {
    // inbox write must never block lifecycle
  }
  try {
    await sendNotificationToUser(uid, title, body);
  } catch (error: unknown) {
    logger.warn("[stronManaged] push failed:", getErrorMessage(error));
  }
};

const maskEmail = (email: unknown): string => {
  const str = String(email || "").trim();
  const [local, domain] = str.split("@");
  if (!domain) return "****";
  const maskedLocal =
    local.length <= 2 ? `${local[0]}*` : `${local[0]}***${local.slice(-1)}`;
  return `${maskedLocal}@${domain}`;
};

const maskPhone = (phone: unknown): string => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
};

// Email hook. Left as a safe stub; swap the body for nodemailer/SES when configured.
export const sendEmail = async ({ to, subject, text }: ServiceParams) => {
  if (!to) return;
  logger.info(`[stronManaged] email queued -> ${maskEmail(to)}: ${subject} ${text ? "" : ""}`);
};

// SMS hook. Reuses the OTP SMS provider infra when a real send is wired in.
export const sendSms = async ({ to, message }: ServiceParams) => {
  if (!to) return;
  logger.info(`[stronManaged] sms queued -> ${maskPhone(to)}: ${message}`);
};

// Push to every real (non-bot) participant of an event. Used for lifecycle broadcasts.
export const notifyEventParticipants = async (
  eventKey: string,
  title: string,
  body: string,
  options: ServiceParams = {},
) => {
  const participants = await StronParticipation.find({
    eventKey,
    uid: { $not: new RegExp(`^${STRON_BOT_PREFIX}`) },
  })
    .select("uid")
    .lean();

  await Promise.all(
    participants.map((p) =>
      notifyUser(p.uid, title, body, { ...options, eventKey }),
    ),
  );
  return participants.length;
};

export default {
  notifyUser,
  sendEmail,
  sendSms,
  notifyEventParticipants,
};

import {
  WHATSAPP_QUEUE_NAMES,
  getWhatsappJobAttempts,
} from "../constants/whatsapp.constants.js";
import { getQueueAdapter } from "./adapter.js";
import type {
  IncomingWhatsappJobData,
  OutgoingWhatsappJobData,
  ReminderJobData,
  WebhookEventJobData,
} from "./types.js";

export const enqueueWebhookEvent = async (eventKey: string) =>
  getQueueAdapter().add(
    WHATSAPP_QUEUE_NAMES.WEBHOOK_EVENTS,
    "process",
    { eventKey } satisfies WebhookEventJobData,
    { jobId: `webhook:${eventKey}`, attempts: getWhatsappJobAttempts() },
  );

export const enqueueIncomingWhatsapp = async (eventKey: string) =>
  getQueueAdapter().add(
    WHATSAPP_QUEUE_NAMES.INCOMING,
    "process",
    { eventKey } satisfies IncomingWhatsappJobData,
    { jobId: `incoming:${eventKey}`, attempts: getWhatsappJobAttempts() },
  );

export const enqueueReminderJob = async (reminderId: string, delayMs = 0) =>
  getQueueAdapter().add(
    WHATSAPP_QUEUE_NAMES.REMINDER,
    "send",
    { reminderId } satisfies ReminderJobData,
    {
      jobId: `reminder:${reminderId}`,
      delay: Math.max(0, delayMs),
      attempts: getWhatsappJobAttempts(),
    },
  );

export const removeReminderJob = async (reminderId: string) =>
  getQueueAdapter().remove(WHATSAPP_QUEUE_NAMES.REMINDER, `reminder:${reminderId}`);

export const enqueueOutgoingWhatsapp = async (data: OutgoingWhatsappJobData) =>
  getQueueAdapter().add(WHATSAPP_QUEUE_NAMES.OUTGOING, "send", data, {
    jobId: `out:${data.messageId}`,
    attempts: getWhatsappJobAttempts(),
  });

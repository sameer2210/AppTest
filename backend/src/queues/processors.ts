import {
  WHATSAPP_QUEUE_NAMES,
  type WhatsappQueueName,
} from "../constants/whatsapp.constants.js";
import type { QueueAdapter, QueueJob } from "./types.js";
import {
  processIncomingWhatsappJob,
  processWebhookEventJob,
} from "../features/gym-business/services/webhookEvent.service.js";
import {
  processOutgoingJob,
  processReminderJob,
} from "../features/gym-business/services/reminder.service.js";
import type {
  IncomingWhatsappJobData,
  OutgoingWhatsappJobData,
  ReminderJobData,
  WebhookEventJobData,
} from "./types.js";

export const registerWhatsappProcessors = (adapter: QueueAdapter) => {
  adapter.registerProcessor(
    WHATSAPP_QUEUE_NAMES.WEBHOOK_EVENTS as WhatsappQueueName,
    async (job: QueueJob) => {
      const data = job.data as WebhookEventJobData;
      await processWebhookEventJob(data.eventKey);
    },
  );
  adapter.registerProcessor(
    WHATSAPP_QUEUE_NAMES.INCOMING as WhatsappQueueName,
    async (job: QueueJob) => {
      const data = job.data as IncomingWhatsappJobData;
      await processIncomingWhatsappJob(data.eventKey);
    },
  );
  adapter.registerProcessor(
    WHATSAPP_QUEUE_NAMES.REMINDER as WhatsappQueueName,
    async (job: QueueJob) => {
      const data = job.data as ReminderJobData;
      await processReminderJob(data.reminderId);
    },
  );
  adapter.registerProcessor(
    WHATSAPP_QUEUE_NAMES.OUTGOING as WhatsappQueueName,
    async (job: QueueJob) => {
      const data = job.data as OutgoingWhatsappJobData;
      await processOutgoingJob(data, { attemptsMade: job.attemptsMade });
    },
  );
};

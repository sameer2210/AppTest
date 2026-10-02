import type { WhatsappQueueName } from "../constants/whatsapp.constants.js";
import type { WhatsappSendKind, WhatsappTemplateComponent } from "../services/whatsapp/whatsappProvider.js";

export type QueueJobOptions = {
  jobId?: string;
  delay?: number;
  attempts?: number;
};

export type QueueJob = {
  id: string;
  name: string;
  data: unknown;
  attemptsMade: number;
};

export type QueueProcessor = (job: QueueJob) => Promise<void>;

export type EnqueueResult = {
  id: string;
  duplicate: boolean;
};

export interface QueueAdapter {
  add(
    queueName: WhatsappQueueName,
    name: string,
    data: unknown,
    opts?: QueueJobOptions,
  ): Promise<EnqueueResult>;
  remove(queueName: WhatsappQueueName, jobId: string): Promise<void>;
  registerProcessor(queueName: WhatsappQueueName, processor: QueueProcessor): void;
  startWorkers(): Promise<void>;
  drain(): Promise<void>;
  close(): Promise<void>;
}

export type WebhookEventJobData = {
  eventKey: string;
};

export type IncomingWhatsappJobData = {
  eventKey: string;
};

export type ReminderJobData = {
  reminderId: string;
};

export type OutgoingWhatsappJobData = {
  messageId: string;
  reminderId?: string | null;
  to: string;
  businessId?: string;
  memberId?: string;
  kind: WhatsappSendKind;
  body?: string;
  template?: {
    name: string;
    language: string;
    components: WhatsappTemplateComponent[];
  };
};

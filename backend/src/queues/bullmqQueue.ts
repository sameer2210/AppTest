import { Queue, Worker, type JobsOptions } from "bullmq";
import { logger } from "../utils/logger.util.js";
import { closeRedisConnection, getRedisConnection } from "../config/redis.js";
import {
  WHATSAPP_QUEUE_DEFAULTS,
  WHATSAPP_QUEUE_NAMES,
  WHATSAPP_QUEUE_PREFIX,
  getWhatsappIncomingConcurrency,
  getWhatsappJobAttempts,
  getWhatsappOutgoingConcurrency,
  getWhatsappReminderConcurrency,
  getWhatsappWebhookConcurrency,
  type WhatsappQueueName,
} from "../constants/whatsapp.constants.js";
import type {
  EnqueueResult,
  QueueAdapter,
  QueueJobOptions,
  QueueProcessor,
} from "./types.js";

const concurrencyFor = (queueName: WhatsappQueueName): number => {
  if (queueName === WHATSAPP_QUEUE_NAMES.INCOMING) return getWhatsappIncomingConcurrency();
  if (queueName === WHATSAPP_QUEUE_NAMES.OUTGOING) return getWhatsappOutgoingConcurrency();
  if (queueName === WHATSAPP_QUEUE_NAMES.REMINDER) return getWhatsappReminderConcurrency();
  return getWhatsappWebhookConcurrency();
};

export class BullMQQueueAdapter implements QueueAdapter {
  private readonly processors = new Map<WhatsappQueueName, QueueProcessor>();
  private readonly queues = new Map<WhatsappQueueName, Queue>();
  private readonly workers: Worker[] = [];

  private queue(queueName: WhatsappQueueName): Queue {
    const existing = this.queues.get(queueName);
    if (existing) return existing;
    const created = new Queue(queueName, {
      connection: getRedisConnection(),
      prefix: WHATSAPP_QUEUE_PREFIX,
      defaultJobOptions: {
        attempts: getWhatsappJobAttempts(),
        backoff: { type: "exponential", delay: WHATSAPP_QUEUE_DEFAULTS.BACKOFF_MS },
        removeOnComplete: { count: WHATSAPP_QUEUE_DEFAULTS.REMOVE_ON_COMPLETE },
        removeOnFail: false,
      },
    });
    this.queues.set(queueName, created);
    return created;
  }

  registerProcessor(queueName: WhatsappQueueName, processor: QueueProcessor): void {
    this.processors.set(queueName, processor);
  }

  async add(
    queueName: WhatsappQueueName,
    name: string,
    data: unknown,
    opts: QueueJobOptions = {},
  ): Promise<EnqueueResult> {
    const jobOpts: JobsOptions = {
      jobId: opts.jobId,
      delay: opts.delay,
      attempts: opts.attempts ?? getWhatsappJobAttempts(),
      backoff: { type: "exponential", delay: WHATSAPP_QUEUE_DEFAULTS.BACKOFF_MS },
    };
    try {
      const job = await this.queue(queueName).add(name, data, jobOpts);
      return { id: String(job.id), duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message) && opts.jobId) {
        return { id: opts.jobId, duplicate: true };
      }
      throw error;
    }
  }

  async remove(queueName: WhatsappQueueName, jobId: string): Promise<void> {
    try {
      await this.queue(queueName).remove(jobId);
    } catch (error) {
      logger.warn("[whatsapp:queue] remove failed", {
        queue: queueName,
        jobId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async startWorkers(): Promise<void> {
    if (this.workers.length > 0) return;
    for (const queueName of Object.values(WHATSAPP_QUEUE_NAMES)) {
      const processor = this.processors.get(queueName);
      if (!processor) continue;
      const worker = new Worker(
        queueName,
        async (job) => {
          logger.info("[whatsapp:queue] start", {
            queue: queueName,
            jobId: job.id,
            attempt: job.attemptsMade + 1,
          });
          await processor({
            id: String(job.id),
            name: job.name,
            data: job.data,
            attemptsMade: job.attemptsMade + 1,
          });
        },
        {
          connection: getRedisConnection(),
          prefix: WHATSAPP_QUEUE_PREFIX,
          concurrency: concurrencyFor(queueName),
        },
      );
      worker.on("completed", (job) => {
        logger.info("[whatsapp:queue] complete", { queue: queueName, jobId: job.id });
      });
      worker.on("failed", (job, error) => {
        logger.warn("[whatsapp:queue] failed", {
          queue: queueName,
          jobId: job?.id,
          attempt: job?.attemptsMade,
          message: error instanceof Error ? error.message : String(error),
        });
      });
      this.workers.push(worker);
    }
  }

  async drain(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.drain(true)));
  }

  async close(): Promise<void> {
    await Promise.all(this.workers.map((worker) => worker.close()));
    this.workers.length = 0;
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    this.queues.clear();
    await closeRedisConnection();
  }
}

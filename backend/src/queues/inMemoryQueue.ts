import { logger } from "../utils/logger.util.js";
import {
  WHATSAPP_QUEUE_DEFAULTS,
  type WhatsappQueueName,
} from "../constants/whatsapp.constants.js";
import type {
  EnqueueResult,
  QueueAdapter,
  QueueJob,
  QueueJobOptions,
  QueueProcessor,
} from "./types.js";

type InternalJob = QueueJob & {
  queueName: WhatsappQueueName;
  maxAttempts: number;
};

export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly processors = new Map<WhatsappQueueName, QueueProcessor>();
  private readonly pending: InternalJob[] = [];
  private readonly delayed: Array<{ job: InternalJob; until: number }> = [];
  private readonly knownIds = new Set<string>();
  private inflight = 0;

  registerProcessor(queueName: WhatsappQueueName, processor: QueueProcessor): void {
    this.processors.set(queueName, processor);
  }

  async add(
    queueName: WhatsappQueueName,
    name: string,
    data: unknown,
    opts: QueueJobOptions = {},
  ): Promise<EnqueueResult> {
    const id = opts.jobId || `${queueName}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = `${queueName}:${id}`;
    if (this.knownIds.has(key)) {
      return { id, duplicate: true };
    }
    this.knownIds.add(key);
    const job: InternalJob = {
      id,
      name,
      data,
      attemptsMade: 0,
      queueName,
      maxAttempts: opts.attempts ?? WHATSAPP_QUEUE_DEFAULTS.JOB_ATTEMPTS,
    };
    const delay = Math.max(0, Number(opts.delay) || 0);
    if (delay > 0) {
      this.delayed.push({ job, until: Date.now() + delay });
    } else {
      this.pending.push(job);
    }
    return { id, duplicate: false };
  }

  async remove(queueName: WhatsappQueueName, jobId: string): Promise<void> {
    const key = `${queueName}:${jobId}`;
    for (let i = this.pending.length - 1; i >= 0; i -= 1) {
      if (this.pending[i].id === jobId && this.pending[i].queueName === queueName) {
        this.pending.splice(i, 1);
      }
    }
    for (let i = this.delayed.length - 1; i >= 0; i -= 1) {
      if (this.delayed[i].job.id === jobId && this.delayed[i].job.queueName === queueName) {
        this.delayed.splice(i, 1);
      }
    }
    this.knownIds.delete(key);
  }

  async startWorkers(): Promise<void> {
    // Tests process jobs via drain().
  }

  async drain(): Promise<void> {
    this.flushDelayed(true);
    while (this.pending.length > 0 || this.inflight > 0) {
      if (this.pending.length === 0) {
        await new Promise((resolve) => setImmediate(resolve));
        continue;
      }
      const job = this.pending.shift();
      if (!job) continue;
      await this.run(job);
    }
  }

  async close(): Promise<void> {
    this.pending.length = 0;
    this.delayed.length = 0;
    this.knownIds.clear();
  }

  private flushDelayed(includeFuture: boolean): void {
    const now = Date.now();
    for (let i = this.delayed.length - 1; i >= 0; i -= 1) {
      if (includeFuture || this.delayed[i].until <= now) {
        this.pending.push(this.delayed[i].job);
        this.delayed.splice(i, 1);
      }
    }
  }

  private async run(job: InternalJob): Promise<void> {
    const processor = this.processors.get(job.queueName);
    if (!processor) {
      logger.warn("[whatsapp:queue] no processor registered", {
        queue: job.queueName,
        jobId: job.id,
      });
      return;
    }
    this.inflight += 1;
    job.attemptsMade += 1;
    logger.info("[whatsapp:queue] start", {
      queue: job.queueName,
      jobId: job.id,
      attempt: job.attemptsMade,
    });
    try {
      await processor(job);
      logger.info("[whatsapp:queue] complete", {
        queue: job.queueName,
        jobId: job.id,
        attempt: job.attemptsMade,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn("[whatsapp:queue] failed", {
        queue: job.queueName,
        jobId: job.id,
        attempt: job.attemptsMade,
        message,
      });
      if (job.attemptsMade < job.maxAttempts) {
        this.pending.push(job);
      } else {
        logger.error("[whatsapp:queue] moved to failed", {
          queue: job.queueName,
          jobId: job.id,
          message,
        });
      }
    } finally {
      this.inflight -= 1;
    }
  }
}

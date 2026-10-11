import { pingRedis, isRedisConfigured } from "../config/redis.js";
import {
  getWhatsappAccessToken,
  getWhatsappPhoneNumberId,
} from "../constants/infra.constants.js";
import { getWhatsappWorkersEnabled } from "../constants/whatsapp.constants.js";
import { logger } from "../utils/logger.util.js";
import { BullMQQueueAdapter } from "./bullmqQueue.js";
import { InMemoryQueueAdapter } from "./inMemoryQueue.js";
import type { QueueAdapter } from "./types.js";

const isTestEnv = () => process.env.NODE_ENV === "test";

let redisReachable = false;

export const shouldUseBullMQ = (): boolean =>
  !isTestEnv() && isRedisConfigured() && getWhatsappWorkersEnabled() && redisReachable;

let adapter: QueueAdapter | null = null;

export const getQueueAdapter = (): QueueAdapter => {
  if (!adapter) {
    adapter = shouldUseBullMQ() ? new BullMQQueueAdapter() : new InMemoryQueueAdapter();
  }
  return adapter;
};

const cloudApiConfigured = (): boolean =>
  Boolean(getWhatsappAccessToken() && getWhatsappPhoneNumberId());

/** True when BullMQ can be used. Throws when Cloud API credentials are set and Redis is down. */
export const assertDurableWhatsappQueue = async (): Promise<boolean> => {
  const reachable = isRedisConfigured() && (await pingRedis());
  if (reachable) return true;
  if (cloudApiConfigured()) {
    throw new Error(
      "Redis is unreachable. WhatsApp Cloud API credentials are set, so jobs cannot use the in-memory queue.",
    );
  }
  return false;
};

export const prepareWhatsappQueueAdapter = async (): Promise<void> => {
  if (isTestEnv() || !getWhatsappWorkersEnabled()) return;
  await shutdownQueueAdapter();

  const durable = await assertDurableWhatsappQueue();
  if (!durable) {
    logger.warn("[whatsapp] Redis is unavailable. WhatsApp jobs will use in-memory queues.");
    return;
  }

  redisReachable = true;
};

export const shutdownQueueAdapter = async (): Promise<void> => {
  if (!adapter) return;
  const current = adapter;
  adapter = null;
  redisReachable = false;
  await current.close();
};

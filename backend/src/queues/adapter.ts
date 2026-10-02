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

export const prepareWhatsappQueueAdapter = async (): Promise<void> => {
  if (isTestEnv() || !getWhatsappWorkersEnabled()) return;
  await shutdownQueueAdapter();

  if (!isRedisConfigured()) {
    if (getWhatsappAccessToken() && getWhatsappPhoneNumberId()) {
      logger.error(
        "[whatsapp] Redis is required to process WhatsApp jobs when Cloud API credentials are set. Set REDIS_URL.",
      );
    }
    return;
  }

  const reachable = await pingRedis();
  if (!reachable) {
    logger.warn(
      "[redis] REDIS_URL is set but Redis is not running — WhatsApp jobs will use in-memory queues. Start Redis on 127.0.0.1:6379 to enable BullMQ.",
    );
    if (getWhatsappAccessToken() && getWhatsappPhoneNumberId()) {
      logger.error(
        "[whatsapp] Cloud API credentials are set but Redis is unreachable. Jobs will not survive process restarts.",
      );
    }
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

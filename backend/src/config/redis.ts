import { Redis } from "ioredis";
import { logger } from "../utils/logger.util.js";

const DEFAULT_REDIS_HOST = "127.0.0.1";
const DEFAULT_REDIS_PORT = "6379";
const REDIS_PING_TIMEOUT_MS = 1_500;
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

export const getRedisUrl = (): string => {
  const url = (process.env.REDIS_URL || "").trim();
  if (url) return url;
  const host = (process.env.REDIS_HOST || DEFAULT_REDIS_HOST).trim() || DEFAULT_REDIS_HOST;
  const port = (process.env.REDIS_PORT || DEFAULT_REDIS_PORT).trim() || DEFAULT_REDIS_PORT;
  const password = (process.env.REDIS_PASSWORD || "").trim();
  if (password) return `redis://:${encodeURIComponent(password)}@${host}:${port}`;
  return `redis://${host}:${port}`;
};

export const isRedisConfigured = (): boolean =>
  Boolean((process.env.REDIS_URL || "").trim() || (process.env.REDIS_HOST || "").trim());

let client: Redis | null = null;
let lastErrorLogAt = 0;

const logRedisError = (error: Error) => {
  const now = Date.now();
  if (now - lastErrorLogAt < REDIS_ERROR_LOG_INTERVAL_MS) return;
  lastErrorLogAt = now;
  logger.error("[redis] connection error", {
    message: error.message,
    code: (error as NodeJS.ErrnoException).code || null,
  });
};

export const pingRedis = async (): Promise<boolean> => {
  if (!isRedisConfigured()) return false;
  const probe = new Redis(getRedisUrl(), {
    maxRetriesPerRequest: 1,
    enableReadyCheck: true,
    connectTimeout: REDIS_PING_TIMEOUT_MS,
    retryStrategy: () => null,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  probe.on("error", () => undefined);
  try {
    await probe.connect();
    const pong = await probe.ping();
    return pong === "PONG";
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
};

export const getRedisConnection = (): Redis => {
  if (!client) {
    client = new Redis(getRedisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    client.on("error", (error: Error) => {
      logRedisError(error);
    });
  }
  return client;
};

export const closeRedisConnection = async (): Promise<void> => {
  if (!client) return;
  const current = client;
  client = null;
  try {
    await current.quit();
  } catch {
    current.disconnect();
  }
};

import { logger } from "../utils/logger.util.js";
import {
  getQueueAdapter,
  prepareWhatsappQueueAdapter,
  shouldUseBullMQ,
  shutdownQueueAdapter,
} from "./adapter.js";
import { registerWhatsappProcessors } from "./processors.js";

let processorsRegistered = false;

export const ensureWhatsappProcessors = () => {
  if (processorsRegistered) return;
  registerWhatsappProcessors(getQueueAdapter());
  processorsRegistered = true;
};

export const startWhatsappWorkers = async () => {
  await prepareWhatsappQueueAdapter();
  processorsRegistered = false;
  ensureWhatsappProcessors();
  if (!shouldUseBullMQ()) {
    logger.info("[whatsapp] queue adapter ready (in-memory)");
    return;
  }
  await getQueueAdapter().startWorkers();
  logger.info("[whatsapp] BullMQ workers started");
};

export const drainWhatsappQueues = async () => {
  ensureWhatsappProcessors();
  await getQueueAdapter().drain();
};

export const shutdownWhatsappQueues = async () => {
  processorsRegistered = false;
  await shutdownQueueAdapter();
};

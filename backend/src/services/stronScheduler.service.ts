/**
 * Shared Cron Scheduler Infrastructure.
 * Pure infra: schedules recurring tasks via node-cron.
 * Does NOT import any domain services.
 */
import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../utils/logger.util.js";
import type { ScheduleCronOptions } from "../types/service.util.js";

export type { ScheduleCronOptions };


/**
 * Schedule a cron task with error handling and logging.
 */
export const scheduleCron = ({
  name,
  cronExpression,
  timezone,
  task,
}: ScheduleCronOptions): ScheduledTask => {
  return cron.schedule(
    cronExpression,
    async () => {
      try {
        await task();
      } catch (error) {
        logger.error(`[scheduler] job "${name}" failed:`, error);
      }
    },
    timezone ? { timezone } : undefined,
  );
};

export default {
  scheduleCron,
};

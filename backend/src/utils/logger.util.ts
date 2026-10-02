/**
 * Centralized application logger for Stron Backend.
 * Standardizes log format with timestamps, log levels, and suppresses verbose logs in test/production.
 */

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel =
  process.env.NODE_ENV === "test"
    ? LOG_LEVELS.ERROR
    : process.env.NODE_ENV === "production"
    ? LOG_LEVELS.INFO
    : LOG_LEVELS.DEBUG;

export const logger = {
  debug: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.debug(`[${new Date().toISOString()}] [DEBUG]`, ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.info(`[${new Date().toISOString()}] [INFO]`, ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn(`[${new Date().toISOString()}] [WARN]`, ...args);
    }
  },
  error: (...args: unknown[]) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error(`[${new Date().toISOString()}] [ERROR]`, ...args);
    }
  },
};

export default logger;

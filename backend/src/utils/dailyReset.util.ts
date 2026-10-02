import moment from "moment-timezone";

export const MAX_DAILY_STEPS = 100_000;

export const sanitizeDailySteps = (value: unknown) => {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(n, MAX_DAILY_STEPS);
};

export const dayKeyInTimezone = (date: Date | string, timezone = "Asia/Kolkata") =>
  moment(date).tz(timezone || "Asia/Kolkata").format("YYYY-MM-DD");

export default {
  MAX_DAILY_STEPS,
  sanitizeDailySteps,
  dayKeyInTimezone,
};

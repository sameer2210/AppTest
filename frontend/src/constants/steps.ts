/** Shared daily step ceiling — caps display/sync; does not wipe legitimate high days. */
export const MAX_DAILY_STEPS = 100_000;

/** Floor at 0 and cap at MAX_DAILY_STEPS (never zero out high legitimate totals). */
export const sanitizeDailySteps = (value: number): number => {
  const n = Math.max(0, Math.floor(Number(value) || 0));
  return Math.min(n, MAX_DAILY_STEPS);
};

/** True when a reading looks like a since-boot / offset leak above the daily ceiling. */
export const isImplausibleDailySteps = (value: number): boolean =>
  Math.max(0, Math.floor(Number(value) || 0)) > MAX_DAILY_STEPS;

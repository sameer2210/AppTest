// Small randomness helpers for pairing and bot behaviour.

import { getStronConfig } from "../config/stronConfig.js";
import {
  fractionOfIstDayElapsed,
  fractionOfIstDayElapsedForKey,
} from "./stronTime.util.js";

export const randomInt = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

// Fisher-Yates shuffle (returns a new array).
export const shuffle = <T>(input: T[]): T[] => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// A bot's total steps for the day, within the configured band.
export const randomBotDailySteps = () => {
  const { botDailyStepsMin, botDailyStepsMax } = getStronConfig();
  return randomInt(botDailyStepsMin, botDailyStepsMax);
};

// Constant-speed bot progress: reaches `target` by end of the IST day, ticking once
// per minute. Pass `dayKeyValue` (YYYY-MM-DD) so settle/reconcile use the match day.
export const simulateBotSteps = (
  target: number | string | null | undefined,
  date: Date = new Date(),
  dayKeyValue: string | null = null,
) => {
  const t = Math.round(Number(target || 0));
  if (t <= 0) return 0;
  const fraction = dayKeyValue
    ? fractionOfIstDayElapsedForKey(dayKeyValue, date)
    : fractionOfIstDayElapsed(date);
  return Math.round(t * fraction);
};
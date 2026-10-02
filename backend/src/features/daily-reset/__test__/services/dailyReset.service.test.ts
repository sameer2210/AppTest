import { describe, it, expect } from "vitest";
import {
  sanitizeDailySteps,
  dayKeyInTimezone,
  MAX_DAILY_STEPS,
} from "@/features/daily-reset/services/dailyReset.service.js";

describe("daily-reset: dailyReset.service", () => {
  it("sanitizeDailySteps caps excessive step counts to MAX_DAILY_STEPS", () => {
    expect(sanitizeDailySteps(5000)).toBe(5000);
    expect(sanitizeDailySteps(150000)).toBe(MAX_DAILY_STEPS);
    expect(sanitizeDailySteps(-10)).toBe(0);
  });

  it("dayKeyInTimezone returns YYYY-MM-DD formatted date string", () => {
    const key = dayKeyInTimezone(new Date("2026-09-03T12:00:00Z"), "Asia/Kolkata");
    expect(key).toBe("2026-09-03");
  });
});

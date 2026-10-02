import { describe, it, expect } from "vitest";
import { triggerDailyResetSchema } from "../reset.validator.js";

describe("daily-reset: reset.validator", () => {
  it("validates triggerDailyResetSchema", () => {
    expect(triggerDailyResetSchema.body.safeParse({}).success).toBe(true);
    expect(triggerDailyResetSchema.body.safeParse(undefined).success).toBe(true);
  });
});

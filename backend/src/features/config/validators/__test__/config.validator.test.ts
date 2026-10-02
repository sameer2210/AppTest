import { describe, it, expect } from "vitest";
import { refreshConfigSchema } from "../config.validator.js";

describe("config: config.validator", () => {
  it("validates refreshConfigSchema", () => {
    expect(refreshConfigSchema.query.safeParse({}).success).toBe(true);
    expect(refreshConfigSchema.query.safeParse(undefined).success).toBe(true);
  });
});

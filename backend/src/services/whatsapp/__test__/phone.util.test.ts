import { describe, expect, it } from "vitest";
import { toWhatsappE164 } from "../phone.util.js";

describe("toWhatsappE164", () => {
  it("normalizes 10-digit, +91, 91, and leading-zero India numbers", () => {
    expect(toWhatsappE164("9876543210")).toBe("919876543210");
    expect(toWhatsappE164("+91 98765 43210")).toBe("919876543210");
    expect(toWhatsappE164("919876543210")).toBe("919876543210");
    expect(toWhatsappE164("09876543210")).toBe("919876543210");
  });

  it("rejects invalid numbers", () => {
    expect(toWhatsappE164("")).toBeNull();
    expect(toWhatsappE164("123")).toBeNull();
    expect(toWhatsappE164("5876543210")).toBeNull();
    expect(toWhatsappE164(null)).toBeNull();
  });
});

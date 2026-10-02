import { describe, it, expect } from "vitest";
import {
  buildContactNoMemberPhoneMatchExpr,
  indianPhonesEquivalent,
} from "@/utils/phoneMatch.util.js";

describe("phoneMatch.util", () => {
  describe("indianPhonesEquivalent", () => {
    it("matches exact, +91-prefixed, and digits-only forms", () => {
      expect(indianPhonesEquivalent("9098998819", "9098998819")).toBe(true);
      expect(indianPhonesEquivalent("+919098998819", "9098998819")).toBe(true);
      expect(indianPhonesEquivalent("+919098998819", "+919098998819")).toBe(true);
      expect(indianPhonesEquivalent("9098998819", "+919098998819")).toBe(true);
    });

    it("does not double-prefix +91 on member side", () => {
      expect(indianPhonesEquivalent("+919098998819", "+919098998819")).toBe(true);
      expect(indianPhonesEquivalent("9098998819", "+919098998819")).toBe(true);
    });

    it("returns false for empty or mismatched numbers", () => {
      expect(indianPhonesEquivalent("", "9098998819")).toBe(false);
      expect(indianPhonesEquivalent("9098998819", "9098998818")).toBe(false);
    });
  });

  describe("buildContactNoMemberPhoneMatchExpr", () => {
    it("exports a four-branch $or expression", () => {
      const expr = buildContactNoMemberPhoneMatchExpr();
      expect(expr).toHaveProperty("$or");
      expect(expr.$or).toHaveLength(4);
    });
  });
});

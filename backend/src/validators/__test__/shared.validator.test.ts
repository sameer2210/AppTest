import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import {
  objectIdRegex,
  objectIdString,
  optionalObjectIdString,
  nullableOptionalObjectIdString,
  paginationPageString,
  paginationLimitString,
  ymdDateString,
  nullableDateOrYmdString,
  sortOrderEnum,
} from "../shared.js";

describe("validators/shared.ts", () => {
  const validHexId = new mongoose.Types.ObjectId().toHexString();

  it("objectIdRegex matches 24-char hex strings", () => {
    expect(objectIdRegex.test(validHexId)).toBe(true);
    expect(objectIdRegex.test("invalid-hex-id")).toBe(false);
  });

  describe("objectIdString", () => {
    const schema = objectIdString("gym ID");

    it("parses valid 24-character hex ID", () => {
      const result = schema.safeParse(validHexId);
      expect(result.success).toBe(true);
    });

    it("trims whitespace before validating", () => {
      const result = schema.safeParse(`  ${validHexId}  `);
      expect(result.success).toBe(true);
    });

    it("fails for malformed or short IDs", () => {
      const result = schema.safeParse("1234567890abcdef");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid gym ID");
      }
    });

    it("uses default label when none provided", () => {
      const defaultSchema = objectIdString();
      const result = defaultSchema.safeParse("not-a-mongo-id");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid ID");
      }
    });
  });

  describe("optionalObjectIdString", () => {
    const schema = optionalObjectIdString("optional ID");

    it("accepts undefined and empty string", () => {
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse("").success).toBe(true);
      expect(schema.safeParse("   ").success).toBe(true);
    });

    it("accepts valid 24-character hex ID", () => {
      expect(schema.safeParse(validHexId).success).toBe(true);
    });

    it("fails for invalid string", () => {
      const result = schema.safeParse("invalid-string");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid optional ID");
      }
    });
  });

  describe("nullableOptionalObjectIdString", () => {
    const schema = nullableOptionalObjectIdString("plan ID");

    it("accepts null, undefined, and empty string", () => {
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
      expect(schema.safeParse("").success).toBe(true);
    });

    it("accepts valid hex ID", () => {
      expect(schema.safeParse(validHexId).success).toBe(true);
    });

    it("fails for invalid string", () => {
      const result = schema.safeParse("invalid-hex");
      expect(result.success).toBe(false);
    });
  });

  describe("paginationPageString", () => {
    const schema = paginationPageString(1);

    it("returns parsed integer when valid positive string", () => {
      expect(schema.parse("5")).toBe(5);
    });

    it("falls back to defaultVal when undefined or missing", () => {
      expect(schema.parse(undefined)).toBe(1);
      expect(schema.parse("")).toBe(1);
    });

    it("falls back to defaultVal when parsed is less than 1 or NaN", () => {
      expect(schema.parse("0")).toBe(1);
      expect(schema.parse("-10")).toBe(1);
      expect(schema.parse("not-a-number")).toBe(1);
    });
  });

  describe("paginationLimitString", () => {
    const schema = paginationLimitString(20, 100);

    it("returns parsed integer within range", () => {
      expect(schema.parse("50")).toBe(50);
    });

    it("falls back to defaultVal when undefined, empty, NaN or < 1", () => {
      expect(schema.parse(undefined)).toBe(20);
      expect(schema.parse("")).toBe(20);
      expect(schema.parse("0")).toBe(20);
      expect(schema.parse("abc")).toBe(20);
    });

    it("clamps to maxVal when input exceeds maximum", () => {
      expect(schema.parse("500")).toBe(100);
    });
  });

  describe("ymdDateString", () => {
    const schema = ymdDateString();

    it("parses valid YYYY-MM-DD", () => {
      expect(schema.safeParse("2026-09-07").success).toBe(true);
    });

    it("rejects invalid date patterns", () => {
      expect(schema.safeParse("2026/09/07").success).toBe(false);
      expect(schema.safeParse("07-09-2026").success).toBe(false);
      expect(schema.safeParse("not-a-date").success).toBe(false);
    });
  });

  describe("nullableDateOrYmdString", () => {
    const schema = nullableDateOrYmdString();

    it("accepts null and undefined", () => {
      expect(schema.safeParse(null).success).toBe(true);
      expect(schema.safeParse(undefined).success).toBe(true);
    });

    it("accepts ISO datetime string", () => {
      expect(schema.safeParse("2026-09-07T12:00:00.000Z").success).toBe(true);
    });

    it("accepts YYYY-MM-DD format", () => {
      expect(schema.safeParse("2026-09-07").success).toBe(true);
    });

    it("accepts Date instances", () => {
      expect(schema.safeParse(new Date()).success).toBe(true);
    });

    it("rejects invalid format", () => {
      expect(schema.safeParse("hello-world").success).toBe(false);
    });
  });

  describe("sortOrderEnum", () => {
    const schema = sortOrderEnum();

    it("defaults to desc", () => {
      expect(schema.parse(undefined)).toBe("desc");
    });

    it("accepts allowed sort order strings", () => {
      expect(schema.parse("asc")).toBe("asc");
      expect(schema.parse("desc")).toBe("desc");
      expect(schema.parse("1")).toBe("1");
      expect(schema.parse("-1")).toBe("-1");
      expect(schema.parse("ASC")).toBe("ASC");
      expect(schema.parse("DESC")).toBe("DESC");
    });

    it("rejects invalid sort order values", () => {
      expect(schema.safeParse("unknown").success).toBe(false);
    });
  });
});

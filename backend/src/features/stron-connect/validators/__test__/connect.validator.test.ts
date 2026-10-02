import { describe, it, expect } from "vitest";
import mongoose from "mongoose";
import connectValidators, {
  getMyConnectQuerySchema,
  listConnectScansQuerySchema,
  getConnectCatalogQuerySchema,
  scanConnectSchema,
  checkInDirectSchema,
} from "../connect.validator.js";

describe("stron-connect: connect.validator", () => {
  const validHexId = new mongoose.Types.ObjectId().toHexString();

  it("validates getMyConnectQuerySchema and listConnectScansQuerySchema", () => {
    expect(getMyConnectQuerySchema.query.safeParse({ refresh: "true" }).success).toBe(true);
    expect(listConnectScansQuerySchema.query.safeParse({ page: "1", limit: "20" }).success).toBe(true);
    expect(listConnectScansQuerySchema.query.safeParse({ limit: "150" }).success).toBe(false);
  });

  describe("getConnectCatalogQuerySchema", () => {
    it("accepts scanId when 'self'", () => {
      expect(
        getConnectCatalogQuerySchema.query.safeParse({
          scanId: "self",
        }).success,
      ).toBe(true);
    });

    it("accepts valid 24-character hex scanId", () => {
      expect(
        getConnectCatalogQuerySchema.query.safeParse({
          scanId: validHexId,
        }).success,
      ).toBe(true);
    });

    it("rejects non-self non-hex scanId via superRefine", () => {
      const result = getConnectCatalogQuerySchema.query.safeParse({
        scanId: "invalid-id-format",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Invalid scan ID format");
      }
    });

    it("accepts targetUid or businessId", () => {
      expect(
        getConnectCatalogQuerySchema.query.safeParse({
          targetUid: "target-user-1",
        }).success,
      ).toBe(true);

      expect(
        getConnectCatalogQuerySchema.query.safeParse({
          businessId: validHexId,
        }).success,
      ).toBe(true);
    });

    it("rejects query with none of scanId, targetUid, or businessId", () => {
      expect(getConnectCatalogQuerySchema.query.safeParse({}).success).toBe(false);
    });
  });

  describe("scanConnectSchema", () => {
    it("accepts payload, qr, or data", () => {
      expect(scanConnectSchema.body.safeParse({ payload: "stron://user/1" }).success).toBe(true);
      expect(scanConnectSchema.body.safeParse({ qr: "stron://user/2" }).success).toBe(true);
      expect(scanConnectSchema.body.safeParse({ data: "stron://user/3" }).success).toBe(true);
    });

    it("rejects body when none of payload, qr, or data are supplied", () => {
      expect(scanConnectSchema.body.safeParse({}).success).toBe(false);
    });
  });

  describe("checkInDirectSchema", () => {
    it("validates event check-in requiring eventKey", () => {
      expect(
        checkInDirectSchema.body.safeParse({
          type: "event",
          scanId: validHexId,
          eventKey: "event-2026",
        }).success,
      ).toBe(true);

      const missingKey = checkInDirectSchema.body.safeParse({
        type: "event",
        scanId: validHexId,
      });
      expect(missingKey.success).toBe(false);
      if (!missingKey.success) {
        expect(missingKey.error.issues[0]?.message).toContain("eventKey is required for event check-in");
      }
    });

    it("validates gym check-in requiring businessId", () => {
      expect(
        checkInDirectSchema.body.safeParse({
          type: "gym",
          scanId: validHexId,
          businessId: validHexId,
        }).success,
      ).toBe(true);

      const missingBiz = checkInDirectSchema.body.safeParse({
        type: "gym",
        scanId: validHexId,
      });
      expect(missingBiz.success).toBe(false);
      if (!missingBiz.success) {
        expect(missingBiz.error.issues[0]?.message).toContain("businessId is required for gym check-in");
      }
    });
  });
});

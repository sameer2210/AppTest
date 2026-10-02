import { z } from "zod";
import { objectIdRegex, objectIdString, optionalObjectIdString } from "../../../validators/shared.js";

const qrPayload = z.string().trim().min(1, "QR payload is required.").max(2000);

export const getMyConnectQuerySchema = {
  query: z.object({
    refresh: z.string().optional(),
    force: z.string().optional(),
  }),
};

export const listConnectScansQuerySchema = {
  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
  }),
};

export const getConnectCatalogQuerySchema = {
  query: z
    .object({
      scanId: z.string().trim().min(1).optional(),
      targetUid: z.string().trim().min(1).max(128).optional(),
      businessId: optionalObjectIdString("business ID"),
    })
    .refine((q) => Boolean(q.scanId || q.targetUid || q.businessId), {
      message: "scanId, targetUid, or businessId is required.",
    })
    .superRefine((q, ctx) => {
      if (q.scanId && q.scanId !== "self" && !objectIdRegex.test(q.scanId)) {
        ctx.addIssue({
          code: "custom",
          message: "Invalid scan ID format",
          path: ["scanId"],
        });
      }
    }),
};

export const scanConnectSchema = {
  body: z
    .object({
      payload: qrPayload.optional(),
      qr: qrPayload.optional(),
      data: qrPayload.optional(),
    })
    .refine((body) => Boolean(body.payload || body.qr || body.data), {
      message: "QR payload is required.",
    }),
};

export const checkInDirectSchema = {
  body: z
    .object({
      type: z.enum(["event", "gym"]),
      // Proof from a recent POST /scan user_connect (or gym station scan).
      scanId: objectIdString("scan ID"),
      eventKey: z.string().trim().min(1).max(120).optional(),
      businessId: optionalObjectIdString("business ID"),
      memberId: optionalObjectIdString("member ID"),
    })
    .superRefine((value, ctx) => {
      if (value.type === "event" && !value.eventKey) {
        ctx.addIssue({
          code: "custom",
          message: "eventKey is required for event check-in.",
          path: ["eventKey"],
        });
      }
      if (value.type === "gym" && !value.businessId) {
        ctx.addIssue({
          code: "custom",
          message: "businessId is required for gym check-in.",
          path: ["businessId"],
        });
      }
    }),
};

export type GetMyConnectQuery = z.infer<typeof getMyConnectQuerySchema.query>;
export type ListConnectScansQuery = z.infer<typeof listConnectScansQuerySchema.query>;
export type GetConnectCatalogQuery = z.infer<typeof getConnectCatalogQuerySchema.query>;
export type ScanConnectBody = z.infer<typeof scanConnectSchema.body>;
export type CheckInDirectBody = z.infer<typeof checkInDirectSchema.body>;

export default {
  getMyConnectQuerySchema,
  listConnectScansQuerySchema,
  getConnectCatalogQuerySchema,
  scanConnectSchema,
  checkInDirectSchema,
};

import { z } from "zod";
import { objectIdRegex, objectIdString, optionalObjectIdString } from "../../../validators/shared.js";

export const couponIdParamSchema = {
  params: z.object({
    couponId: objectIdString("coupon ID"),
  }),
};

export const createCouponSchema = {
  body: z
    .object({
      code: z.string().min(2, "Code must be at least 2 characters").max(30).trim(),
      type: z.enum(["PERCENTAGE", "FIXED_AMOUNT"]),
      discountPercentage: z.number().min(1).max(100).nullable().optional(),
      discountAmount: z.number().min(1).nullable().optional(),
      minimumOrderValue: z.number().min(0).default(0),
      maximumDiscount: z.number().min(0).nullable().optional(),
      totalCoupons: z.number().min(1).nullable().optional(),
      startsAt: z.string().optional(),
      expiresAt: z.string(),
      applicablePlanIds: z
        .array(z.string().regex(objectIdRegex))
        .optional()
        .default([]),
      status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional().default("ACTIVE"),
    })
    .refine(
      (data) => {
        if (
          data.type === "PERCENTAGE" &&
          (data.discountPercentage == null || data.discountPercentage <= 0)
        ) {
          return false;
        }
        if (
          data.type === "FIXED_AMOUNT" &&
          (data.discountAmount == null || data.discountAmount <= 0)
        ) {
          return false;
        }
        return true;
      },
      {
        message:
          "discountPercentage is required for PERCENTAGE type; discountAmount is required for FIXED_AMOUNT type",
      },
    ),
};

export const updateCouponSchema = {
  params: z.object({
    couponId: objectIdString("coupon ID"),
  }),
  body: z.object({
    discountPercentage: z.number().min(1).max(100).nullable().optional(),
    discountAmount: z.number().min(1).nullable().optional(),
    minimumOrderValue: z.number().min(0).optional(),
    maximumDiscount: z.number().min(0).nullable().optional(),
    totalCoupons: z.number().min(1).nullable().optional(),
    expiresAt: z.string().optional(),
    applicablePlanIds: z.array(z.string().regex(objectIdRegex)).optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "EXPIRED"]).optional(),
  }),
};

export const validateCouponSchema = {
  body: z.object({
    code: z.string().min(1, "Coupon code is required").trim(),
    planId: optionalObjectIdString(),
    orderAmount: z.number().min(0).optional(),
  }),
};

export const listCouponsQuerySchema = {
  query: z
    .object({
      page: z.union([z.string(), z.number()]).optional(),
      limit: z.union([z.string(), z.number()]).optional(),
      search: z.string().optional(),
      status: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
};

export type CouponIdParam = z.infer<typeof couponIdParamSchema.params>;
export type CreateCouponBody = z.infer<typeof createCouponSchema.body>;
export type UpdateCouponParams = z.infer<typeof updateCouponSchema.params>;
export type UpdateCouponBody = z.infer<typeof updateCouponSchema.body>;
export type ValidateCouponBody = z.infer<typeof validateCouponSchema.body>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema.query>;

export default {
  couponIdParamSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  listCouponsQuerySchema,
};

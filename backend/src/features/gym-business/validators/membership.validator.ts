import { z } from "zod";
import {
  nullableDateOrYmdString,
  nullableOptionalObjectIdString,
  objectIdString,
  optionalObjectIdString,
  paginationLimitString,
  paginationPageString,
  sortOrderEnum,
} from "../../../validators/shared.js";

export const membershipIdParamSchema = {
  params: z.object({
    membershipId: objectIdString("membership ID"),
  }),
};

export const createMembershipForMemberSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
  body: z.object({
    planId: objectIdString("plan ID"),
    startDate: nullableDateOrYmdString(),
    endDate: nullableDateOrYmdString(),
    status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "PAUSED"]).optional(),
    activateImmediately: z.boolean().optional(),
    discountAmount: z.number().min(0).default(0),
    finalAmount: z.number().min(0, "Final amount cannot be negative").optional(),
    couponId: nullableOptionalObjectIdString(),
    autoRenew: z.boolean().default(false),
    notes: z.string().max(500).nullable().optional(),
    purchasedAt: nullableDateOrYmdString(),
    activatedAt: nullableDateOrYmdString(),
  }),
};

export const updateMembershipSchema = {
  params: z.object({
    membershipId: objectIdString("membership ID"),
  }),
  body: z.object({
    startDate: nullableDateOrYmdString(),
    endDate: nullableDateOrYmdString(),
    status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "PAUSED"]).optional(),
    autoRenew: z.boolean().optional(),
    notes: z.string().max(500).nullable().optional(),
    purchasedAt: nullableDateOrYmdString(),
    activatedAt: nullableDateOrYmdString(),
  }),
};

export const listMembershipsQuerySchema = {
  query: z.object({
    page: paginationPageString(),
    limit: paginationLimitString(),
    memberId: optionalObjectIdString(),
    planId: optionalObjectIdString(),
    status: z
      .enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED", "PAUSED", "ALL"])
      .optional(),
    sortBy: z.string().optional(),
    sortOrder: sortOrderEnum(),
  }),
};

export const purchaseMembershipSchema = {
  body: z.object({
    businessId: objectIdString("business ID"),
    planId: objectIdString("plan ID"),
    /** Optional: resume checkout for an existing unpaid PENDING membership */
    membershipId: optionalObjectIdString(),
    couponCode: z.string().trim().optional(),
    couponId: optionalObjectIdString(),
    name: z.string().trim().min(1).max(100).optional(),
    // phone is intentionally excluded — member identity is always resolved from auth token
    email: z.string().email().optional().nullable(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().nullable(),
    notes: z.string().max(500).optional().nullable(),
    autoRenew: z.boolean().optional(),
  }),
};

/** Buyer "my plans" — no client-supplied identity query params allowed. */
export const myPurchasedPlansQuerySchema = {
  query: z
    .object({
      page: paginationPageString(),
      limit: paginationLimitString(),
    })
    .strict(),
};

export const cancelMembershipSchema = {
  params: z.object({
    membershipId: objectIdString("membership ID"),
  }),
  body: z
    .object({
      reason: z.string().max(500).optional().nullable(),
    })
    .optional(),
};

export const setAutoRenewSchema = {
  params: z.object({
    membershipId: objectIdString("membership ID"),
  }),
  body: z.object({
    autoRenew: z.boolean(),
  }),
};

export type MembershipIdParam = z.infer<typeof membershipIdParamSchema.params>;
export type CreateMembershipForMemberParams = z.infer<
  typeof createMembershipForMemberSchema.params
>;
export type CreateMembershipForMemberBody = z.infer<
  typeof createMembershipForMemberSchema.body
>;
export type UpdateMembershipParams = z.infer<typeof updateMembershipSchema.params>;
export type UpdateMembershipBody = z.infer<typeof updateMembershipSchema.body>;
export type ListMembershipsQuery = z.infer<typeof listMembershipsQuerySchema.query>;
export type PurchaseMembershipBody = z.infer<typeof purchaseMembershipSchema.body>;
export type MyPurchasedPlansQuery = z.infer<typeof myPurchasedPlansQuerySchema.query>;
export type CancelMembershipParams = z.infer<typeof cancelMembershipSchema.params>;
export type CancelMembershipBody = z.infer<typeof cancelMembershipSchema.body>;
export type SetAutoRenewParams = z.infer<typeof setAutoRenewSchema.params>;
export type SetAutoRenewBody = z.infer<typeof setAutoRenewSchema.body>;

export default {
  membershipIdParamSchema,
  createMembershipForMemberSchema,
  updateMembershipSchema,
  listMembershipsQuerySchema,
  purchaseMembershipSchema,
  myPurchasedPlansQuerySchema,
  cancelMembershipSchema,
  setAutoRenewSchema,
};

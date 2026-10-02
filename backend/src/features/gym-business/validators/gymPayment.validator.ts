import { z } from "zod";
import {
  nullableOptionalObjectIdString,
  objectIdString,
  optionalObjectIdString,
  paginationLimitString,
  paginationPageString,
  sortOrderEnum,
} from "../../../validators/shared.js";

export const paymentIdParamSchema = {
  params: z.object({
    paymentId: objectIdString("payment ID"),
  }),
};

export const memberPaymentSummaryParamSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
};

export const createManualPaymentSchema = {
  body: z.object({
    memberId: objectIdString("member ID"),
    membershipId: nullableOptionalObjectIdString(),
    couponId: nullableOptionalObjectIdString(),
    amount: z.coerce.number().gt(0, "Amount must be greater than zero"),
    discountAmount: z.coerce.number().min(0).default(0).optional(),
    finalAmount: z.coerce.number().gt(0).optional(),
    planId: nullableOptionalObjectIdString(),
    method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE"]),
    transactionId: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    paidAt: z.union([z.string(), z.date()]).optional(),
    activateMembership: z.boolean().optional(),
    membershipStatus: z.enum(["PENDING", "ACTIVE"]).optional(),
  }),
};

export const createOnlinePaymentOrderSchema = {
  body: z
    .object({
      businessId: optionalObjectIdString("business ID"),
      memberId: optionalObjectIdString("member ID"),
      membershipId: nullableOptionalObjectIdString(),
      planId: nullableOptionalObjectIdString(),
      couponId: nullableOptionalObjectIdString(),
      // Amount ignored server-side; derived from membership.finalAmount / plan.price
      amount: z.coerce.number().min(0).optional(),
      notes: z.string().max(500).nullable().optional(),
      gatewaySubscriptionId: z.string().nullable().optional(),
      gatewayCustomerId: z.string().nullable().optional(),
    })
    .refine((body) => Boolean(body.membershipId || body.planId), {
      message: "membershipId or planId is required",
    }),
};

export const verifyOnlinePaymentSchema = {
  body: z.object({
    businessId: optionalObjectIdString("business ID"),
    gatewayOrderId: z.string().min(1, "Gateway order ID is required"),
    gatewayPaymentId: z.string().min(1, "Gateway payment ID is required"),
    gatewaySignature: z.string().min(1, "Gateway signature is required"),
    activateMembership: z.boolean().optional(),
  }),
};

export const listPaymentsQuerySchema = {
  query: z.object({
    page: paginationPageString(),
    limit: paginationLimitString(),
    memberId: optionalObjectIdString(),
    status: z
      .enum(["PENDING", "SUCCESS", "FAILED", "REFUNDED", "CANCELLED", "ALL"])
      .optional(),
    method: z.enum(["CASH", "UPI", "CARD", "BANK_TRANSFER", "ONLINE", "ALL"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: sortOrderEnum(),
  }),
};

export type PaymentIdParam = z.infer<typeof paymentIdParamSchema.params>;
export type MemberPaymentSummaryParam = z.infer<typeof memberPaymentSummaryParamSchema.params>;
export type CreateManualPaymentBody = z.infer<typeof createManualPaymentSchema.body>;
export type CreateOnlinePaymentOrderBody = z.infer<
  typeof createOnlinePaymentOrderSchema.body
>;
export type VerifyOnlinePaymentBody = z.infer<typeof verifyOnlinePaymentSchema.body>;
export type ListPaymentsQuery = z.infer<typeof listPaymentsQuerySchema.query>;

export default {
  paymentIdParamSchema,
  memberPaymentSummaryParamSchema,
  createManualPaymentSchema,
  createOnlinePaymentOrderSchema,
  verifyOnlinePaymentSchema,
  listPaymentsQuerySchema,
};

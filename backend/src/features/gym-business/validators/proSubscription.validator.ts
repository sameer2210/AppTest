import { z } from "zod";

export const subscribeProSchema = {
  body: z.object({
    planCode: z.string().default("STRON_PRO"),
    billingCycle: z.enum(["MONTHLY"]).default("MONTHLY"),
    autoRenew: z.boolean().default(true),
  }),
};

export const cancelProSchema = {
  body: z.object({
    cancelReason: z.string().max(500).optional(),
  }),
};

export const syncRevenueCatSchema = {
  body: z.object({}).optional(),
};

export const activateTrialSchema = {
  body: z.object({}).optional(),
};

export const createRazorpayOrderSchema = {
  body: z
    .object({
      cycle: z.enum(["MONTHLY"]).optional(),
      billingCycle: z.enum(["MONTHLY"]).optional(),
    })
    .optional(),
};

export const verifyRazorpayPaymentSchema = {
  body: z.object({
    razorpay_order_id: z.string().min(1, "razorpay_order_id is required").trim(),
    razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required").trim(),
    razorpay_signature: z.string().min(1, "razorpay_signature is required").trim(),
  }),
};

export const pauseProSchema = {
  body: z
    .object({
      pauseDays: z.coerce.number().int().min(1).max(90).optional(),
    })
    .optional(),
};

export const resumeProSchema = {
  body: z.object({}).optional(),
};

export type SubscribeProBody = z.infer<typeof subscribeProSchema.body>;
export type CancelProBody = z.infer<typeof cancelProSchema.body>;
export type SyncRevenueCatBody = z.infer<typeof syncRevenueCatSchema.body>;
export type ActivateTrialBody = z.infer<typeof activateTrialSchema.body>;
export type CreateRazorpayOrderBody = z.infer<typeof createRazorpayOrderSchema.body>;
export type VerifyRazorpayPaymentBody = z.infer<typeof verifyRazorpayPaymentSchema.body>;
export type PauseProBody = z.infer<typeof pauseProSchema.body>;
export type ResumeProBody = z.infer<typeof resumeProSchema.body>;

export default {
  subscribeProSchema,
  cancelProSchema,
  syncRevenueCatSchema,
  activateTrialSchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  pauseProSchema,
  resumeProSchema,
};

import { z } from "zod";

export const createPayoutAccountSchema = {
  body: z.object({
    panNumber: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)")
      .nullable()
      .optional(),
    accountHolderName: z.string().min(2, "Account holder name is required").max(100),
    accountNumber: z.string().min(8, "Account number must be at least 8 digits").max(20),
    ifsc: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format (e.g. HDFC0001234)"),
    bankName: z.string().max(100).nullable().optional(),
    branchName: z.string().max(100).nullable().optional(),
    accountType: z.enum(["SAVINGS", "CURRENT"]).default("CURRENT"),
  }),
};

export const updatePayoutAccountSchema = {
  body: z.object({
    panNumber: z
      .string()
      .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN format (e.g. ABCDE1234F)")
      .nullable()
      .optional(),
    accountHolderName: z.string().min(2).max(100).optional(),
    accountNumber: z.string().min(8).max(20).optional(),
    ifsc: z
      .string()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format")
      .optional(),
    bankName: z.string().max(100).nullable().optional(),
    branchName: z.string().max(100).nullable().optional(),
    accountType: z.enum(["SAVINGS", "CURRENT"]).optional(),
  }),
};

export const verifyPayoutAccountSchema = {
  body: z.object({}).optional(),
};

export type CreatePayoutAccountBody = z.infer<typeof createPayoutAccountSchema.body>;
export type UpdatePayoutAccountBody = z.infer<typeof updatePayoutAccountSchema.body>;
export type VerifyPayoutAccountBody = z.infer<typeof verifyPayoutAccountSchema.body>;

export default {
  createPayoutAccountSchema,
  updatePayoutAccountSchema,
  verifyPayoutAccountSchema,
};

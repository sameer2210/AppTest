import { z } from "zod";
import { objectIdString, optionalObjectIdString } from "../../../validators/shared.js";
import { isValidIndianPhone } from "../../../utils/phone.util.js";

const splitPercentSchema = z.number().int().min(0).max(100);

const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .refine((value) => isValidIndianPhone(value), {
    message: "Phone must be a valid E.164 or 10-digit Indian mobile number.",
  });

export const listStaffQuerySchema = {
  query: z.object({
    status: z.enum(["ACTIVE", "PENDING", "IN_PROGRESS", "REJECTED", "ALL"]).optional(),
    tab: z.enum(["ACTIVE", "REQUESTS", "SENT"]).optional(),
  }),
};

export const proposePartnershipSchema = {
  body: z
    .object({
      memberId: optionalObjectIdString("member ID"),
      phone: phoneSchema.optional(),
      name: z.string().trim().min(2).max(100).optional(),
      role: z.enum(["TRAINER", "MODERATOR"]).optional().default("TRAINER"),
      splitPercent: splitPercentSchema,
      profileImage: z.string().url().nullable().optional(),
    })
    .refine((data) => Boolean(data.memberId || data.phone), {
      message: "Provide memberId or phone.",
    }),
};

export const staffIdParamSchema = {
  params: z.object({
    staffId: objectIdString("staff ID"),
  }),
};

export const updateProposalSchema = {
  params: z.object({
    staffId: objectIdString("staff ID"),
  }),
  body: z.object({
    splitPercent: splitPercentSchema,
  }),
};

export const applyAsTrainerSchema = {
  body: z
    .object({
      businessId: optionalObjectIdString("business ID"),
      slug: z.string().trim().min(1).max(80).optional(),
      splitPercent: splitPercentSchema,
      role: z.enum(["TRAINER", "MODERATOR"]).optional().default("TRAINER"),
    })
    .refine((data) => Boolean(data.businessId || data.slug), {
      message: "Provide businessId or slug.",
    }),
};

export const respondToProposalSchema = {
  params: z.object({
    staffId: objectIdString("staff ID"),
  }),
  body: z
    .object({
      action: z.enum(["ACCEPT", "REJECT", "COUNTER"]),
      counterOfferPercent: splitPercentSchema.optional(),
    })
    .refine(
      (data) => data.action !== "COUNTER" || data.counterOfferPercent != null,
      { message: "counterOfferPercent is required when action is COUNTER." },
    ),
};

export const setPlanTrainersSchema = {
  params: z.object({
    planId: objectIdString("plan ID"),
  }),
  body: z.object({
    trainerIds: z.array(objectIdString("trainer ID")).max(20),
  }),
};

export type ListStaffQuery = z.infer<typeof listStaffQuerySchema.query>;
export type ProposePartnershipBody = z.infer<typeof proposePartnershipSchema.body>;
export type ApplyAsTrainerBody = z.infer<typeof applyAsTrainerSchema.body>;
export type StaffIdParam = z.infer<typeof staffIdParamSchema.params>;
export type UpdateProposalBody = z.infer<typeof updateProposalSchema.body>;
export type RespondToProposalBody = z.infer<typeof respondToProposalSchema.body>;
export type SetPlanTrainersBody = z.infer<typeof setPlanTrainersSchema.body>;

export default {
  listStaffQuerySchema,
  proposePartnershipSchema,
  applyAsTrainerSchema,
  staffIdParamSchema,
  updateProposalSchema,
  respondToProposalSchema,
  setPlanTrainersSchema,
};

import { z } from "zod";
import {
  nullableOptionalObjectIdString,
  objectIdString,
} from "../../../validators/shared.js";

export const planIdParamSchema = {
  params: z.object({
    planId: objectIdString("plan ID"),
  }),
};

export const createPlanSchema = {
  body: z.object({
    name: z.string().min(2, "Plan name must be at least 2 characters").max(100),
    price: z.number().min(0, "Price cannot be negative"),
    currency: z.string().default("INR"),
    billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]),
    duration: z.number().min(1, "Duration must be at least 1"),
    durationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]).default("MONTHS"),
    isFreeTrial: z.boolean().default(false),
    trialDuration: z.number().min(0).default(0),
    convertToPlanId: nullableOptionalObjectIdString(),
    perks: z.array(z.string().trim()).default([]),
    status: z.enum(["ACTIVE", "DRAFT", "STOPPED"]).default("ACTIVE"),
    gatewayPlanId: z.string().trim().nullable().optional(),
    listingCategory: z.enum(["plan", "workshop", "class", "training"]).default("plan"),
    visibility: z.enum(["PUBLIC", "MEMBERS_ONLY", "PRIVATE"]).default("PUBLIC"),
    allowedPlanIds: z.array(objectIdString("plan ID")).optional(),
  }),
};

export const updatePlanSchema = {
  params: z.object({
    planId: objectIdString("plan ID"),
  }),
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    price: z.number().min(0).optional(),
    currency: z.string().optional(),
    billingCycle: z.enum(["MONTHLY", "QUARTERLY", "YEARLY", "ONE_TIME"]).optional(),
    duration: z.number().min(1).optional(),
    durationUnit: z.enum(["DAYS", "MONTHS", "YEARS"]).optional(),
    isFreeTrial: z.boolean().optional(),
    trialDuration: z.number().min(0).optional(),
    convertToPlanId: nullableOptionalObjectIdString(),
    perks: z.array(z.string().trim()).optional(),
    status: z.enum(["ACTIVE", "DRAFT", "STOPPED"]).optional(),
    gatewayPlanId: z.string().trim().nullable().optional(),
    listingCategory: z.enum(["plan", "workshop", "class", "training"]).optional(),
    visibility: z.enum(["PUBLIC", "MEMBERS_ONLY", "PRIVATE"]).optional(),
    allowedPlanIds: z.array(objectIdString("plan ID")).optional(),
  }),
};

export const listPlansQuerySchema = {
  query: z
    .object({
      page: z.union([z.string(), z.number()]).optional(),
      limit: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      listingCategory: z.enum(["plan", "workshop", "class", "training"]).optional(),
      sortBy: z.string().optional(),
      sortOrder: z.string().optional(),
    })
    .passthrough()
    .optional(),
};

export type PlanIdParam = z.infer<typeof planIdParamSchema.params>;
export type CreatePlanBody = z.infer<typeof createPlanSchema.body>;
export type UpdatePlanParams = z.infer<typeof updatePlanSchema.params>;
export type UpdatePlanBody = z.infer<typeof updatePlanSchema.body>;
export type ListPlansQuery = z.infer<typeof listPlansQuerySchema.query>;

export default {
  planIdParamSchema,
  createPlanSchema,
  updatePlanSchema,
  listPlansQuerySchema,
};

import { z } from "zod";

export const eventKeyParamSchema = {
  params: z.object({
    key: z.string().min(1, "Event key is required"),
  }),
};

export const catalogQuerySchema = {
  query: z.object({
    format: z.string().optional(),
  }),
};

export const createEventBodySchema = {
  body: z.object({}).passthrough(),
};

export const patchEventSchema = {
  params: z.object({
    key: z.string().min(1, "Event key is required"),
  }),
  body: z.object({}).passthrough(),
};

export const cancelEventSchema = {
  params: z.object({
    key: z.string().min(1, "Event key is required"),
  }),
  body: z.object({
    reason: z.string().max(500).optional(),
  }),
};

export const createOrderSchema = {
  params: z.object({
    key: z.string().min(1, "Event key is required"),
  }),
  body: z.object({
    ticketTypeId: z.string().optional().nullable(),
    currentStepCount: z.coerce.number().optional().nullable(),
    participantInfo: z.unknown().optional().nullable(),
    couponCode: z.string().optional().nullable(),
  }),
};

export const validateCouponSchema = {
  params: z.object({
    key: z.string().min(1, "Event key is required"),
  }),
  body: z.object({
    ticketTypeId: z.string().optional().nullable(),
    couponCode: z.string().min(1, "couponCode is required").optional().nullable(),
  }),
};

export const onboardOrganizerSchema = {
  body: z.object({}).passthrough(),
};

export const updateKycSchema = {
  body: z.object({}).passthrough(),
};

export const settlementEventKeySchema = {
  params: z.object({
    eventKey: z.string().min(1, "eventKey is required"),
  }),
};

export const rewardIdParamSchema = {
  params: z.object({
    rewardId: z.string().min(1, "rewardId is required"),
  }),
};

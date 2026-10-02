import { z } from "zod";
import { objectIdString } from "../../../validators/shared.js";
import { WHATSAPP_REMINDER_TYPES } from "../../../constants/index.js";

const reminderType = z.enum(WHATSAPP_REMINDER_TYPES);

export const reminderTypeParamSchema = {
  params: z.object({
    type: reminderType,
  }),
};

export const updateReminderConfigSchema = {
  params: z.object({
    type: reminderType,
  }),
  body: z.object({
    isActive: z.boolean().optional(),
    dayOffsets: z.array(z.number().int().min(-30).max(30)).max(10).optional(),
    audience: z.enum(["ALL", "QUEUE_TOP_N"]).optional(),
    audienceLimit: z.number().int().min(1).max(500).nullable().optional(),
    templateOverride: z.string().trim().max(1000).nullable().optional(),
  }),
};

export const sendBroadcastSchema = {
  body: z.object({
    memberIds: z.array(objectIdString("member ID")).min(1).max(200),
    message: z.string().trim().min(1).max(1000),
  }),
};

export const listMessagesQuerySchema = {
  query: z.object({
    type: z.enum([...WHATSAPP_REMINDER_TYPES, "BROADCAST"]).optional(),
    page: z.union([z.string(), z.number()]).optional(),
    limit: z.union([z.string(), z.number()]).optional(),
  }),
};

export const whatsappWebhookVerifySchema = {
  query: z.object({
    "hub.mode": z.string().optional(),
    "hub.verify_token": z.string().optional(),
    "hub.challenge": z.string().optional(),
  }),
};

export type ReminderTypeParam = z.infer<typeof reminderTypeParamSchema.params>;
export type UpdateReminderConfigBody = z.infer<typeof updateReminderConfigSchema.body>;
export type SendBroadcastBody = z.infer<typeof sendBroadcastSchema.body>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema.query>;

export default {
  reminderTypeParamSchema,
  updateReminderConfigSchema,
  sendBroadcastSchema,
  listMessagesQuerySchema,
  whatsappWebhookVerifySchema,
};

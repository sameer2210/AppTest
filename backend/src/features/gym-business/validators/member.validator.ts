import { z } from "zod";
import {
  nullableDateOrYmdString,
  objectIdString,
  paginationLimitString,
  paginationPageString,
  sortOrderEnum,
} from "../../../validators/shared.js";

export const memberIdParamSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
};

export const createMemberSchema = {
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
    phone: z.string().min(7, "Phone number is invalid").max(24).trim(),
    email: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().email("Invalid email address").nullable().optional(),
    ),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    dateOfBirth: nullableDateOrYmdString(),
    profileImage: z.string().nullable().optional(),
    joinedAt: z
      .string()
      .datetime()
      .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
      .optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional().default("ACTIVE"),
    notes: z.string().max(1000).nullable().optional(),
  }),
};

export const updateMemberSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
  body: z.object({
    name: z.string().min(2).max(100).trim().optional(),
    phone: z.string().min(7).max(24).trim().optional(),
    email: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().email().nullable().optional(),
    ),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    dateOfBirth: nullableDateOrYmdString(),
    profileImage: z.string().nullable().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED"]).optional(),
    notes: z.string().max(1000).nullable().optional(),
  }),
};

export const listMembersQuerySchema = {
  query: z.object({
    page: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).optional(),
    limit: z.union([z.string().regex(/^\d+$/), z.number().int().positive()]).optional(),
    search: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "BLOCKED", "ALL"]).optional(),
    category: z
      .enum([
        "ALL",
        "ACTIVE",
        "EXPIRED",
        "EXPIRING_SOON",
        "ABOUT_TO_EXPIRE",
        "NEW_LEADS",
        "WEEK_PLUS",
        "MORE_THAN_WEEK",
        "AUTO_RENEW",
      ])
      .optional(),
    sortBy: z
      .enum(["name", "createdAt", "joinedAt", "status", "startDate", "endDate"])
      .optional(),
    sortOrder: sortOrderEnum(),
  }),
};

export const sendPaymentReminderSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
  body: z
    .object({
      customMessage: z.string().max(500).optional(),
      channel: z.enum(["WHATSAPP", "SMS", "PUSH", "EMAIL", "IN_APP"]).optional().default("WHATSAPP"),
    })
    .optional(),
};

export type MemberIdParam = z.infer<typeof memberIdParamSchema.params>;
export type CreateMemberBody = z.infer<typeof createMemberSchema.body>;
export type UpdateMemberParams = z.infer<typeof updateMemberSchema.params>;
export type UpdateMemberBody = z.infer<typeof updateMemberSchema.body>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema.query>;
export const extendValiditySchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
  body: z.object({
    additionalDays: z.coerce.number().int().refine((value) => [7, 15, 30].includes(value), {
      message: "Validity can only be extended by 7, 15, or 30 days.",
    }),
    reason: z.string().trim().max(500).optional(),
  }),
};

export const blacklistMemberSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
  body: z
    .object({
      reason: z.string().trim().max(500).optional(),
    })
    .optional(),
};

export type SendPaymentReminderParams = z.infer<typeof sendPaymentReminderSchema.params>;
export type SendPaymentReminderBody = z.infer<typeof sendPaymentReminderSchema.body>;
export type ExtendValidityParams = z.infer<typeof extendValiditySchema.params>;
export type ExtendValidityBody = z.infer<typeof extendValiditySchema.body>;
export type BlacklistMemberParams = z.infer<typeof blacklistMemberSchema.params>;
export type BlacklistMemberBody = z.infer<typeof blacklistMemberSchema.body>;

export default {
  memberIdParamSchema,
  createMemberSchema,
  updateMemberSchema,
  listMembersQuerySchema,
  sendPaymentReminderSchema,
  extendValiditySchema,
  blacklistMemberSchema,
};

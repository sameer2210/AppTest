import { z } from "zod";

export const getDashboardSummarySchema = {
  query: z.object({
    period: z.enum(["day", "week", "month", "year"]).optional(),
    year: z.string().regex(/^\d{4}$/, "Year must be 4 digits").optional(),
  }),
};

export const getRevenueAnalyticsSchema = {
  query: z.object({
    year: z.string().regex(/^\d{4}$/, "Year must be 4 digits").optional(),
  }),
};

export const getMemberAnalyticsSchema = {
  query: z.object({
    year: z.string().regex(/^\d{4}$/, "Year must be 4 digits").optional(),
  }),
};

export const getAttendanceAnalyticsSchema = {
  query: z.object({
    period: z.enum(["day", "week", "month", "year"]).optional(),
  }),
};

export const getPlanAnalyticsSchema = {
  query: z.object({
    page: z.union([z.string(), z.number()]).optional(),
    limit: z.union([z.string(), z.number()]).optional(),
  }),
};

export const getCouponAnalyticsSchema = {
  query: z.object({
    page: z.union([z.string(), z.number()]).optional(),
    limit: z.union([z.string(), z.number()]).optional(),
  }),
};

export const getListingAnalyticsSchema = {
  query: z.object({
    tab: z.enum(["conversion_rate", "repeat_rate"]).optional(),
    page: z.union([z.string(), z.number()]).optional(),
    limit: z.union([z.string(), z.number()]).optional(),
  }),
};

export const getBrandPageAnalyticsSchema = {
  query: z.object({}),
};

export type GetDashboardSummaryQuery = z.infer<typeof getDashboardSummarySchema.query>;
export type GetRevenueAnalyticsQuery = z.infer<typeof getRevenueAnalyticsSchema.query>;
export type GetMemberAnalyticsQuery = z.infer<typeof getMemberAnalyticsSchema.query>;
export type GetAttendanceAnalyticsQuery = z.infer<
  typeof getAttendanceAnalyticsSchema.query
>;
export type GetPlanAnalyticsQuery = z.infer<typeof getPlanAnalyticsSchema.query>;
export type GetCouponAnalyticsQuery = z.infer<typeof getCouponAnalyticsSchema.query>;
export type GetListingAnalyticsQuery = z.infer<typeof getListingAnalyticsSchema.query>;

export default {
  getDashboardSummarySchema,
  getRevenueAnalyticsSchema,
  getMemberAnalyticsSchema,
  getAttendanceAnalyticsSchema,
  getPlanAnalyticsSchema,
  getCouponAnalyticsSchema,
  getListingAnalyticsSchema,
  getBrandPageAnalyticsSchema,
};

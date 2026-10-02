import { z } from "zod";

export const uidParamSchema = {
  params: z.object({
    uid: z.string().min(1, "User UID is required"),
  }),
};

export const updateUserProfileSchema = {
  params: z.object({
    uid: z.string().min(1, "User UID is required"),
  }),
  body: z.object({
    username: z.string().max(100).optional().nullable(),
    dob: z.union([z.string(), z.date(), z.number()]).optional().nullable(),
    gender: z.string().max(30).optional().nullable(),
    weight: z.coerce.number().optional().nullable(),
    height: z.coerce.number().optional().nullable(),
    location: z.string().max(200).optional().nullable(),
    shortBio: z.string().max(200).optional().nullable(),
    about: z.string().max(1000).optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    receiverName: z.string().max(100).optional().nullable(),
    addressLine1: z.string().max(200).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    state: z.string().max(100).optional().nullable(),
    pinCode: z.union([z.string(), z.number()]).optional().nullable(),
    profileImageUrl: z.string().optional().nullable(),
    stepGoal: z.coerce.number().positive().optional().nullable(),
    timezone: z.string().max(50).optional().nullable(),
    DST: z.boolean().optional(),
    interestAreas: z.array(z.string()).optional().nullable(),
    bankName: z.string().max(100).optional().nullable(),
    bankAccountNumber: z.string().max(50).optional().nullable(),
    bankIfscCode: z.string().max(20).optional().nullable(),
    onboardingRole: z.enum(["individual", "business"]).optional().nullable(),
    onboardingBusinessName: z.string().max(100).optional().nullable(),
    onboardingBusinessOffers: z.array(z.string()).optional().nullable(),
    onboardingBusinessFeatures: z.array(z.string()).optional().nullable(),
  }).passthrough(),
};

export const syncUserStepsSchema = {
  body: z.object({
    todaysStepCount: z.coerce.number().min(0, "Steps must be non-negative"),
    localDate: z.string().optional(),
    utcTimestamp: z.union([z.string(), z.number(), z.date()]).optional().nullable(),
    timezone: z.string().optional(),
    source: z.string().optional(),
  }),
};

export const syncPastStepsSchema = {
  body: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    steps: z.coerce.number().min(0, "Steps must be non-negative"),
    timezone: z.string().optional(),
    source: z.string().optional(),
  }),
};

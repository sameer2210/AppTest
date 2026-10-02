import { z } from "zod";

export const syncUserSchema = {
  body: z.object({
    uid: z.string().optional(),
    email: z.string().email().optional().nullable(),
    username: z.string().max(100).optional().nullable(),
    profileImageUrl: z.string().url().optional().nullable(),
    contactNo: z.string().max(20).optional().nullable(),
  }),
};

export const guestSignInSchema = {
  body: z.object({
    deviceId: z.string().min(8).max(160),
    platform: z.enum(["android", "ios"]),
    username: z.string().max(40).optional(),
    location: z.string().max(120).optional(),
    onboardingRole: z.enum(["individual", "business"]).optional().nullable(),
    onboardingBusinessName: z.string().max(100).optional().nullable(),
    onboardingBusinessOffers: z.array(z.string()).optional(),
    onboardingBusinessFeatures: z.array(z.string()).optional(),
  }),
};

export const sendOtpSchema = {
  body: z.object({
    phone: z.string().min(5, "Phone number is required"),
  }),
};

export const resendOtpSchema = {
  body: z.object({
    phone: z.string().min(5, "Phone number is required"),
  }),
};

export const verifyOtpSchema = {
  body: z.object({
    phone: z.string().min(5, "Phone number is required"),
    otp: z.string().min(4, "OTP is required"),
  }),
};

export const exchangeTokenSchema = {
  body: z.object({
    username: z.string().optional(),
    profileImageUrl: z.string().optional(),
  }),
};

export const refreshAccessTokenSchema = {
  body: z.object({
    refreshToken: z.string().min(1, "refreshToken is required"),
  }),
};

export const logoutSchema = {
  body: z.object({
    refreshToken: z.string().optional(),
  }),
};

import { describe, it, expect } from "vitest";
import {
  syncUserSchema,
  guestSignInSchema,
  sendOtpSchema,
  resendOtpSchema,
  verifyOtpSchema,
  exchangeTokenSchema,
  refreshAccessTokenSchema,
  logoutSchema,
} from "../auth.validator.js";
import {
  uidParamSchema,
  updateUserProfileSchema,
  syncUserStepsSchema,
  syncPastStepsSchema,
} from "../user.validator.js";
import { syncAllUsersSchema } from "../userSync.validator.js";

describe("identity-auth validators", () => {
  describe("auth.validator", () => {
    it("validates syncUserSchema, guestSignInSchema, sendOtpSchema, resendOtpSchema, verifyOtpSchema", () => {
      expect(
        syncUserSchema.body.safeParse({
          uid: "user-123",
          email: "user@stron.in",
          username: "fit_user",
        }).success,
      ).toBe(true);

      expect(
        guestSignInSchema.body.safeParse({
          deviceId: "device-12345678",
          platform: "android",
        }).success,
      ).toBe(true);
      expect(
        guestSignInSchema.body.safeParse({
          deviceId: "short",
          platform: "android",
        }).success,
      ).toBe(false);

      expect(sendOtpSchema.body.safeParse({ phone: "+919876543210" }).success).toBe(true);
      expect(sendOtpSchema.body.safeParse({ phone: "12" }).success).toBe(false);

      expect(resendOtpSchema.body.safeParse({ phone: "+919876543210" }).success).toBe(true);

      expect(verifyOtpSchema.body.safeParse({ phone: "+919876543210", otp: "1234" }).success).toBe(true);
      expect(verifyOtpSchema.body.safeParse({ phone: "+919876543210", otp: "12" }).success).toBe(false);

      expect(exchangeTokenSchema.body.safeParse({ username: "john" }).success).toBe(true);
      expect(refreshAccessTokenSchema.body.safeParse({ refreshToken: "token-abc" }).success).toBe(true);
      expect(refreshAccessTokenSchema.body.safeParse({ refreshToken: "" }).success).toBe(false);
      expect(logoutSchema.body.safeParse({ refreshToken: "token-abc" }).success).toBe(true);
    });
  });

  describe("user.validator", () => {
    it("validates uidParamSchema", () => {
      expect(uidParamSchema.params.safeParse({ uid: "usr_1" }).success).toBe(true);
      expect(uidParamSchema.params.safeParse({ uid: "" }).success).toBe(false);
    });

    it("validates updateUserProfileSchema without any any leaks", () => {
      expect(
        updateUserProfileSchema.params.safeParse({ uid: "usr_1" }).success,
      ).toBe(true);

      expect(
        updateUserProfileSchema.body.safeParse({
          username: "FitnessPro",
          dob: "1995-05-15",
          weight: "75.5",
          height: 180,
          pinCode: 560001,
          stepGoal: 10000,
        }).success,
      ).toBe(true);

      expect(
        updateUserProfileSchema.body.safeParse({
          dob: new Date(),
          pinCode: "560001",
          onboardingRole: "individual",
        }).success,
      ).toBe(true);

      expect(
        updateUserProfileSchema.body.safeParse({
          interestAreas: null,
          onboardingBusinessOffers: null,
          onboardingBusinessFeatures: null,
        }).success,
      ).toBe(true);
    });

    it("validates syncUserStepsSchema and syncPastStepsSchema", () => {
      expect(
        syncUserStepsSchema.body.safeParse({
          todaysStepCount: "8500",
          localDate: "2026-09-07",
          utcTimestamp: 1725700000000,
        }).success,
      ).toBe(true);

      expect(
        syncUserStepsSchema.body.safeParse({
          todaysStepCount: -10,
        }).success,
      ).toBe(false);

      expect(
        syncPastStepsSchema.body.safeParse({
          date: "2026-09-06",
          steps: 12000,
        }).success,
      ).toBe(true);

      expect(
        syncPastStepsSchema.body.safeParse({
          date: "invalid-date",
          steps: 12000,
        }).success,
      ).toBe(false);
    });
  });

  describe("userSync.validator", () => {
    it("validates syncAllUsersSchema", () => {
      expect(syncAllUsersSchema.query.safeParse({}).success).toBe(true);
      expect(syncAllUsersSchema.query.safeParse(undefined).success).toBe(true);
    });
  });
});

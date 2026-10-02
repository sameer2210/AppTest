import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import {
  sendPhoneOtp,
  resendPhoneOtp,
  verifyPhoneOtp,
} from "@/features/identity-auth/services/otp.service.js";
import PhoneOtp from "@/features/identity-auth/models/phoneOtp.model.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("identity-auth: otp.service", () => {
  let mongoServer: MongoMemoryServer;
  const originalEnableTest = process.env.ENABLE_TEST_OTP;
  const originalTestPhone = process.env.TEST_PHONE_NUMBER;
  const originalTestOtp = process.env.TEST_OTP_CODE;

  beforeAll(async () => {
    process.env.ENABLE_TEST_OTP = "true";
    process.env.TEST_PHONE_NUMBER = "9876543210";
    process.env.TEST_OTP_CODE = "555555";

    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    if (originalEnableTest !== undefined) {
      process.env.ENABLE_TEST_OTP = originalEnableTest;
    } else {
      delete process.env.ENABLE_TEST_OTP;
    }
    if (originalTestPhone !== undefined) {
      process.env.TEST_PHONE_NUMBER = originalTestPhone;
    } else {
      delete process.env.TEST_PHONE_NUMBER;
    }
    if (originalTestOtp !== undefined) {
      process.env.TEST_OTP_CODE = originalTestOtp;
    } else {
      delete process.env.TEST_OTP_CODE;
    }
    await mongoServer.stop();
  });

  it("should reject sending OTP for invalid phone numbers", async () => {
    await expect(sendPhoneOtp("123")).rejects.toMatchObject({
      code: "invalid_phone",
    });
    await expect(sendPhoneOtp("not-a-number")).rejects.toMatchObject({
      code: "invalid_phone",
    });
  });

  it("should send and store hashed OTP for a valid phone number", async () => {
    const phone = "9876543210";
    const result = await sendPhoneOtp(phone);
    expect(result.message).toContain("OTP sent");
    expect(result.expiresInMinutes).toBeGreaterThan(0);

    const stored = await PhoneOtp.findOne({ phone });
    expect(stored).toBeDefined();
    expect(stored!.otpHash).toBeDefined();
  });

  it("should resend OTP successfully for existing phone", async () => {
    const phone = "9876543210";
    const resend = await resendPhoneOtp(phone);
    expect(resend.message).toContain("OTP resent");
  });

  it("should return invalid_otp for malformed or incorrect length OTP", async () => {
    const verifyMalformed = await verifyPhoneOtp("9876543210", "12");
    expect(verifyMalformed.valid).toBe(false);
    expect(verifyMalformed.reason).toBe("invalid_otp");
  });

  it("should fail verification with wrong OTP code", async () => {
    const phone = "9876543210";
    const verifyWrong = await verifyPhoneOtp(phone, "999999");
    expect(verifyWrong.valid).toBe(false);
    expect(verifyWrong.reason).toBe("invalid");
  });

  it("should verify test OTP code successfully", async () => {
    const phone = "9876543210";
    const verifySuccess = await verifyPhoneOtp(phone, "555555");
    expect(verifySuccess.valid).toBe(true);
  });
});

/**
 * Phone OTP auth — Infrastructure SMS provider (APITxT) and crypto utilities.
 * Pure infrastructure service: NO domain models, NO Express Request.
 */
import crypto from "crypto";
import type { ServiceParams } from "../../types/service.util.js";
import { normalizeIndianPhone, toE164IndianPhone } from "../../utils/phone.util.js";
import { logger } from "../../utils/logger.util.js";

import { APITXT_SEND_OTP_URL } from "../../constants/index.js";
import type { ClientContext, OtpSendResult } from "../../types/auth.js";

export type { ClientContext, OtpSendResult };


const parsePositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const trimOrNull = (value: unknown): string | null => {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
};

const parseOptionalPositiveInt = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
};

export const getOtpConfig = () => {
  const expiryMinutes = parsePositiveInt(process.env.OTP_EXPIRY_MINUTES, 5);
  const resendCooldownSeconds = parsePositiveInt(
    process.env.OTP_RESEND_COOLDOWN_SECONDS,
    30,
  );

  return {
    expiryMinutes,
    expiryMs: expiryMinutes * 60 * 1000,
    resendCooldownSeconds,
    resendCooldownMs: resendCooldownSeconds * 1000,
    maxResends: parsePositiveInt(process.env.OTP_MAX_RESENDS, 3),
    maxVerifyAttempts: parsePositiveInt(process.env.OTP_MAX_VERIFY_ATTEMPTS, 5),
    otpLength: parsePositiveInt(process.env.OTP_LENGTH, 6),
    maxSendsPerPhonePerHour: parsePositiveInt(
      process.env.OTP_MAX_SENDS_PER_PHONE_PER_HOUR,
      3,
    ),
    maxSendsPerPhonePerMinute: parsePositiveInt(
      process.env.OTP_MAX_SENDS_PER_PHONE_PER_MINUTE,
      3,
    ),
    maxVerifyFailuresPerPhonePerHour: parsePositiveInt(
      process.env.OTP_MAX_VERIFY_FAILURES_PER_PHONE_PER_HOUR,
      10,
    ),
    hashPepper: trimOrNull(process.env.OTP_HASH_PEPPER),
    apitxtAuthKey: trimOrNull(process.env.APITXT_AUTH_KEY),
    apitxtTemplateId: parseOptionalPositiveInt(process.env.APITXT_TEMPLATE_ID),
    apitxtChannel: trimOrNull(process.env.APITXT_CHANNEL) || "sms",
    apitxtCountry: trimOrNull(process.env.APITXT_COUNTRY) || "91",
    enableTestOtp:
      process.env.ENABLE_TEST_OTP === "true" || process.env.ENABLE_TEST_OTP === "1",
    testPhone: trimOrNull(process.env.TEST_PHONE_NUMBER) || "9876543210",
    testOtpCode: trimOrNull(process.env.TEST_OTP_CODE) || "555555",
    isProduction: process.env.NODE_ENV === "production",
  };
};

export const isTestPhone = (phoneInput: string | null | undefined): boolean => {
  const config = getOtpConfig();
  if (!config.enableTestOtp) return false;
  const normalizedInput = normalizeIndianPhone(phoneInput);
  const normalizedTestPhone = normalizeIndianPhone(config.testPhone);
  return Boolean(
    normalizedInput &&
      normalizedTestPhone &&
      normalizedInput === normalizedTestPhone,
  );
};

export const validateOtpConfig = () => {
  const config = getOtpConfig();
  const missing: string[] = [];
  if (!config.hashPepper) missing.push("OTP_HASH_PEPPER");
  if (!config.apitxtAuthKey) missing.push("APITXT_AUTH_KEY");

  if (missing.length === 0) {
    return { valid: true, missing: [] as string[] };
  }

  const message = `OTP configuration incomplete. Missing: ${missing.join(", ")}.`;
  if (config.isProduction) {
    throw new Error(message);
  }
  logger.warn(`[OTP] ${message}`);
  return { valid: false, missing };
};

export const getPepper = (): string => {
  const pepper = getOtpConfig().hashPepper;
  if (!pepper) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_HASH_PEPPER is not configured");
    }
    return "dev-only-otp-pepper";
  }
  return pepper;
};

export const generateOtp = (): string => {
  const { otpLength } = getOtpConfig();
  const min = 10 ** (otpLength - 1);
  const max = 10 ** otpLength;
  return crypto.randomInt(min, max).toString();
};

export const hashOtp = (otp: string, phone: string): string =>
  crypto
    .createHmac("sha256", getPepper())
    .update(`${String(otp)}:${String(phone)}`)
    .digest("hex");

export const verifyOtpHash = (
  otp: string,
  phone: string,
  storedHash: string | null | undefined,
): boolean => {
  const computed = hashOtp(otp, phone);
  const computedBuf = Buffer.from(computed, "hex");
  const storedBuf = Buffer.from(String(storedHash ?? ""), "hex");
  if (computedBuf.length !== storedBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, storedBuf);
};

export const maskPhone = (phone: string | null | undefined): string => {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
};

export const getPhoneE164 = (phoneInput: unknown): string | null => {
  const phone = normalizeIndianPhone(phoneInput);
  return phone ? toE164IndianPhone(phone) : null;
};

const parseApitxtResponse = async (
  response: globalThis.Response,
): Promise<ServiceParams> => {
  const text = await response.text();
  try {
    return JSON.parse(text) as ServiceParams;
  } catch {
    return { status: "error", message: text || "Unexpected APITxT response" };
  }
};

/** Send OTP SMS via APITxT — https://apitxt.com/developer/otp-api */
export const sendOtpViaApitxt = async (
  phone: string,
  otp: string,
): Promise<OtpSendResult> => {
  const config = getOtpConfig();
  if (!config.apitxtAuthKey) {
    return {
      success: false,
      error: "APITXT_AUTH_KEY is not configured",
      statusCode: 500,
    };
  }

  const params: Record<string, string> = {
    authkey: config.apitxtAuthKey,
    mobile: phone,
    otp: String(otp),
    channel: config.apitxtChannel,
    country: config.apitxtCountry,
  };
  if (config.apitxtTemplateId != null) {
    params.template_id = String(config.apitxtTemplateId);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(APITXT_SEND_OTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams(params).toString(),
    });
  } catch (err) {
    logger.error("APITxT network error:", err);
    return {
      success: false,
      error: "Unable to reach SMS provider. Please try again.",
      statusCode: 503,
    };
  }

  const result = await parseApitxtResponse(response);
  const isSuccess = response.ok && result?.status === "success";

  if (!isSuccess) {
    const providerMessage =
      (typeof result?.message === "string" && result.message) ||
      (typeof result?.error === "string" && result.error) ||
      (typeof result === "string" ? result : "Failed to send OTP");

    logger.error("APITxT API error:", {
      httpStatus: response.status,
      status: result?.status,
      message: providerMessage,
      data: result?.data ?? null,
    });

    return {
      success: false,
      error: providerMessage,
      statusCode: response.status,
    };
  }

  const data = result?.data as ServiceParams | undefined;
  return {
    success: true,
    requestId: data?.request_id != null ? String(data.request_id) : null,
  };
};

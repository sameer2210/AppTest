/**
 * Phone OTP domain service — handles rate limiting, OTP lifecycle, persistence, and audit logging.
 * Uses shared infra OTP provider for SMS dispatch and hashing.
 * Accepts plain argument objects and DTOs (no Express Request/Response).
 */
import PhoneOtp from "../models/phoneOtp.model.js";
import OtpAuditLog from "../models/otpAuditLog.model.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { normalizeIndianPhone } from "../../../utils/phone.util.js";
import { logger } from "../../../utils/logger.util.js";
import {
  getOtpConfig,
  isTestPhone,
  generateOtp,
  hashOtp,
  verifyOtpHash,
  maskPhone,
  getPhoneE164,
  sendOtpViaApitxt,
} from "../../../services/otp/otp.service.js";
import { HOUR_MS, MINUTE_MS } from "../../../constants/index.js";
import type {
  ClientContext,
  OtpServiceError,
  OtpGateResult,
  OtpVerifyResult,
  OtpAuditParams,
  SendWindowRecord,
  IPhoneOtp,
  IOtpAuditLog,
} from "../types/index.js";

export type {
  ClientContext,
  OtpServiceError,
  OtpGateResult,
  OtpVerifyResult,
  OtpAuditParams,
};

const now = () => Date.now();

const logOtpEvent = async ({
  action,
  phone,
  reason = null,
  clientContext = null,
  providerRequestId = null,
  metadata = {},
}: OtpAuditParams) => {
  const entry = {
    phoneMasked: maskPhone(phone),
    action,
    reason,
    ip: clientContext?.ip ?? null,
    providerRequestId,
    metadata,
  };
  logger.info("[OTP Audit]", JSON.stringify(entry));
  try {
    await OtpAuditLog.create(entry);
  } catch (err) {
    logger.error("[OTP Audit] Failed to persist audit log:", getErrorMessage(err));
  }
};

const getPendingRecord = async (phone: string) =>
  PhoneOtp.findOne({ phone, status: "pending" }).sort({ createdAt: -1 });

const getRecentSendRecords = async (
  phone: string,
  windowMs: number,
): Promise<SendWindowRecord[]> => {
  const since = new Date(now() - windowMs);
  return PhoneOtp.find({
    phone,
    createdAt: { $gte: since },
    status: { $nin: ["invalidated"] },
  })
    .sort({ createdAt: 1 })
    .select({ createdAt: 1 })
    .lean();
};

const buildWindowLimitResult = (
  records: SendWindowRecord[],
  limit: number,
  windowMs: number,
  reason: string,
  messageTemplate: (limit: number) => string,
): OtpGateResult => {
  if (records.length < limit) return { allowed: true };

  const oldest = records[0];
  const retryAfterMs = oldest.createdAt.getTime() + windowMs - now();
  return {
    allowed: false,
    reason,
    retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    message: messageTemplate(limit),
  };
};

const checkPhoneSendRateLimits = async (phone: string): Promise<OtpGateResult> => {
  const config = getOtpConfig();
  const minuteGate = buildWindowLimitResult(
    await getRecentSendRecords(phone, MINUTE_MS),
    config.maxSendsPerPhonePerMinute,
    MINUTE_MS,
    "minute_limit",
    (limit: number) =>
      `Too many OTP requests for this number. You can send up to ${limit} OTPs per minute.`,
  );
  if (!minuteGate.allowed) return minuteGate;

  return buildWindowLimitResult(
    await getRecentSendRecords(phone, HOUR_MS),
    config.maxSendsPerPhonePerHour,
    HOUR_MS,
    "hourly_limit",
    (limit: number) =>
      `Too many OTP requests for this number. You can request OTP only ${limit} times per hour.`,
  );
};

const checkPhoneVerifyRateLimit = async (phone: string): Promise<OtpGateResult> => {
  if (isTestPhone(phone)) return { allowed: true };
  const config = getOtpConfig();
  const failures = await OtpAuditLog.countDocuments({
    phoneMasked: maskPhone(phone),
    action: "verify_failed",
    createdAt: { $gte: new Date(now() - HOUR_MS) },
  });

  if (failures < config.maxVerifyFailuresPerPhonePerHour) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "verify_hourly_limit",
    message:
      "Too many incorrect OTP attempts for this number. Please try again after an hour or request a new OTP later.",
  };
};

const invalidatePendingOtps = async (phone: string) => {
  await PhoneOtp.updateMany(
    { phone, status: "pending" },
    { $set: { status: "invalidated" } },
  );
};

const createPendingOtp = async (
  phone: string,
  otp: string,
  { isResend = false }: { isResend?: boolean } = {},
) => {
  const config = getOtpConfig();
  const existing = await getPendingRecord(phone);
  const resendCount = isResend ? (existing?.resendCount ?? 0) + 1 : 0;
  const timestamp = new Date();

  await invalidatePendingOtps(phone);

  return PhoneOtp.create({
    phone,
    otpHash: hashOtp(otp, phone),
    status: "pending",
    resendCount,
    verifyAttempts: 0,
    expiresAt: new Date(now() + config.expiryMs),
    lastSentAt: timestamp,
    verifiedAt: null,
    providerRequestId: null,
  });
};

const markOtpSendFailed = async (phone: string) => {
  await PhoneOtp.updateMany(
    { phone, status: "pending" },
    { $set: { status: "invalidated" } },
  );
};

const attachProviderRequestId = async (
  phone: string,
  providerRequestId: string,
) => {
  await PhoneOtp.updateOne(
    { phone, status: "pending" },
    { $set: { providerRequestId } },
  );
};

const canSendOtp = async (phone: string): Promise<OtpGateResult> => {
  if (isTestPhone(phone)) return { allowed: true };
  const config = getOtpConfig();
  const rateGate = await checkPhoneSendRateLimits(phone);
  if (!rateGate.allowed) return rateGate;

  const record = await getPendingRecord(phone);
  if (!record) return { allowed: true };

  const elapsed = now() - record.lastSentAt.getTime();
  if (elapsed < config.resendCooldownMs) {
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterSeconds: Math.ceil((config.resendCooldownMs - elapsed) / 1000),
      message: "Please wait before requesting another OTP.",
    };
  }

  return { allowed: true };
};

const canResendOtp = async (phone: string): Promise<OtpGateResult> => {
  if (isTestPhone(phone)) return { allowed: true };
  const config = getOtpConfig();
  const record = await getPendingRecord(phone);

  if (!record) {
    return {
      allowed: false,
      reason: "not_found",
      message: "No OTP request found. Please request a new OTP.",
    };
  }

  if (record.expiresAt.getTime() < now()) {
    await PhoneOtp.updateOne({ _id: record._id }, { $set: { status: "expired" } });
    return {
      allowed: false,
      reason: "expired",
      message: "OTP has expired. Please request a new OTP.",
    };
  }

  const rateGate = await checkPhoneSendRateLimits(phone);
  if (!rateGate.allowed) return rateGate;

  if (record.resendCount >= config.maxResends) {
    return {
      allowed: false,
      reason: "limit",
      message: `Resend limit reached. You can resend OTP up to ${config.maxResends} times per request.`,
    };
  }

  const elapsed = now() - record.lastSentAt.getTime();
  if (elapsed < config.resendCooldownMs) {
    return {
      allowed: false,
      reason: "cooldown",
      retryAfterSeconds: Math.ceil((config.resendCooldownMs - elapsed) / 1000),
      message: "Please wait before requesting another OTP.",
    };
  }

  return { allowed: true };
};

const verifyStoredOtp = async (
  phone: string,
  otp: string,
): Promise<OtpVerifyResult> => {
  const config = getOtpConfig();
  const testMode = isTestPhone(phone);

  if (!testMode) {
    const verifyGate = await checkPhoneVerifyRateLimit(phone);
    if (!verifyGate.allowed) {
      return {
        valid: false,
        reason: verifyGate.reason,
        message: verifyGate.message,
      };
    }
  }

  let record = await getPendingRecord(phone);

  if (!record && testMode && otp === config.testOtpCode) {
    record = await createPendingOtp(phone, config.testOtpCode);
  }

  if (!record) {
    return { valid: false, reason: "not_found", message: "Invalid OTP" };
  }

  if (record.expiresAt.getTime() < now()) {
    if (testMode && otp === config.testOtpCode) {
      record = await createPendingOtp(phone, config.testOtpCode);
    } else {
      await PhoneOtp.updateOne({ _id: record._id }, { $set: { status: "expired" } });
      return { valid: false, reason: "expired", message: "OTP expired" };
    }
  }

  if (!testMode && record.verifyAttempts >= config.maxVerifyAttempts) {
    await PhoneOtp.updateOne({ _id: record._id }, { $set: { status: "invalidated" } });
    return {
      valid: false,
      reason: "attempts_exceeded",
      message: "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  if (!verifyOtpHash(otp, phone, record.otpHash)) {
    const nextAttempts = record.verifyAttempts + 1;
    await PhoneOtp.updateOne(
      { _id: record._id, status: "pending" },
      { $set: { verifyAttempts: nextAttempts } },
    );

    const remaining = config.maxVerifyAttempts - nextAttempts;
    if (remaining <= 0) {
      await PhoneOtp.updateOne({ _id: record._id }, { $set: { status: "invalidated" } });
      return {
        valid: false,
        reason: "attempts_exceeded",
        message: "Too many incorrect attempts. Please request a new OTP.",
      };
    }

    return {
      valid: false,
      reason: "invalid",
      message: "Invalid OTP",
      attemptsRemaining: remaining,
    };
  }

  const verified = await PhoneOtp.findOneAndUpdate(
    {
      _id: record._id,
      status: "pending",
      otpHash: record.otpHash,
    },
    { $set: { status: "verified", verifiedAt: new Date() } },
    { new: true },
  );

  if (!verified) {
    return { valid: false, reason: "not_found", message: "Invalid OTP" };
  }

  return {
    valid: true,
    providerRequestId: verified.providerRequestId ?? "test-mode-request-id",
  };
};

const dispatchOtp = async (
  phone: string,
  {
    isResend = false,
    clientContext = null,
  }: { isResend?: boolean; clientContext?: ClientContext | null } = {},
) => {
  const config = getOtpConfig();
  const testMode = isTestPhone(phone);

  if (!testMode) {
    const gate = isResend ? await canResendOtp(phone) : await canSendOtp(phone);
    if (!gate.allowed) {
      await logOtpEvent({
        action: isResend ? "resend" : "send",
        phone,
        reason: gate.reason,
        clientContext,
        metadata: {
          retryAfterSeconds: gate.retryAfterSeconds ?? null,
          blocked: true,
        },
      });

      const error = new Error(
        gate.message || "Please wait before requesting another OTP.",
      ) as OtpServiceError;
      error.code = gate.reason;
      error.retryAfterSeconds = gate.retryAfterSeconds;
      throw error;
    }
  }

  const otp = testMode ? config.testOtpCode : generateOtp();
  await createPendingOtp(phone, otp, { isResend });

  if (testMode) {
    await logOtpEvent({
      action: isResend ? "resend" : "send",
      phone,
      clientContext,
      providerRequestId: "test-mode-request-id",
      metadata: { isTestMode: true },
    });

    return {
      message: isResend ? "OTP resent to phone" : "OTP sent to phone",
      requestId: "test-mode-request-id",
      expiresInMinutes: config.expiryMinutes,
    };
  }

  const sendResult = await sendOtpViaApitxt(phone, otp);
  if (sendResult.success === false) {
    await markOtpSendFailed(phone);
    await logOtpEvent({
      action: "send_failed",
      phone,
      reason: "provider_error",
      clientContext,
      providerRequestId: sendResult.requestId ?? null,
      metadata: { statusCode: sendResult.statusCode ?? null },
    });

    const error = new Error(
      sendResult.error || "Failed to send OTP",
    ) as OtpServiceError;
    error.code = "provider_error";
    error.statusCode = sendResult.statusCode;
    throw error;
  }

  if (sendResult.requestId) {
    await attachProviderRequestId(phone, sendResult.requestId);
  }

  await logOtpEvent({
    action: isResend ? "resend" : "send",
    phone,
    clientContext,
    providerRequestId: sendResult.requestId ?? null,
  });

  return {
    message: isResend ? "OTP resent to phone" : "OTP sent to phone",
    requestId: sendResult.requestId,
    expiresInMinutes: getOtpConfig().expiryMinutes,
  };
};

export const sendPhoneOtp = async (
  phoneInput: unknown,
  options: { clientContext?: ClientContext | null } = {},
) => {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) {
    const error = new Error(
      "Invalid phone number. Enter a valid 10-digit Indian mobile number.",
    ) as OtpServiceError;
    error.code = "invalid_phone";
    throw error;
  }
  return dispatchOtp(phone, { isResend: false, ...options });
};

export const resendPhoneOtp = async (
  phoneInput: unknown,
  options: { clientContext?: ClientContext | null } = {},
) => {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) {
    const error = new Error(
      "Invalid phone number. Enter a valid 10-digit Indian mobile number.",
    ) as OtpServiceError;
    error.code = "invalid_phone";
    throw error;
  }
  return dispatchOtp(phone, { isResend: true, ...options });
};

export const verifyPhoneOtp = async (
  phoneInput: unknown,
  otpInput: unknown,
  { clientContext = null }: { clientContext?: ClientContext | null } = {},
): Promise<OtpVerifyResult> => {
  const phone = normalizeIndianPhone(phoneInput);
  if (!phone) {
    return {
      valid: false,
      reason: "invalid_phone",
      message: "Invalid phone number. Enter a valid 10-digit Indian mobile number.",
    };
  }

  const { otpLength } = getOtpConfig();
  const otp = String(otpInput ?? "").trim();
  if (!new RegExp(`^\\d{${otpLength}}$`).test(otp)) {
    return {
      valid: false,
      reason: "invalid_otp",
      message: `OTP must be a ${otpLength}-digit numeric code`,
    };
  }

  const result = await verifyStoredOtp(phone, otp);

  await logOtpEvent({
    action: result.valid ? "verify_success" : "verify_failed",
    phone,
    reason: result.valid ? null : result.reason ?? null,
    clientContext,
    providerRequestId: result.providerRequestId ?? null,
    metadata: { attemptsRemaining: result.attemptsRemaining ?? null },
  });

  return result;
};

export { getPhoneE164 };

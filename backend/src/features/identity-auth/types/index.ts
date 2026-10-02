import type { Types, WithMongoId } from "../../../types/mongoose.util.js";
import type { User } from "../models/user.model.js";
import type { RefreshToken } from "../models/refreshToken.model.js";
import type { PhoneOtp } from "../models/phoneOtp.model.js";
import type { OtpAuditLog } from "../models/otpAuditLog.model.js";

// Canonical Domain Entity Types (Single Source of Truth, derived from Schema)
export type IUser = WithMongoId<User>;
export type IRefreshToken = WithMongoId<RefreshToken>;
export type IPhoneOtp = WithMongoId<PhoneOtp>;
export type IOtpAuditLog = WithMongoId<OtpAuditLog>;

// Re-export Schema Types directly for model consumers
export type { User, RefreshToken, PhoneOtp, OtpAuditLog };

// Domain Status and Enum Unions (Derived directly from Schema fields)
export type PhoneOtpStatus = PhoneOtp["status"];
export type OtpAuditAction = OtpAuditLog["action"];

import type { RequestTraceContext } from "../../../types/domain.base.js";
export type { RequestTraceContext };

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthSessionResponse {
  user: Partial<IUser>;
  token: string;
  refreshToken?: string;
  isNewUser?: boolean;
}

export type ClientContext = RequestTraceContext;
export type OtpClientContext = RequestTraceContext;

export type OtpServiceError = Error & {
  statusCode?: number;
  code?: string;
  retryAfterSeconds?: number;
  status?: number;
  details?: Record<string, unknown>;
};

export type OtpThrown = OtpServiceError;

export type OtpGateResult = {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  code?: string;
  message?: string;
};

export type OtpVerifyResult = {
  valid: boolean;
  reason?: string;
  code?: string;
  message?: string;
  attemptsLeft?: number;
  attemptsRemaining?: number;
  providerRequestId?: string | null;
  retryAfterSeconds?: number;
  blockedUntil?: Date;
};

export type OtpAuditParams = {
  action: string;
  phone: string;
  status?: "SUCCESS" | "FAILED" | "EXPIRED" | "BLOCKED";
  reason?: string | null;
  context?: ClientContext | null;
  clientContext?: ClientContext | null;
  providerRequestId?: string | null;
  failureReason?: string;
  metadata?: Record<string, unknown>;
};

export type SendWindowRecord = { createdAt: Date };


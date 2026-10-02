import type { Response } from "express";
import { logger } from "./logger.util.js";
import type { StronErrorCode } from "../types/errors.js";

const STATUS_BY_CODE: Record<StronErrorCode, number> = {
  invalid_ticket: 400,
  invalid_tickets: 400,
  invalid_marathon_mode: 400,
  destination_required: 400,
  successful_days_required: 400,
  unknown_format: 400,
  invalid_dates: 400,
  invalid_capacity: 400,
  invalid_price: 400,
  invalid_amount: 400,
  invalid_field: 400,
  validation_error: 400,
  registration_closed: 400,
  sold_out: 400,
  already_registered: 400,
  participant_info_required: 400,
  invalid_coupon: 400,
  invalid_state: 400,
  invalid_qr: 400,
  invalid_type: 400,
  bad_request: 400,
  trial_not_eligible: 400,
  trial_via_store_only: 400,
  plan_stopped: 400,
  plan_not_active: 400,
  auto_renew_not_allowed: 400,
  invalid_plan_status_transition: 400,
  payment_failed: 402,
  payment_not_configured: 503,
  service_unavailable: 503,
  payment_auth_failed: 502,
  organizer_not_verified: 403,
  organizer_profile_missing: 403,
  organizer_suspended: 403,
  business_suspended: 403,
  kyc_incomplete: 403,
  not_owner: 403,
  organizer_cannot_enroll: 403,
  listing_limit_reached: 403,
  not_enrolled: 403,
  membership_expired: 403,
  no_membership: 403,
  forbidden: 403,
  unauthorized: 401,
  not_found: 404,
  opinion_not_found: 404,
  user_not_found: 404,
  organizer_not_found: 404,
  business_not_found: 404,
  member_not_found: 404,
  plan_not_found: 404,
  membership_not_found: 404,
  coupon_not_found: 404,
  payment_not_found: 404,
  payout_account_not_found: 404,
  event_not_found: 404,
  participation_not_found: 404,
  settlement_not_found: 404,
  reward_not_found: 404,
  duplicate: 409,
  conflict: 409,
  slug_taken: 409,
  brand_page_not_found: 404,
  staff_not_found: 404,
  staff_already_exists: 409,
  invalid_split: 400,
  proposal_not_pending: 409,
  insufficient_whatsapp_credits: 402,
  reminder_config_not_found: 404,
  whatsapp_not_entitled: 403,
  whatsapp_provider_rejected: 502,
  phone_already_linked: 409,
  reminder_cooldown: 409,
  attendance_already_marked: 409,
  already_checked_in: 409,
  internal_error: 500,
  invalid_phone: 400,
  invalid_otp: 400,
  cooldown: 429,
  hourly_limit: 429,
  minute_limit: 429,
  expired: 400,
  otp_limit: 400,
  provider_error: 502,
  rate_limited: 429,
  firebase_token_invalid: 401,
};

export type CodedError = Error & { code: StronErrorCode };

export const codedError = (
  code: StronErrorCode,
  message: string,
  extras?: Record<string, unknown>,
): CodedError => {
  const error = new Error(message) as CodedError;
  error.code = code;
  if (extras) Object.assign(error, extras);
  return error;
};

const isMongoDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: number; name?: string }).code;
  const name = (error as { name?: string }).name;
  return code === 11_000 || (name === "MongoServerError" && code === 11_000);
};

export const sendError = (
  res: Response,
  error: unknown,
  fallbackStatus = 500,
) => {
  if (isMongoDuplicateKeyError(error)) {
    return res.status(409).json({
      success: false,
      code: "conflict",
      message: "Duplicate entry conflict. Resource already exists.",
    });
  }

  const code =
    error instanceof Error && typeof (error as CodedError).code === "string"
      ? ((error as CodedError).code as StronErrorCode)
      : undefined;
  const status = (code && STATUS_BY_CODE[code]) || fallbackStatus;

  if (status >= 500) {
    logger.error("[stronManaged] unexpected error:", error);
  }

  const isObjectError = error != null && typeof error === "object";
  const retryAfterSeconds =
    isObjectError &&
    "retryAfterSeconds" in error &&
    typeof (error as { retryAfterSeconds?: unknown }).retryAfterSeconds === "number"
      ? (error as { retryAfterSeconds: number }).retryAfterSeconds
      : undefined;

  const attemptsRemaining =
    isObjectError &&
    "attemptsRemaining" in error &&
    typeof (error as { attemptsRemaining?: unknown }).attemptsRemaining === "number"
      ? (error as { attemptsRemaining: number }).attemptsRemaining
      : undefined;

  return res.status(status).json({
    success: false,
    code: code || "internal_error",
    message: error instanceof Error ? error.message : "Something went wrong.",
    ...(retryAfterSeconds != null ? { retryAfterSeconds } : {}),
    ...(attemptsRemaining != null ? { attemptsRemaining } : {}),
  });
};

export default {
  codedError,
  sendError,
};

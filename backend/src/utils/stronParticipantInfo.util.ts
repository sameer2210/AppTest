/** Participant registration info fields + coupon helpers for STRON-managed events. */
import { codedError } from "./stronHttpError.util.js";
import type { ServiceParams } from "../types/service.util.js";

export const TSHIRT_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"];

export const BLOOD_GROUP_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const INDIAN_STATE_OPTIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

/** Indian mobile: optional +91 / 91 prefix, then 10 digits starting 6–9. */
const INDIAN_MOBILE_FULL = /^(?:\+91|91)?[6-9]\d{9}$/;

const normalizeLabel = (label: unknown) =>
  String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const normalizeIndianMobile = (value: unknown) => {
  const digits = String(value || "").replace(/\D/g, "");
  const local = digits.startsWith("91") && digits.length > 10 ? digits.slice(-10) : digits;
  return local;
};

/** Classify a free-form organizer field label into a control type. */
export const classifyParticipantInfoField = (label: unknown) => {
  const key = normalizeLabel(label);
  if (!key) return { type: "text", options: null };
  if (key.includes("t-shirt") || key.includes("tshirt") || key.includes("t shirt")) {
    return { type: "select", options: TSHIRT_SIZE_OPTIONS };
  }
  if (key.includes("blood")) {
    return { type: "select", options: BLOOD_GROUP_OPTIONS };
  }
  if (
    key.includes("phone") ||
    key.includes("contact number") ||
    key.includes("mobile") ||
    (key.includes("emergency") &&
      (key.includes("number") || key.includes("phone") || key.includes("mobile")))
  ) {
    return { type: "phone", options: null };
  }
  if (key === "state") {
    return { type: "select", options: INDIAN_STATE_OPTIONS };
  }
  if (key.includes("pincode") || key.includes("pin code") || key.includes("zip")) {
    return { type: "number", options: null };
  }
  return { type: "text", options: null };
};

/**
 * Normalize answers from the client into [{ field, value }].
 * Accepts array of {field,value} or a plain object map.
 */
export const normalizeParticipantInfoAnswers = (raw: unknown) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((row) => ({
        field: String(row?.field ?? row?.label ?? "").trim(),
        value: String(row?.value ?? "").trim(),
      }))
      .filter((row) => row.field);
  }
  if (typeof raw === "object") {
    return Object.entries(raw)
      .map(([field, value]) => ({
        field: String(field).trim(),
        value: String(value ?? "").trim(),
      }))
      .filter((row) => row.field);
  }
  return [];
};

/**
 * Ensure every required event field has a non-empty answer, and select fields
 * only accept allowed options.
 */
export const validateParticipantInfoAnswers = (
  requiredFields: unknown,
  answersRaw: unknown,
) => {
  const required = (Array.isArray(requiredFields) ? requiredFields : [])
    .map((f: unknown) => String(f).trim())
    .filter(Boolean);
  const answers = normalizeParticipantInfoAnswers(answersRaw);
  const byField = new Map(answers.map((a) => [a.field, a.value]));

  // Also allow case-insensitive match on field labels.
  const byNormalized = new Map(
    answers.map((a) => [normalizeLabel(a.field), a.value]),
  );

  const resolved = [];
  for (const field of required) {
    const value =
      byField.get(field) ??
      byNormalized.get(normalizeLabel(field)) ??
      "";
    if (!String(value).trim()) {
      throw codedError(
        "participant_info_required",
        `Please fill in "${field}".`,
      );
    }

    const { type, options } = classifyParticipantInfoField(field);
    let trimmed = String(value).trim();
    if (type === "select" && options && !options.includes(trimmed)) {
      throw codedError(
        "invalid_field",
        `Invalid value for "${field}".`,
      );
    }
    if (type === "phone") {
      const compact = trimmed.replace(/[\s-]/g, "");
      if (!INDIAN_MOBILE_FULL.test(compact)) {
        throw codedError(
          "invalid_field",
          `Enter a valid 10-digit Indian mobile number for "${field}".`,
        );
      }
      const local = normalizeIndianMobile(compact);
      trimmed = `+91${local}`;
    }
    if (
      normalizeLabel(field).includes("pincode") ||
      normalizeLabel(field).includes("pin code")
    ) {
      if (!/^\d{6}$/.test(trimmed)) {
        throw codedError(
          "invalid_field",
          `Enter a valid 6-digit pincode for "${field}".`,
        );
      }
    }
    resolved.push({ field, value: trimmed });
  }

  return resolved;
};

/** Resolve coupon discount in INR for a ticket price. */
export const resolveRegistrationCouponDiscount = (
  event: ServiceParams | null | undefined,
  couponCode: unknown,
  ticketPrice: number | string,
) => {
  const code = String(couponCode || "")
    .trim()
    .toUpperCase();
  if (!code) {
    return { code: null, discountRupees: 0, discountPercent: 0 };
  }

  const price = Math.max(0, Number(ticketPrice) || 0);
  const eventCoupons = Array.isArray(event?.registrationCoupons)
    ? event.registrationCoupons
    : [];

  const matched = eventCoupons.find(
    (c: ServiceParams) => String(c?.code || "").trim().toUpperCase() === code,
  );

  if (matched) {
    const matchedPercent = Math.max(
      0,
      Math.min(100, Number(matched.discountPercent) || 0),
    );
    const discount =
      matchedPercent > 0
        ? Math.min(price, Math.round((price * matchedPercent) / 100))
        : Math.min(price, Math.max(0, Math.round(Number(matched.discountRupees) || 0)));
    if (!(discount > 0)) {
      throw codedError("invalid_coupon", "This coupon has no remaining value.");
    }
    return {
      code,
      discountRupees: discount,
      discountPercent:
        matchedPercent > 0
          ? matchedPercent
          : price > 0
            ? Math.round((discount / price) * 100)
            : 0,
    };
  }

  // Global registration coupon from .env:
  // MARATHON_COUPON_CODE + MARATHON_COUPON_DISCOUNT_PERCENT
  const envCode = String(process.env.MARATHON_COUPON_CODE || "")
    .trim()
    .toUpperCase();
  const envPercent = Math.max(
    0,
    Math.min(100, Number(process.env.MARATHON_COUPON_DISCOUNT_PERCENT) || 0),
  );

  if (envCode && code === envCode) {
    if (!(envPercent > 0)) {
      throw codedError(
        "invalid_coupon",
        "Coupon discount percent is not configured on the server.",
      );
    }
    if (!(price > 0)) {
      throw codedError("invalid_coupon", "Coupons cannot be applied to free tickets.");
    }
    const discountRupees = Math.min(
      price,
      Math.round((price * envPercent) / 100),
    );
    if (!(discountRupees > 0)) {
      throw codedError("invalid_coupon", "This coupon has no remaining value.");
    }
    return { code, discountRupees, discountPercent: envPercent };
  }

  throw codedError("invalid_coupon", "Invalid coupon code.");
};

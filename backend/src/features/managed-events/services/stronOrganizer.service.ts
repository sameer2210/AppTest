// Business logic for organizer onboarding and KYC.
// Keeps controllers thin; all validation and DB writes live here.

import { UserModel } from "../../identity-auth/index.js";
import StronOrganizer from "../models/stronOrganizer.model.js";
import type { IStronOrganizer } from "../types/index.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { validatePan, validateBankAccountWithPennyDrop } from "../../../services/razorpay.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { IFSC_REGEX } from "../../../constants/index.js";


const trimOrNull = (value: unknown) => {
  const text = value == null ? "" : String(value).trim();
  return text || null;
};

// Create or update the caller's organizer profile from onboarding fields.
// V1 gate: phone OTP verified. Email is optional (placeholder used when missing).
export const upsertOrganizer = async (uid: string, payload: ServiceParams = {}) => {
  const user = await UserModel.findOne({ uid }).lean();
  if (!user) {
    throw codedError("user_not_found", "User not found.");
  }
  if (!user.phoneVerified) {
    throw codedError(
      "organizer_not_verified",
      "Verify your phone number before creating events.",
    );
  }

  const fullName = trimOrNull(payload.fullName);
  if (!fullName) {
    throw codedError("validation_error", "Full name is required.");
  }

  // Mobile comes from the verified user record (set by /api/auth/verify-otp).
  const mobileNumber = trimOrNull(user.contactNo) || trimOrNull(payload.mobileNumber);
  if (!mobileNumber) {
    throw codedError(
      "organizer_not_verified",
      "Verify your phone number before creating events.",
    );
  }

  // Email is optional for V1 phone-only onboarding; keep schema happy with a stable placeholder.
  const email =
    trimOrNull(user.email) ||
    trimOrNull(payload.email) ||
    `${uid}@users.stron.in`;

  const update: ServiceParams = {
    fullName,
    mobileNumber,
    email,
    organizationName: trimOrNull(payload.organizationName),
    website: trimOrNull(payload.website),
    instagram: trimOrNull(payload.instagram),
  };
  if (payload.accountType === "team" || payload.accountType === "individual") {
    update.accountType = payload.accountType;
  }

  const organizer = await StronOrganizer.findOneAndUpdate(
    { uid },
    { $set: update, $setOnInsert: { uid, status: "active" } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return organizer;
};

export const getOrganizer = async (uid: string) => {
  const organizer = await StronOrganizer.findOne({ uid });
  if (!organizer) {
    throw codedError("organizer_not_found", "Organizer profile not found.");
  }
  return organizer;
};

// Save settlement KYC with automated Razorpay PAN & penny-drop verification
export const updateKyc = async (uid: string, payload: ServiceParams = {}) => {
  const organizer = await StronOrganizer.findOne({ uid });
  if (!organizer) {
    throw codedError("organizer_not_found", "Organizer profile not found.");
  }

  const pan = trimOrNull(payload.pan)?.toUpperCase() || null;
  const ifsc = trimOrNull(payload.ifsc)?.toUpperCase() || null;
  const bankAccountHolderName = trimOrNull(payload.bankAccountHolderName);
  const bankAccountNumber = trimOrNull(payload.bankAccountNumber);

  if (!pan) {
    throw codedError("validation_error", "A valid PAN is required.");
  }
  const panResult = validatePan(pan);
  if (!panResult.valid) {
    throw codedError("validation_error", panResult.reason ?? "Invalid PAN.");
  }

  if (!ifsc || !IFSC_REGEX.test(ifsc)) {
    throw codedError("validation_error", "A valid IFSC code is required.");
  }
  if (!bankAccountHolderName) {
    throw codedError("validation_error", "Bank account holder name is required.");
  }
  if (!bankAccountNumber || !/^[0-9]{8,20}$/.test(bankAccountNumber)) {
    throw codedError("validation_error", "A valid bank account number (8-20 digits) is required.");
  }

  // Automated penny drop bank verification via Razorpay
  const pennyDrop = await validateBankAccountWithPennyDrop({
    accountNumber: bankAccountNumber,
    ifsc,
    accountHolderName: bankAccountHolderName,
    businessId: null,
    notes: { uid },
  });

  if (pennyDrop.status === "FAILED") {
    throw codedError("validation_error", pennyDrop.message || "Bank account verification failed via Razorpay.");
  }

  const isVerified = pennyDrop.status === "VERIFIED";

  organizer.kyc = {
    pan,
    bankAccountHolderName,
    bankAccountNumber,
    ifsc,
    verified: isVerified,
    verifiedAt: isVerified ? new Date() : null,
  };
  await organizer.save();
  return organizer;
};

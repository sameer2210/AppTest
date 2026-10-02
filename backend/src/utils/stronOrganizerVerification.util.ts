// Verification gate for organizer write actions.
// An organizer must be a verified user (email + phone) with an active organizer profile.

import { UserModel } from "../features/identity-auth/index.js";
import { StronOrganizer } from "../features/managed-events/index.js";
import { codedError } from "./stronHttpError.util.js";

// Ensure the caller may create/manage STRON events. Returns the organizer profile.
export const assertOrganizerVerified = async (uid: string) => {
  const user = await UserModel.findOne({ uid }).lean();
  if (!user) {
    throw codedError("user_not_found", "User not found.");
  }
  // V1 gate: phone OTP only (email verification is not required for create).
  if (!user.phoneVerified) {
    throw codedError(
      "organizer_not_verified",
      "Verify your phone number before creating events.",
    );
  }

  const organizer = await StronOrganizer.findOne({ uid });
  if (!organizer) {
    throw codedError(
      "organizer_profile_missing",
      "Complete organizer onboarding before creating events.",
    );
  }
  if (organizer.status === "suspended") {
    throw codedError("organizer_suspended", "Your organizer account is suspended.");
  }

  return organizer;
};

// Lightweight check used before settlement release.
export const assertKycComplete = (organizer: { isKycComplete?: () => boolean } | null | undefined) => {
  if (!organizer || !organizer.isKycComplete?.()) {
    throw codedError(
      "kyc_incomplete",
      "Complete KYC (PAN and bank details) before requesting settlement.",
    );
  }
};

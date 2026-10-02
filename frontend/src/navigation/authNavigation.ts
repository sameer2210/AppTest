import { href } from "./href";
import type { StronUser } from "../models/user";

export const hasPhoneNumber = (user?: StronUser | null): boolean => {
  if (!user) return false;
  if (user.phoneVerified === true) return true;
  const digits = String(user.contactNo || "").replace(/\D/g, "");
  return digits.length >= 10;
};

export type PostAuthOptions = {
  /**
   * From /verify-otp `isNewUser`:
   * - true  → phone was not on any account → show onboarding
   * - false → phone already linked → log into that account, skip onboarding
   */
  isNewPhoneUser?: boolean;
};

/**
 * Cold start after splash.
 * - Finished onboarding → home
 * - Phone already verified, onboarding incomplete → resume onboarding (no re-OTP)
 * - Otherwise → mobile OTP login
 */
export const resolveBootstrapRoute = (
  user?: StronUser | null,
  options?: { skipOnboarding?: boolean },
): string => {
  if (!user) {
    return href.auth.login;
  }
  if (user.onboardingRole || options?.skipOnboarding) {
    return href.app.tabs;
  }
  // Already verified mobile — continue onboarding, do not ask OTP again
  if (hasPhoneNumber(user)) {
    return href.auth.onboarding;
  }
  return href.auth.login;
};

/**
 * After successful auth (OTP / OAuth / guest).
 *
 * OTP product rules:
 * 1. Verify mobile first
 * 2. New number → assign to account → onboarding screens
 * 3. Existing number → log into that account → skip onboarding → home
 */
export const resolvePostAuthRoute = (
  user?: StronUser | null,
  options?: PostAuthOptions,
): string => {
  if (!user) {
    return href.auth.login;
  }

  // New phone account → onboarding immediately (don't bounce back to OTP)
  if (options?.isNewPhoneUser === true) {
    return href.auth.onboarding;
  }

  // Existing phone account → home (skip onboarding)
  if (options?.isNewPhoneUser === false) {
    return href.app.tabs;
  }

  if (!hasPhoneNumber(user)) {
    return href.auth.login;
  }

  if (!user.onboardingRole) {
    return href.auth.onboarding;
  }

  return href.app.tabs;
};

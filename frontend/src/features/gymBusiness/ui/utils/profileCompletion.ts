import type { GymBusinessProfile } from "@/types/gym/businessPlan.types";

/**
 * Calculates the real completion percentage (0 - 100%) for a gym business profile.
 * - Business Name: 20%
 * - Location / Address: 20%
 * - Phone / Contact: 15%
 * - Services / Feature Tags: 15%
 * - Operating Hours Schedule: 15%
 * - Bank / Payout Account Verification: 15%
 * Total = 100%
 */
export const calculateGymProfileCompletion = (
  gymProfile?: GymBusinessProfile | null,
  payoutAccount?: { isConfigured?: boolean; verificationStatus?: string } | null,
): number => {
  if (!gymProfile) return 0;

  let score = 0;

  // 1. Business Name (20%)
  const name = gymProfile.name?.trim() || gymProfile.businessName?.trim() || "";
  if (
    name &&
    name.toLowerCase() !== "unnamed" &&
    name.toLowerCase() !== "register your gym" &&
    name.toLowerCase() !== "register your business"
  ) {
    score += 20;
  }

  // 2. Address / Location (20%)
  const address = gymProfile.address?.trim() || gymProfile.location?.trim() || "";
  if (
    address &&
    address.toLowerCase() !== "unknown" &&
    !address.toLowerCase().includes("get listed on stron")
  ) {
    score += 20;
  }

  // 3. Contact Phone (15%)
  const phone = String(gymProfile.phone || "").trim();
  if (phone.length >= 8) {
    score += 15;
  }

  // 4. Services / Tags (15%)
  const services =
    Array.isArray(gymProfile.tags) && gymProfile.tags.length > 0
      ? gymProfile.tags
      : Array.isArray(gymProfile.services) && gymProfile.services.length > 0
        ? gymProfile.services
        : [];
  if (services.length > 0) {
    score += 15;
  }

  // 5. Operating Hours (15%)
  const weekly = gymProfile.operatingHours?.weeklyHours || (gymProfile as any)?.openingHours || [];
  const hasWeeklyHours =
    Array.isArray(weekly) &&
    weekly.length > 0 &&
    weekly.some(
      (h: any) =>
        h.isAvailable !== false &&
        h.isOpen !== false &&
        (Boolean(h.openTime) || Boolean(h.open) || Boolean(h.morning)),
    );
  if (hasWeeklyHours || Boolean(gymProfile.operatingHours?.todayStatus)) {
    score += 15;
  }

  // 6. Bank / Payout Account (15% total)
  // - Saved / Configured (pending verification): +10%
  // - Fully Verified by Razorpay: +15%
  if (payoutAccount?.isConfigured === true) {
    if (payoutAccount?.verificationStatus === "VERIFIED") {
      score += 15;
    } else {
      score += 10;
    }
  }

  return Math.min(100, Math.max(0, score));
};

export default calculateGymProfileCompletion;

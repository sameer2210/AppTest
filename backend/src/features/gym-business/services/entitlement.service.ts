import { computePeriodEnd, computeRenewalDisplay } from "../../../utils/proRenewal.util.js";
import type { ProPeriodEndParams, ServiceParams } from "../../../types/service.util.js";
import { expireLapsedProForBusiness } from "./proSubscription.service.js";
import { PRO_FEATURES, FREE_FEATURES } from "../../../constants/index.js";

export { PRO_FEATURES, FREE_FEATURES };


/**
 * Check if a gym business / user is entitled to a given feature
 */
export const hasFeature = async ({ businessId, userId, featureName }: ServiceParams) => {
  const normalizedFeature = String(featureName || "").toUpperCase();

  // Free tier features are universally available
  if (FREE_FEATURES.includes(normalizedFeature)) {
    return true;
  }

  const live = await expireLapsedProForBusiness({ businessId, userId });
  if (!live) {
    return false;
  }

  if (PRO_FEATURES.includes(normalizedFeature)) {
    return true;
  }

  return false;
};

/**
 * Get full entitlements profile for a gym business / user
 */
export const getBusinessEntitlements = async ({ businessId, userId }: ServiceParams) => {
  const proSub = await expireLapsedProForBusiness({ businessId, userId });
  const isPro = Boolean(proSub);
  const now = new Date();
  let daysRemaining = 0;
  let renewalText = null;
  let currentPeriodEnd = proSub?.currentPeriodEnd || null;

  if (isPro && proSub) {
    currentPeriodEnd = computePeriodEnd({
      currentPeriodEnd: proSub.currentPeriodEnd,
      currentPeriodStart: proSub.currentPeriodStart,
      startedAt: proSub.startedAt,
      createdAt: proSub.createdAt,
      status: proSub.status,
      billingCycle: proSub.billingCycle,
      now,
    } as ProPeriodEndParams);
    ({ daysRemaining, renewalText } = computeRenewalDisplay(currentPeriodEnd, now));
  }

  return {
    tier: isPro ? "PRO" : "FREE",
    isPro,
    subscriptionStatus: proSub?.status || "INACTIVE",
    expiresAt: currentPeriodEnd,
    currentPeriodEnd,
    daysRemaining,
    renewalText,
    features: isPro ? [...FREE_FEATURES, ...PRO_FEATURES] : [...FREE_FEATURES],
  };
};

/**
 * Get dynamic platform fee percentage for payments
 */
export const getPlatformFeeConfig = async ({ businessId, userId }: ServiceParams) => {
  const proSub = await expireLapsedProForBusiness({ businessId, userId });
  const isPro = Boolean(proSub);

  return {
    tier: isPro ? "PRO" : "FREE",
    platformFeePercentage: isPro ? 0 : 5,
    currency: "INR",
  };
};

export default {
  hasFeature,
  getBusinessEntitlements,
  getPlatformFeeConfig,
  PRO_FEATURES,
  FREE_FEATURES,
};

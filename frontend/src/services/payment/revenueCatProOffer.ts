import { getStronProOfferingId, REVENUECAT_ENTITLEMENT_ID } from "../../constants/stron";
import { extractStronProPrices, type StronProOfferingsPrices } from "./stronProStoreOffer";

export type StronProOfferingsMap = {
  all: Record<string, StronProOfferingLike | undefined | null>;
};

export type StronProOfferingLike = {
  identifier?: string;
  availablePackages: StronProPackageLike[];
};

export type StronProPackageLike = {
  identifier?: string;
  packageType?: string;
  product?: {
    identifier?: string;
    priceString?: string;
  };
};

export type PaywallResultMap = {
  PAYWALL_RESULT?: {
    PURCHASED?: string;
    RESTORED?: string;
    CANCELLED?: string;
    NOT_PRESENTED?: string;
    ERROR?: string;
  };
  presentPaywall?: (params?: {
    offering?: unknown;
    displayCloseButton?: boolean;
  }) => Promise<unknown>;
};

export type StronProOfferingSlot = {
  offeringMissing: boolean;
  current: StronProOfferingLike | null;
  monthly: StronProPackageLike | null;
  allPackages: StronProPackageLike[];
  pricing: StronProOfferingsPrices | null;
  trialPricing: StronProOfferingsPrices | null;
  hasStoreTrial: boolean;
};

export const PLAY_BILLING_INSTALL_MESSAGE =
  "Google Play cannot bill this USB debug install. Install STRON from Play Internal testing (same package) to complete ₹999 payment.";

export const PAYWALL_UNAVAILABLE_MESSAGE =
  "STRON PRO paywall is unavailable in this binary. Rebuild the development client after installing react-native-purchases-ui.";

export const PAYWALL_IOS_SIMULATOR_STOREKIT_MESSAGE =
  "StoreKit products are missing on iOS Simulator. Run node scripts/apply-ios-storekit.mjs, then stop and re-run npm run ios.";

export const PAYWALL_PURCHASE_FAILED_MESSAGE =
  "STRON PRO purchase did not complete. Please try again.";

export const resolveStronProOfferingIdentifier = (isTrialEligible: boolean) =>
  getStronProOfferingId(isTrialEligible);

export const findStronProOffering = (
  offerings: StronProOfferingsMap,
  isTrialEligible: boolean,
): StronProOfferingLike | null => {
  const offeringId = resolveStronProOfferingIdentifier(isTrialEligible);
  return offerings.all[offeringId] ?? null;
};

export const resolveStronProOffering = (
  offerings: StronProOfferingsMap,
  isTrialEligible: boolean,
): StronProOfferingLike => {
  const offering = findStronProOffering(offerings, isTrialEligible);
  const offeringId = resolveStronProOfferingIdentifier(isTrialEligible);
  if (!offering) {
    throw new Error(
      `STRON PRO offering "${offeringId}" was not found in RevenueCat. Publish it in the dashboard.`,
    );
  }
  return offering;
};

/** Prefer $rc_monthly from the offering; fall back to first package (for local price display only). */
export const pickOfferingPackage = (
  offering: StronProOfferingLike,
): StronProPackageLike | null => {
  const packages = offering.availablePackages ?? [];
  if (!packages.length) return null;

  const monthly = packages.find((pkg) => {
    const type = String(pkg.packageType || pkg.identifier || "").toUpperCase();
    return type.includes("MONTHLY") || type.includes("$RC_MONTHLY") || pkg.identifier === "$rc_monthly";
  });
  return monthly ?? packages[0] ?? null;
};

export const buildStronProOfferingSlot = (
  offerings: StronProOfferingsMap,
  isTrialEligible: boolean,
): StronProOfferingSlot => {
  const offering = findStronProOffering(offerings, isTrialEligible);
  if (!offering) {
    return {
      offeringMissing: true,
      current: null,
      monthly: null,
      allPackages: [],
      pricing: null,
      trialPricing: null,
      hasStoreTrial: false,
    };
  }

  const monthlyPkg = pickOfferingPackage(offering);
  const product = monthlyPkg?.product ?? null;
  const pricing = extractStronProPrices(product, { preferTrial: isTrialEligible });
  const trialPricing = extractStronProPrices(product, { preferTrial: true });
  return {
    offeringMissing: false,
    current: offering,
    monthly: monthlyPkg,
    allPackages: offering.availablePackages,
    pricing,
    trialPricing,
    hasStoreTrial: pricing.hasStoreTrial === true,
  };
};

export const customerHasStronPro = (customerInfo: {
  entitlements: { active: Record<string, unknown> };
}) => {
  const ids = [
    ...new Set(
      [REVENUECAT_ENTITLEMENT_ID, "Stron Pro Premium Plan", "stron_pro"].filter(Boolean),
    ),
  ];
  return ids.some((id) => id in customerInfo.entitlements.active);
};

export const isCancelledPaywallResult = (result: unknown, purchasesUi: PaywallResultMap) => {
  const cancelled = purchasesUi.PAYWALL_RESULT?.CANCELLED ?? "CANCELLED";
  return result === cancelled || result === "CANCELLED";
};

export const isPlayBillingDeveloperLog = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("purchaseinvaliderror") ||
    normalized.includes("signed correctly") ||
    normalized.includes("developer_error") ||
    normalized.includes("error updating purchases") ||
    normalized.includes("arguments provided are invalid")
  );
};

export const isPlayBillingDeveloperError = (error: unknown) => {
  const text = `${(error as Error)?.message || ""} ${JSON.stringify(error)}`.toLowerCase();
  return isPlayBillingDeveloperLog(text);
};

export const isBenignUiConfigLog = (message: string) => {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("ui_config") &&
    (normalized.includes("proceeding without it") ||
      normalized.includes("could not resolve remote config") ||
      normalized.includes("returning null"))
  );
};

export type PaywallOutcome =
  | { kind: "cancelled" }
  | { kind: "not_presented" }
  | { kind: "play_billing" }
  | { kind: "error" }
  | { kind: "unknown" };

export const interpretPaywallResult = (
  result: unknown,
  purchasesUi: PaywallResultMap,
): PaywallOutcome => {
  if (isCancelledPaywallResult(result, purchasesUi)) {
    return { kind: "cancelled" };
  }
  const notPresented = purchasesUi.PAYWALL_RESULT?.NOT_PRESENTED ?? "NOT_PRESENTED";
  if (result === notPresented || result === "NOT_PRESENTED") {
    return { kind: "not_presented" };
  }
  const paywallError = purchasesUi.PAYWALL_RESULT?.ERROR ?? "ERROR";
  if (result === paywallError || result === "ERROR") {
    return isPlayBillingDeveloperError(result) ? { kind: "play_billing" } : { kind: "error" };
  }
  return { kind: "unknown" };
};

import { timingSafeEqual } from "crypto";
import type { ServiceParams } from "../types/service.util.js";

/**
 * STRON PRO is a monthly-only RevenueCat IAP.
 * Trial offering `default` (Paywall B): Play stron_pro:monthly, iOS com.t21.stron.pro.montly.
 * No-trial offering `stron_pro_no_trial` (Paywall A): Play stron_pro:monthly-notrial, iOS com.t21.stron.pro.montly.notrial.
 * Entitlement `stron_pro`. Gym member plans keep MONTHLY / QUARTERLY / YEARLY separately.
 * Deprecated STRON_PRO_OFFERING_ID / STRON_PRO_OFFERING_REST_ID are the no-trial pair.
 * STRON_PRO_PRODUCT_STORE_ID / STRON_PRO_IOS_PRODUCT_ID are trial SKUs, not aliases of OFFERING_ID.
 */

export const STRON_PRO_PLAN_CODE = "STRON_PRO";
export const STRON_PRO_BILLING_CYCLE = "MONTHLY";
export const STRON_PRO_PRICE_RUPEES = 999;
export const STRON_PRO_PRICE_PAISE = 99900;
export const STRON_PRO_PRODUCT_ID =
  (process.env.REVENUECAT_STRON_PRO_PRODUCT_ID || "stron_pro").trim();
export const STRON_PRO_PRODUCT_STORE_ID =
  (process.env.REVENUECAT_STRON_PRO_PRODUCT_STORE_ID || "stron_pro:monthly").trim();
export const STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID =
  (process.env.REVENUECAT_STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID || "stron_pro:monthly-notrial").trim();
export const STRON_PRO_IOS_PRODUCT_ID =
  (process.env.REVENUECAT_STRON_PRO_IOS_PRODUCT_ID || "com.t21.stron.pro.montly").trim();
export const STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID =
  (process.env.REVENUECAT_STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID || "com.t21.stron.pro.montly.notrial").trim();
export const STRON_PRO_OFFERING_NO_TRIAL_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_NO_TRIAL_ID || "stron_pro_no_trial").trim();
export const STRON_PRO_OFFERING_TRIAL_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_TRIAL_ID || "default").trim();
/** @deprecated Alias of the no-trial offering identifier. */
export const STRON_PRO_OFFERING_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_ID || STRON_PRO_OFFERING_NO_TRIAL_ID).trim();
export const STRON_PRO_OFFERING_TRIAL_REST_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_TRIAL_REST_ID || "ofrng5de840d2e8").trim();
export const STRON_PRO_OFFERING_NO_TRIAL_REST_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_NO_TRIAL_REST_ID || "ofrngaddee2e514").trim();
/** @deprecated Alias of the no-trial offering REST id. */
export const STRON_PRO_OFFERING_REST_ID =
  (process.env.REVENUECAT_STRON_PRO_OFFERING_REST_ID || STRON_PRO_OFFERING_NO_TRIAL_REST_ID).trim();

export const getStronProCatalog = (isTrialEligible: boolean) =>
  isTrialEligible
    ? {
        offeringId: STRON_PRO_OFFERING_TRIAL_ID,
        offeringRestId: STRON_PRO_OFFERING_TRIAL_REST_ID,
        playStoreId: STRON_PRO_PRODUCT_STORE_ID,
        iosProductId: STRON_PRO_IOS_PRODUCT_ID,
      }
    : {
        offeringId: STRON_PRO_OFFERING_NO_TRIAL_ID,
        offeringRestId: STRON_PRO_OFFERING_NO_TRIAL_REST_ID,
        playStoreId: STRON_PRO_NO_TRIAL_PRODUCT_STORE_ID,
        iosProductId: STRON_PRO_NO_TRIAL_IOS_PRODUCT_ID,
      };

export const STRON_PRO_DEFAULT_ENTITLEMENT_ID = "stron_pro";
export const STRON_PRO_DASHBOARD_ENTITLEMENT_ID = "Stron Pro Premium Plan";
export const STRON_PRO_TRIAL_WAIT_DAYS = 7;
export const STRON_PRO_CURRENCY = "INR";
export const STRON_PRO_GATEWAY = "revenuecat";

export const getRevenueCatWebhookAuthKey = () =>
  (process.env.REVENUECAT_WEBHOOK_AUTH_KEY || process.env.REVENUECAT_WEBHOOK_AUTH_TOKEN || "").trim();

export const revenueCatWebhookTokenMatches = (
  authHeader: string | null | undefined,
  expectedKey: string | null | undefined,
) => {
  const token = String(authHeader || "").replace(/^Bearer\s+/i, "").trim();
  const expected = String(expectedKey || "").trim();
  if (!token || !expected) return false;
  const left = Buffer.from(token);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const getRevenueCatSecretKey = () => (process.env.REVENUECAT_SECRET_KEY || "").trim();

export const getProEntitlementIds = () => {
  const fromEnv = (process.env.REVENUECAT_ENTITLEMENT_ID || "").trim();
  return [
    ...new Set(
      [
        fromEnv,
        STRON_PRO_DASHBOARD_ENTITLEMENT_ID,
        STRON_PRO_DEFAULT_ENTITLEMENT_ID,
        "STRON_PRO",
        "pro",
      ].filter(Boolean),
    ),
  ];
};

export const pickActiveProEntitlement = (
  entitlements: Record<string, ServiceParams> = {},
  now: Date = new Date(),
) => {
  if (!entitlements || typeof entitlements !== "object") return null;
  for (const id of getProEntitlementIds()) {
    const ent = entitlements[id] as ServiceParams | undefined;
    if (!ent) continue;
    const expires = ent.expires_date || ent.expiresDate;
    if (!expires) {
      return { id, entitlement: ent };
    }
    const parsed = new Date(String(expires));
    if (!Number.isNaN(parsed.getTime()) && parsed > now) {
      return { id, entitlement: ent };
    }
  }
  return null;
};

export const isDevProSyncBypassAllowed = () =>
  process.env.NODE_ENV !== "production" && process.env.ALLOW_DEV_PRO_SYNC_BYPASS === "true";

import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Application from "expo-application";
import { getRevenueCatUiModule } from "@/provider/revenueCatUiLazy";
import { REVENUECAT_ENTITLEMENT_ID } from "@/constants/stron";
import { log, logWarn } from "@/config/devLogger";
import { isPostHogEnabled } from "@/analytics/posthog/enabled";
import { posthog } from "@/analytics/posthog/client";
import { isMongoObjectIdString, isStronProPurchaser, type StronUser } from "@/models/user";
import type { StronProOfferingsPrices } from "./stronProStoreOffer";
import {
  PAYWALL_PURCHASE_FAILED_MESSAGE,
  PAYWALL_UNAVAILABLE_MESSAGE,
  PAYWALL_IOS_SIMULATOR_STOREKIT_MESSAGE,
  PLAY_BILLING_INSTALL_MESSAGE,
  buildStronProOfferingSlot,
  customerHasStronPro,
  interpretPaywallResult,
  isBenignUiConfigLog,
  isPlayBillingDeveloperError,
  isPlayBillingDeveloperLog,
  resolveStronProOffering,
  resolveStronProOfferingIdentifier,
  type PaywallResultMap,
  type StronProOfferingSlot,
  type StronProOfferingsMap,
} from "./revenueCatProOffer";

export type { StronProOfferingsPrices };
export { resolveStronProOffering, resolveStronProOfferingIdentifier };

type PurchasesModule = typeof import("react-native-purchases");

let purchasesModule: PurchasesModule | null | undefined;
let identifiedAppUserId: string | null = null;
let syncedPurchasesForId: string | null = null;
let lastPushToken: string | null = null;
let identifyInFlight: Promise<boolean> | null = null;

export class PurchaseCancelledError extends Error {
  constructor() {
    super("Purchase cancelled");
    this.name = "PurchaseCancelledError";
  }
}

export class PurchaseLoginRequiredError extends Error {
  constructor() {
    super("Sign in to subscribe to STRON PRO.");
    this.name = "PurchaseLoginRequiredError";
  }
}

const getPurchasesModule = async (): Promise<PurchasesModule | null> => {
  if (purchasesModule !== undefined) return purchasesModule;
  try {
    purchasesModule = await import("react-native-purchases");
    return purchasesModule;
  } catch {
    purchasesModule = null;
    return null;
  }
};

const getPlatformApiKey = (): string | null => {
  if (Platform.OS === "android") {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ?? "";
    if (!key) {
      if (__DEV__) {
        logWarn("[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_ANDROID_KEY in .env");
      }
      return null;
    }
    if (!key.startsWith("goog_")) {
      logWarn("[RevenueCat] Invalid Android RevenueCat key. Expected prefix: goog_.");
      return null;
    }
    return key;
  }
  if (Platform.OS === "ios") {
    const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim() ?? "";
    if (!key) {
      if (__DEV__) {
        logWarn("[RevenueCat] Missing EXPO_PUBLIC_REVENUECAT_IOS_KEY in .env");
      }
      return null;
    }
    if (!key.startsWith("appl_")) {
      logWarn("[RevenueCat] Invalid iOS RevenueCat key. Expected prefix: appl_.");
      return null;
    }
    return key;
  }
  return null;
};

const isIosSimulator = () => Platform.OS === "ios" && !Device.isDevice;

const wrapOfferingsError = (error: unknown) => {
  if (__DEV__ && isIosSimulator()) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("offerings-empty") ||
      message.includes("could not be fetched from App Store Connect") ||
      message.includes("StoreKit Configuration")
    ) {
      throw new Error(PAYWALL_IOS_SIMULATOR_STOREKIT_MESSAGE);
    }
  }
  throw error;
};

const resolvePaywallUi = () => {
  const PurchasesUI = getRevenueCatUiModule() as
    | (PaywallResultMap & { default?: PaywallResultMap })
    | null;
  return PurchasesUI?.default ?? PurchasesUI;
};

const isPurchaseCancelled = (error: unknown, Purchases: PurchasesModule): boolean => {
  const code = (error as { code?: string; userCancelled?: boolean })?.code;
  if ((error as { userCancelled?: boolean })?.userCancelled) return true;
  const purchasesErrorCode = Purchases.default.PURCHASES_ERROR_CODE;
  return (
    code === purchasesErrorCode.PURCHASE_CANCELLED_ERROR ||
    code === "1" ||
    String(error).toLowerCase().includes("cancel")
  );
};

const installRevenueCatLogHandler = (Purchases: PurchasesModule) => {
  const LOG_LEVEL = Purchases.default.LOG_LEVEL;
  Purchases.default.setLogHandler((logLevel, message) => {
    if (!__DEV__) return;
    if (isBenignUiConfigLog(message) || isPlayBillingDeveloperLog(message)) {
      logWarn(`[RevenueCat] ${message}`);
      return;
    }

    switch (logLevel) {
      case LOG_LEVEL.ERROR:
        logWarn(`[RevenueCat] ${message}`);
        break;
      case LOG_LEVEL.WARN:
        logWarn(`[RevenueCat] ${message}`);
        break;
      default:
        log(`[RevenueCat] ${message}`);
    }
  });
};

const toE164Phone = (contactNo?: string | null): string | null => {
  const raw = String(contactNo || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
};

const resolveDeviceVendorId = async (): Promise<string | null> => {
  try {
    if (Platform.OS === "android") {
      const androidId = Application.getAndroidId()?.trim();
      return androidId || null;
    }
    if (Platform.OS === "ios") {
      const idfv = (await Application.getIosIdForVendorAsync())?.trim();
      return idfv || null;
    }
  } catch {
    return null;
  }
  return null;
};

const readPostHogDistinctId = (): string | null => {
  if (!isPostHogEnabled) return null;
  try {
    const id = (posthog as { getDistinctId?: () => string }).getDistinctId?.();
    return id ? String(id).trim() : null;
  } catch {
    return null;
  }
};

const applySubscriberAttributes = async (
  Purchases: PurchasesModule,
  user: StronUser,
  extra?: Record<string, string>,
) => {
  const displayName = (user.username || user.name || "").trim();
  const email = (user.email || "").trim();
  const phone = toE164Phone(user.contactNo);

  if (displayName) {
    await Purchases.default.setDisplayName(displayName);
  }
  if (email) {
    await Purchases.default.setEmail(email);
  }
  if (phone) {
    await Purchases.default.setPhoneNumber(phone);
  }

  try {
    await Purchases.default.collectDeviceIdentifiers();
  } catch (error) {
    logWarn("[RevenueCat] collectDeviceIdentifiers failed", error);
  }

  const custom: Record<string, string> = {
    ...(extra ?? {}),
  };
  if (user.uid) custom.firebase_uid = user.uid;
  if (Platform.OS === "ios" || Platform.OS === "android") {
    custom.platform = Platform.OS;
  }
  const vendorId = await resolveDeviceVendorId();
  if (vendorId) custom.device_vendor_id = vendorId;
  const posthogId = readPostHogDistinctId();
  if (posthogId) custom.$posthogUserId = posthogId;

  if (Object.keys(custom).length > 0) {
    await Purchases.default.setAttributes(custom);
  }
};

export type StronProOfferingsCatalog = {
  trial: StronProOfferingSlot;
  noTrial: StronProOfferingSlot;
};

export const RevenueCatService = {
  resolveStronProOfferingIdentifier,
  resolveStronProOffering,

  async ensureConfigured() {
    const Purchases = await getPurchasesModule();
    if (!Purchases) return null;

    try {
      if (await Purchases.default.isConfigured()) {
        return Purchases;
      }
    } catch {
      // First configure.
    }

    const apiKey = getPlatformApiKey();
    if (!apiKey) return null;
    installRevenueCatLogHandler(Purchases);
    Purchases.default.configure({ apiKey });
    return Purchases;
  },

  async initialize() {
    await this.ensureConfigured();
  },

  async identifyLoggedInUser(user: StronUser | null | undefined): Promise<boolean> {
    if (!isStronProPurchaser(user) || !user?.id) return false;

    if (identifyInFlight) {
      await identifyInFlight;
      if (identifiedAppUserId === user.id) return true;
    }

    const run = async (): Promise<boolean> => {
      const Purchases = await this.ensureConfigured();
      if (!Purchases) return false;

      const mongoId = user.id as string;
      let wasAnonymous = true;
      let previousAppUserId: string | null = null;
      try {
        wasAnonymous = await Purchases.default.isAnonymous();
        previousAppUserId = await Purchases.default.getAppUserID();
      } catch {
        wasAnonymous = true;
      }

      try {
        await Purchases.default.logIn(mongoId);
      } catch (error) {
        logWarn("[RevenueCat] logIn failed", error);
        return false;
      }

      identifiedAppUserId = mongoId;

      if (lastPushToken) {
        try {
          await Purchases.default.setPushToken(lastPushToken);
        } catch (error) {
          logWarn("[RevenueCat] setPushToken after logIn failed", error);
        }
      }

      await applySubscriberAttributes(Purchases, user);

      try {
        await Purchases.default.syncAttributesAndOfferingsIfNeeded();
      } catch {
        // Attributes still flush on background / purchase.
      }

      const identitySwitched = wasAnonymous || previousAppUserId !== mongoId;
      if (identitySwitched && syncedPurchasesForId !== mongoId) {
        try {
          if (typeof Purchases.default.syncPurchasesForResult === "function") {
            await Purchases.default.syncPurchasesForResult();
          } else {
            await Purchases.default.syncPurchases();
          }
          syncedPurchasesForId = mongoId;
        } catch (error) {
          logWarn("[RevenueCat] syncPurchases failed", error);
        }
      }

      return true;
    };

    identifyInFlight = run().finally(() => {
      identifyInFlight = null;
    });
    return identifyInFlight;
  },

  async syncCurrentUser() {
    await this.ensureConfigured();
  },

  async syncProfileAttributes(user: StronUser | null | undefined) {
    if (!isStronProPurchaser(user) || !user) return;
    const Purchases = await this.ensureConfigured();
    if (!Purchases) return;
    if (identifiedAppUserId !== user.id) {
      await this.identifyLoggedInUser(user);
      return;
    }
    await applySubscriberAttributes(Purchases, user);
    try {
      await Purchases.default.syncAttributesAndOfferingsIfNeeded();
    } catch {
      // Best-effort flush.
    }
  },

  async setDevicePushToken(token: string | null | undefined) {
    const trimmed = String(token || "").trim();
    if (!trimmed) return;
    lastPushToken = trimmed;
    const Purchases = await this.ensureConfigured();
    if (!Purchases) return;
    try {
      await Purchases.default.setPushToken(trimmed);
    } catch (error) {
      logWarn("[RevenueCat] setPushToken failed", error);
    }
  },

  async logOutUser() {
    const Purchases = await getPurchasesModule();
    identifiedAppUserId = null;
    syncedPurchasesForId = null;
    if (!Purchases) return;
    try {
      if (!(await Purchases.default.isConfigured())) return;
      if (await Purchases.default.isAnonymous()) return;
      await Purchases.default.logOut();
    } catch (error) {
      logWarn("[RevenueCat] logOut failed", error);
    }
  },

  async isIdentifiedAs(mongoId: string | null | undefined): Promise<boolean> {
    if (!isMongoObjectIdString(mongoId)) return false;
    const Purchases = await this.ensureConfigured();
    if (!Purchases) return false;
    try {
      if (await Purchases.default.isAnonymous()) return false;
      const current = await Purchases.default.getAppUserID();
      return current === mongoId;
    } catch {
      return identifiedAppUserId === mongoId;
    }
  },

  async getCustomerInfo() {
    const Purchases = await this.ensureConfigured();
    if (!Purchases) return null;
    try {
      return await Purchases.default.getCustomerInfo();
    } catch {
      return null;
    }
  },

  async getProOfferingsCatalog(): Promise<StronProOfferingsCatalog | null> {
    try {
      const Purchases = await this.ensureConfigured();
      if (!Purchases) return null;

      const offerings = (await Purchases.default.getOfferings()) as StronProOfferingsMap;
      return {
        trial: buildStronProOfferingSlot(offerings, true),
        noTrial: buildStronProOfferingSlot(offerings, false),
      };
    } catch {
      return null;
    }
  },

  async getProOfferings(isTrialEligible = false) {
    const catalog = await this.getProOfferingsCatalog();
    if (!catalog) return null;
    return isTrialEligible ? catalog.trial : catalog.noTrial;
  },

  // Checkout is RevenueCat Paywalls UI only — no purchasePackage / getProducts fallback.
  async presentStronProPaywall(opts: {
    user: StronUser | null | undefined;
    businessId?: string;
    isTrialEligible: boolean;
  }) {
    if (!isStronProPurchaser(opts.user) || !opts.user) {
      throw new PurchaseLoginRequiredError();
    }

    const identified = await this.identifyLoggedInUser(opts.user);
    if (!identified) {
      throw new PurchaseLoginRequiredError();
    }

    const Purchases = await getPurchasesModule();
    if (!Purchases) throw new Error("RevenueCat native module is unavailable in this build");

    const isAnonymous = await Purchases.default.isAnonymous();
    const appUserID = await Purchases.default.getAppUserID();
    if (isAnonymous || appUserID !== opts.user.id) {
      throw new PurchaseLoginRequiredError();
    }

    const attributes: Record<string, string> = {
      purchase_type: "stron_pro_subscription",
      billing_cycle: "MONTHLY",
    };
    if (opts.businessId) {
      attributes.business_id = String(opts.businessId);
    }
    await applySubscriberAttributes(Purchases, opts.user, attributes);

    try {
      await Purchases.default.syncAttributesAndOfferingsIfNeeded();
    } catch {
      // Offerings may still load from cache.
    }

    if (await this.hasEntitlementAccess()) {
      return Purchases.default.getCustomerInfo();
    }

    const ui = resolvePaywallUi();
    if (!ui || typeof ui.presentPaywall !== "function") {
      throw new Error(PAYWALL_UNAVAILABLE_MESSAGE);
    }

    try {
      await Purchases.default.syncAttributesAndOfferingsIfNeeded();
    } catch {
      // Offerings may still load from cache.
    }

    let offerings: StronProOfferingsMap = { all: {} } as StronProOfferingsMap;
    try {
      offerings = (await Purchases.default.getOfferings()) as StronProOfferingsMap;
    } catch (error) {
      wrapOfferingsError(error);
    }
    const offering = resolveStronProOffering(offerings, opts.isTrialEligible);

    let result: unknown;
    try {
      result = await ui.presentPaywall({
        offering,
        displayCloseButton: true,
      });
    } catch (error) {
      if (isPurchaseCancelled(error, Purchases)) {
        throw new PurchaseCancelledError();
      }
      if (isPlayBillingDeveloperError(error)) {
        throw new Error(PLAY_BILLING_INSTALL_MESSAGE);
      }
      throw error;
    }

    const outcome = interpretPaywallResult(result, ui);
    if (outcome.kind === "cancelled") {
      throw new PurchaseCancelledError();
    }
    if (outcome.kind === "not_presented") {
      throw new Error(PAYWALL_UNAVAILABLE_MESSAGE);
    }

    const customerInfo = await Purchases.default.getCustomerInfo();
    if (customerHasStronPro(customerInfo) || (await this.hasEntitlementAccess())) {
      return customerInfo;
    }

    if (outcome.kind === "play_billing") {
      throw new Error(PLAY_BILLING_INSTALL_MESSAGE);
    }
    if (outcome.kind === "error") {
      throw new Error(PAYWALL_PURCHASE_FAILED_MESSAGE);
    }

    throw new Error("Monthly STRON PRO purchase did not activate. Please try again.");
  },

  async restorePurchases(user?: StronUser | null) {
    if (user && !isStronProPurchaser(user)) {
      throw new PurchaseLoginRequiredError();
    }
    if (user) {
      await this.identifyLoggedInUser(user);
    } else {
      await this.ensureConfigured();
    }

    const Purchases = await getPurchasesModule();
    if (!Purchases) throw new Error("RevenueCat native module is unavailable in this build");

    try {
      if (await Purchases.default.isAnonymous()) {
        throw new PurchaseLoginRequiredError();
      }
      return await Purchases.default.restorePurchases();
    } catch (error) {
      if (error instanceof PurchaseLoginRequiredError) throw error;
      if (isPurchaseCancelled(error, Purchases)) {
        throw new PurchaseCancelledError();
      }
      throw error;
    }
  },

  async hasEntitlementAccess(
    entitlementId = REVENUECAT_ENTITLEMENT_ID || "stron_pro",
  ): Promise<boolean> {
    const Purchases = await this.ensureConfigured();
    if (!Purchases) return false;

    try {
      const customerInfo = await Purchases.default.getCustomerInfo();
      const ids = [
        ...new Set(
          [entitlementId, REVENUECAT_ENTITLEMENT_ID, "Stron Pro Premium Plan", "stron_pro"].filter(
            Boolean,
          ),
        ),
      ];
      return ids.some((id) => id in customerInfo.entitlements.active);
    } catch {
      return false;
    }
  },
};

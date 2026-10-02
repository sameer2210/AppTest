import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Non-EXPO_PUBLIC_ vars are embedded in app.config.js `extra` at build time
// via Expo public env vars.
const _extra = Constants.expoConfig?.extra as Record<string, string> | undefined;

const getMetroHostIp = (): string | null => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.developer?.manifest?.debuggerHost ||
    (Constants as any).hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    if (ip && ip !== "localhost" && ip !== "127.0.0.1") {
      return ip;
    }
  }
  return null;
};

const localPortFrom = (url: string, fallback = "8000") => {
  try {
    const match = String(url || "").match(/:(\d+)/);
    return match ? match[1] : fallback;
  } catch {
    return fallback;
  }
};

const resolveBackendUrl = () => {
  // In __DEV__, prefer Metro-inlined EXPO_PUBLIC_* so .env changes apply
  // after a Metro restart without requiring a native rebuild. Native
  // Constants.expoConfig.extra is only updated on expo run:android / prebuild.
  const fromEnv = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "";
  const fromEnvPhysical = process.env.EXPO_PUBLIC_API_BASE_URL_PHYSICAL?.trim() || "";
  const fromExtra = _extra?.apiBaseUrl?.trim() || "";
  const fromExtraPhysical = _extra?.apiBaseUrlPhysical?.trim() || "";

  let apiBaseUrl = (__DEV__ ? fromEnv || fromExtra : fromExtra || fromEnv) || "";
  let apiBaseUrlPhysical =
    (__DEV__ ? fromEnvPhysical || fromExtraPhysical : fromExtraPhysical || fromEnvPhysical) || "";

  if (__DEV__) {
    const metroIp = getMetroHostIp();

    // Physical device (phone over Wi-Fi)
    if (Device.isDevice) {
      // 1. If physical API base URL is explicitly set and points to an IP/host, use it
      if (
        apiBaseUrlPhysical &&
        !apiBaseUrlPhysical.includes("127.0.0.1") &&
        !apiBaseUrlPhysical.includes("localhost")
      ) {
        return apiBaseUrlPhysical;
      }
      // 2. If Metro host IP is detected (Wi-Fi IP of development machine), route to that machine on port 8000
      if (metroIp) {
        const port = localPortFrom(apiBaseUrlPhysical || apiBaseUrl || "http://127.0.0.1:8000");
        return `http://${metroIp}:${port}`;
      }
      // 3. Fallback candidate
      if (apiBaseUrlPhysical) return apiBaseUrlPhysical;
      if (apiBaseUrl && !apiBaseUrl.includes("127.0.0.1") && !apiBaseUrl.includes("localhost")) {
        return apiBaseUrl;
      }
      return "https://apiv2.stron.in";
    }

    // Emulator / simulator
    const fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
    const host = metroIp || fallbackHost;

    if (apiBaseUrlPhysical.includes("localhost") || apiBaseUrlPhysical.includes("127.0.0.1")) {
      apiBaseUrlPhysical = apiBaseUrlPhysical.replace(/localhost|127\.0\.0\.1/g, host);
    }
    if (apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1")) {
      apiBaseUrl = apiBaseUrl.replace(/localhost|127\.0\.0\.1/g, host);
    }
  }

  return apiBaseUrl || "https://apiv2.stron.in";
};

export const getBackendUrl = (): string => resolveBackendUrl();
export const STRON_BACKEND_URL = getBackendUrl();

if (__DEV__) {
  console.log(
    "[APP_NETWORK] Backend:",
    STRON_BACKEND_URL,
    Device.isDevice ? "(physical device)" : "(emulator/simulator)",
  );
}

/**
 * Global registration coupon from .env.
 * Prefer EXPO_PUBLIC_* so Metro inlines updates after restart; fall back to
 * app.config `extra` / plain MARATHON_* keys.
 */
export const MARATHON_COUPON_CODE: string = (
  process.env.EXPO_PUBLIC_MARATHON_COUPON_CODE ||
  _extra?.marathonCouponCode ||
  process.env.MARATHON_COUPON_CODE ||
  ""
).trim();

export const MARATHON_COUPON_DISCOUNT_PERCENT: number = Math.max(
  0,
  Math.min(
    100,
    Number(
      process.env.EXPO_PUBLIC_MARATHON_COUPON_DISCOUNT_PERCENT ||
        _extra?.marathonCouponDiscountPercent ||
        process.env.MARATHON_COUPON_DISCOUNT_PERCENT ||
        0,
    ) || 0,
  ),
);

/**
 * RevenueCat STRON PRO identifiers (must match dashboard).
 * Checkout is Paywalls UI only — offerings select the RC paywall; SKUs live in the dashboard.
 */
export const REVENUECAT_ENTITLEMENT_ID = "Stron Pro Premium Plan";
export const STRON_PRO_OFFERING_NO_TRIAL_ID = "stron_pro_no_trial";
/** Dashboard identifier for the trial offering (Paywall B). */
export const STRON_PRO_OFFERING_TRIAL_ID = "default";

export const getStronProOfferingId = (isTrialEligible: boolean) =>
  isTrialEligible ? STRON_PRO_OFFERING_TRIAL_ID : STRON_PRO_OFFERING_NO_TRIAL_ID;

export const APP_IDENTITY = {
  iosBundleId: "com.t21.stron",
  iosAppStoreId: "6776768421",
  androidPackage: "com.stepwars.stepwarsnew_app",
  iosAppStoreUrl: "https://apps.apple.com/app/id6776768421",
  androidPlayStoreUrl:
    "https://play.google.com/store/apps/details?id=com.stepwars.stepwarsnew_app",
} as const;

export const UPLOAD_FOLDERS = {
  profile: "Profile pic",
  clanBanner: "Clan banners",
} as const;

/** @deprecated Cloudinary removed — use UPLOAD_FOLDERS with ImageUploadService / R2. */
export const CLOUDINARY = {
  cloudName: "",
  profileUploadPreset: "",
  profileFolder: UPLOAD_FOLDERS.profile,
  clanBannerUploadPreset: "",
  clanBannerFolder: UPLOAD_FOLDERS.clanBanner,
} as const;

export const GAME_ECONOMY = {
  koDiff: 200,
  draw: 50,
  battleTimeMinutes: 10,
  matchmakingTimeoutSeconds: 15,
  multiplier1_5x: 150,
  multiplier2x: 200,
  multiplier3x: 300,
  koBonus: 5000,
  drawBonus: 1000,
  bronzeBox: 1000,
  silverBox: 5000,
  goldBox: 10000,
  debounceDurationSeconds: 15,
} as const;

export const TAB_KEYS = {
  HOME: "index",
  EXPLORE: "explore",
  ACTIVITY: "activity",
  KINGDOM: "kingdom",
  EVENTS: "events",
} as const;

export const BRAND = {
  primaryYellow: "#FDD85D",
  primaryOrange: "#FF6B35",
  secondaryTeal: "#4ECDC4",
  backgroundDark: "#121212",
  headerBlue: "#0D1B3E",
  cardBlue: "#192B44",
  gradientTop: "#042656",
  gradientBottom: "#070707",
  tabIndicator: "#0000FF",
} as const;

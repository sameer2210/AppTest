import PostHog from "posthog-react-native";
import { Platform } from "react-native";
import { StronUser } from "@/models/user";
import { isPostHogEnabled, getPostHogApiKey } from "./enabled";

const rawApiKey = getPostHogApiKey();
const posthogApiKey = rawApiKey || "dummy_api_key_for_dev";
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

if (__DEV__) {
  if (isPostHogEnabled) {
    console.log("✅ [PostHog] Initialized successfully");
  } else if (!rawApiKey) {
    console.log("ℹ️ [PostHog] Skipping — EXPO_PUBLIC_POSTHOG_API_KEY is empty");
  } else {
    console.log("ℹ️ [PostHog] Skipping — API URL does not include apiv2");
  }
}

export { isPostHogEnabled, getPostHogApiKey } from "./enabled";

export const posthog = new PostHog(posthogApiKey, {
  host: posthogHost,
  captureAppLifecycleEvents: false,
  enableSessionReplay: isPostHogEnabled,
  preloadFeatureFlags: isPostHogEnabled,
  disabled: !isPostHogEnabled,
  flushAt: 1,
  flushInterval: 2000,
  remoteConfigRequestTimeoutMs: 15000,
  featureFlagsRequestTimeoutMs: 15000,
  requestTimeout: 15000,
  fetchRetryCount: 3,
  fetchRetryDelay: 2000,
  disableSurveys: true,
  errorTracking: {
    autocapture: {
      uncaughtExceptions: false,
      unhandledRejections: false,
      console: [],
    },
  },
});

export const registerSuperProperties = (appVersion: string) => {
  if (!isPostHogEnabled) return;
  posthog.register({
    source: "client",
    platform: "mobile",
    device: Platform.OS,
    appVersion,
    device_os: Platform.OS,
    device_os_version: Platform.Version.toString(),
  });
};

export type IdentifyTraits = {
  plan?: string;
  is_premium?: boolean;
  language?: string;
};

export const identifyUser = (user: StronUser, traits?: IdentifyTraits) => {
  if (!isPostHogEnabled || !user?.uid) return;
  posthog.identify(user.uid, {
    ...(user.email ? { email: user.email } : {}),
    ...(user.username ? { name: user.username } : {}),
    ...(traits?.plan !== undefined && { plan: traits.plan }),
    ...(traits?.is_premium !== undefined && { is_premium: traits.is_premium }),
    ...(traits?.language !== undefined && { language: traits.language }),
  });
};

export const resetAnalyticsUser = () => {
  if (!isPostHogEnabled) return;
  posthog.reset();
};

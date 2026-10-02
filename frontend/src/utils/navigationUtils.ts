import { router } from "expo-router";
import { logFirebaseScreenView } from "../analytics/firebase/client";
import { setClarityScreenName } from "../analytics/clarity";
import { posthog } from "../analytics/posthog/client";
import { isPostHogEnabled } from "../analytics/posthog/enabled";

export const logScreenViewForAnalytics = async (routeKey: string): Promise<void> => {
  await logFirebaseScreenView(routeKey);
  setClarityScreenName(routeKey);
  if (!isPostHogEnabled) return;
  try {
    posthog.screen(routeKey);
  } catch {
    // Analytics must never break navigation.
  }
};

// Deprecated: prefer router from expo-router at call sites
export const goBack = (navigation?: { goBack?: () => void }) => {
  if (navigation?.goBack) {
    navigation.goBack();
    return;
  }
  if (router.canGoBack()) {
    router.back();
  }
};

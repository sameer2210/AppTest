import { logLogin } from "@react-native-firebase/analytics";
import { isAndroid } from "@/utils/platform";
import { logError } from "@/config/devLogger";
import { analyticsInstance, isTrackingEnabled, setDataCollection } from "./client";

/**
 * Enable Firebase Analytics collection after login.
 * Safe to call multiple times.
 */
export const trackingInitialization = async () => {
  try {
    if (isTrackingEnabled()) {
      await setDataCollection(true);
    }
  } catch (error) {
    logError("Error during tracking initialization:", error);
    try {
      await setDataCollection(false);
    } catch {
      // ignore
    }
  }
};

export const trackingLogin = async () => {
  if (!isTrackingEnabled()) return;
  const analytics = analyticsInstance();
  if (!analytics) return;
  await logLogin(analytics, {
    method: isAndroid() ? "google" : "apple",
  });
};

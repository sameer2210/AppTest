import { registerSuperProperties, trackingInitialization, trackingLogin } from "../analytics";
import { initializeClarity } from "../analytics/clarity";
import { getAppVersion } from "../utils/appVersion";
import { logError } from "../config/devLogger";

let postLoginPermissionsInitialized = false;

/**
 * After authentication only: enable analytics → Clarity / login events.
 * Must not run on onboarding / pre-login screens.
 */
export const initializePostLoginPermissions = async (): Promise<void> => {
  if (postLoginPermissionsInitialized) return;
  postLoginPermissionsInitialized = true;

  try {
    await trackingInitialization();
    registerSuperProperties(getAppVersion());
    initializeClarity();
    await trackingLogin();
  } catch (error) {
    logError("[PostLoginPermissions] init failed", error);
  }
};

export const resetPostLoginPermissionsState = (): void => {
  postLoginPermissionsInitialized = false;
};

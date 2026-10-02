import { Platform } from "react-native";
import {
  activate,
  fetchAndActivate,
  getBoolean,
  getString,
  onConfigUpdate,
  setConfigSettings,
  setDefaults,
} from "@react-native-firebase/remote-config";
import { REMOTE_CONFIG_DEFAULTS } from "@/constants/remoteConfigDefaults";
import { logError, logInfo } from "@/config/devLogger";
import { getComparableAppVersion, isVersionLessThan } from "@/utils/appVersion";
import { getFirebaseRemoteConfig } from "./firebase.service";

export type AppBlockerType = "maintenance" | "update" | null;

export type AppBlockerState = {
  type: AppBlockerType;
  maintenanceEstimatedTime?: string;
};

let initPromise: Promise<void> | null = null;

export const initializeRemoteConfig = async (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const remoteConfig = getFirebaseRemoteConfig();
      await setConfigSettings(remoteConfig, {
        fetchTimeMillis: 60_000,
        minimumFetchIntervalMillis: 10_000,
      });
      await setDefaults(remoteConfig, { ...REMOTE_CONFIG_DEFAULTS });
      await fetchAndActivate(remoteConfig);
    } catch {
      logInfo("[RemoteConfig] Fetch unavailable, using local defaults.");
    }
  })();

  return initPromise;
};

export const evaluateAppBlocker = (): AppBlockerState => {
  try {
    if (Platform.OS !== "ios" && Platform.OS !== "android") {
      return { type: null };
    }

    const remoteConfig = getFirebaseRemoteConfig();

    if (getBoolean(remoteConfig, "is_maintenance_mode")) {
      const estimatedTime =
        getString(remoteConfig, "maintenance_estimated_time").trim() ||
        REMOTE_CONFIG_DEFAULTS.maintenance_estimated_time;

      return {
        type: "maintenance",
        maintenanceEstimatedTime: estimatedTime,
      };
    }

    const minVersion =
      Platform.OS === "ios"
        ? getString(remoteConfig, "min_version_ios")
        : getString(remoteConfig, "min_version_android");

    if (minVersion && isVersionLessThan(getComparableAppVersion(), minVersion)) {
      return { type: "update" };
    }

    return { type: null };
  } catch {
    return { type: null };
  }
};

export const subscribeRemoteConfigUpdates = (onUpdate: () => void): (() => void) => {
  try {
    const remoteConfig = getFirebaseRemoteConfig();

    return onConfigUpdate(remoteConfig, {
      next: async () => {
        try {
          await activate(remoteConfig);
          onUpdate();
        } catch (error) {
          logError("RemoteConfig activate failed", error);
        }
      },
      error: (error) => {
        logError("RemoteConfig update listener error", error);
      },
      complete: () => undefined,
    });
  } catch {
    return () => undefined;
  }
};

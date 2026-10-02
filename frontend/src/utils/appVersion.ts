import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { compareVersions, parseVersion } from "./app-utils";

type AppVersionConfig = {
  ios?: { version?: string; buildNumber?: string };
  android?: { version?: string; versionCode?: number };
};

// Same file app.config.js embeds. Requiring it here lets a JS reload see a
// version bump before the native binary is rebuilt.
const bundledAppVersion = require("../../app.version.config") as AppVersionConfig;

const getConfiguredAppVersion = (): AppVersionConfig | undefined =>
  bundledAppVersion ?? (Constants.expoConfig?.extra?.appVersion as AppVersionConfig | undefined);

const getPlatformVersionFallback = (): string | undefined => {
  const configured = getConfiguredAppVersion();
  if (Platform.OS === "ios") {
    return configured?.ios?.version;
  }
  if (Platform.OS === "android") {
    return configured?.android?.version;
  }
  return configured?.android?.version ?? configured?.ios?.version;
};

const getPlatformBuildFallback = (): string | undefined => {
  const configured = getConfiguredAppVersion();
  if (Platform.OS === "ios") {
    return configured?.ios?.buildNumber;
  }
  if (Platform.OS === "android") {
    return configured?.android?.versionCode?.toString();
  }
  return undefined;
};

export const getAppVersion = (): string =>
  Application.nativeApplicationVersion ??
  Constants.nativeApplicationVersion ??
  getPlatformVersionFallback() ??
  Constants.expoConfig?.version ??
  "0.0.0";

export const getAppBuildNumber = (): string | null =>
  Application.nativeBuildVersion ??
  Constants.nativeBuildVersion ??
  getPlatformBuildFallback() ??
  null;

export const getApplicationId = (): string | null =>
  Application.applicationId ?? Constants.expoConfig?.android?.package ?? null;

/** Compare semver strings (up to major.minor.patch). Returns false for invalid input. */
export const isVersionLessThan = (current: string, minimum: string): boolean => {
  const currentParts = parseVersion(current);
  const minimumParts = parseVersion(minimum);

  if (!currentParts || !minimumParts) {
    return false;
  }

  return compareVersions(currentParts, minimumParts) < 0;
};

/**
 * Version used by the force-update gate.
 * A rebuilt binary reports its own version. Until that rebuild, a newer
 * version declared in app config is used so a Metro session of this
 * codebase is not blocked by a stale native version name.
 */
export const getComparableAppVersion = (): string => {
  const installed = getAppVersion();
  const configured = getPlatformVersionFallback();
  if (configured && isVersionLessThan(installed, configured)) {
    return configured;
  }
  return installed;
};

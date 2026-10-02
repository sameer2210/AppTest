import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

export type HealthKitModule = typeof import("@kingstinct/react-native-healthkit");

let cached: HealthKitModule | null | undefined;

/** Load the native module once so the first permission tap is not waiting on require. */
export const preloadHealthKit = (): void => {
  getHealthKitModule();
};

/** Lazy-load Apple HealthKit — iOS native builds only (not Expo Go / Android). */
export const getHealthKitModule = (): HealthKitModule | null => {
  if (Platform.OS !== "ios") return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  if (cached !== undefined) return cached;

  try {
    cached = require("@kingstinct/react-native-healthkit") as HealthKitModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

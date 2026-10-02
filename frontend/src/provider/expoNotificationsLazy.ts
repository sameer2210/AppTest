import Constants, { ExecutionEnvironment } from "expo-constants";

export type ExpoNotificationsModule = typeof import("expo-notifications");

let cached: ExpoNotificationsModule | null | undefined;

// Lazy load: Expo Go (Android SDK 53+) throws on static import of expo-notifications
export const getExpoNotifications = (): ExpoNotificationsModule | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("expo-notifications") as ExpoNotificationsModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

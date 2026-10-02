import Constants, { ExecutionEnvironment } from "expo-constants";

export type ExpoTaskManagerModule = typeof import("expo-task-manager");

let cached: ExpoTaskManagerModule | null | undefined;

// Lazy load: optional native module (skipped in Expo Go / unsupported clients)
export const getExpoTaskManager = (): ExpoTaskManagerModule | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("expo-task-manager") as ExpoTaskManagerModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

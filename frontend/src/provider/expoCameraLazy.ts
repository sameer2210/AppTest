import Constants, { ExecutionEnvironment } from "expo-constants";

export type ExpoCameraModule = typeof import("expo-camera");

let cached: ExpoCameraModule | null | undefined;

/** Lazy load: avoid static expo-camera import under Expo Go / missing native module. */
export const getExpoCamera = (): ExpoCameraModule | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("expo-camera") as ExpoCameraModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

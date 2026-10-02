import Constants, { ExecutionEnvironment } from "expo-constants";

export type RevenueCatUiModule = any;

let cached: RevenueCatUiModule | null | undefined;

export const getRevenueCatUiModule = (): RevenueCatUiModule | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("react-native-purchases-ui") as RevenueCatUiModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

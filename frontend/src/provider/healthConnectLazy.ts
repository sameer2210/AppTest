import Constants, { ExecutionEnvironment } from "expo-constants";

export type HealthConnectModule = typeof import("react-native-health-connect");

let cached: HealthConnectModule | null | undefined;

export const getHealthConnectModule = (): HealthConnectModule | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("react-native-health-connect") as HealthConnectModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

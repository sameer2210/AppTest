import { Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

export type OtpVerifyModule = typeof import("react-native-otp-verify");

let cached: OtpVerifyModule | null | undefined;

// Android-only SMS Retriever — static import crashes iOS (native module not linked).
export const getOtpVerifyModule = (): OtpVerifyModule | null => {
  if (Platform.OS !== "android") {
    return null;
  }
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("react-native-otp-verify") as OtpVerifyModule;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

import Constants, { ExecutionEnvironment } from "expo-constants";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export type GestureHandlerRootViewProps = {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

let cached: ComponentType<GestureHandlerRootViewProps> | null | undefined;

// Lazy load: RNGH is unavailable in Expo Go (TurboModule mismatch with StoreClient)
export const getGestureHandlerRootView = (): ComponentType<GestureHandlerRootViewProps> | null => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }
  if (cached !== undefined) {
    return cached;
  }
  try {
    cached = require("react-native-gesture-handler")
      .GestureHandlerRootView as ComponentType<GestureHandlerRootViewProps>;
    return cached;
  } catch {
    cached = null;
    return null;
  }
};

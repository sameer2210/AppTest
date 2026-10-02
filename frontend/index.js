import { NativeModules } from "react-native";

// Force Expo JSI interop installation before any modules try to access globalThis.expo
try {
  const _ = NativeModules.NativeUnimoduleProxy;
  NativeModules.ExpoModulesCore?.installModules?.();
} catch {}

import "expo-router/entry";
import "./src/registerBackgroundTask";


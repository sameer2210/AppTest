import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { Platform } from "react-native";
import { colors } from "./colors";

/** Align Android/iOS system chrome with Stron dark theme (expo-system-ui + navigation-bar). */
export const configureSystemUi = async (): Promise<void> => {
  try {
    // Android edge-to-edge (Expo 54+) does not support setBackgroundColorAsync.
    if (Platform.OS !== "android") {
      await SystemUI.setBackgroundColorAsync(colors.surface).catch(() => {});
    }

    if (Platform.OS === "android") {
      await NavigationBar.setButtonStyleAsync("light").catch(() => {});
    }
  } catch {
    // Expo Go or unsupported platform — safe to ignore
  }
};

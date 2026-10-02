import * as NavigationBar from "expo-navigation-bar";
import { InteractionManager, Platform } from "react-native";

/** Wait until React has painted the payment blocking UI before opening native checkout. */
export const waitForPaymentUiPaint = (): Promise<void> =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 180);
    });
  });

export const preparePaymentChrome = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setBackgroundColorAsync("#FFFFFF").catch(() => {});
    await NavigationBar.setButtonStyleAsync("dark").catch(() => {});
  } catch {
    // Unsupported runtime — safe to ignore
  }
};

export const restorePaymentChrome = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  try {
    await NavigationBar.setBackgroundColorAsync("#000000").catch(() => {});
    await NavigationBar.setButtonStyleAsync("light").catch(() => {});
  } catch {
    // Unsupported runtime — safe to ignore
  }
};

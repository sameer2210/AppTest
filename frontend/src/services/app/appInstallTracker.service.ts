import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";

const INSTALL_TIMESTAMP_STORAGE_KEY = "@stron_device_install_time";
const TRIAL_MIN_WAIT_DAYS = 7;

let cachedInstallTime: number | null = null;

export const AppInstallTracker = {
  /**
   * Epoch ms when this app was installed (or reinstalled) on the device.
   */
  async getLatestInstallTime(): Promise<number> {
    if (cachedInstallTime && cachedInstallTime > 0) {
      return cachedInstallTime;
    }

    let nativeInstallTime: number | null = null;
    try {
      const nativeDate = await Application.getInstallationTimeAsync();
      if (nativeDate instanceof Date && !Number.isNaN(nativeDate.getTime())) {
        nativeInstallTime = nativeDate.getTime();
      }
    } catch {
      // Non-fatal fallback
    }

    const storedRaw = await AsyncStorage.getItem(INSTALL_TIMESTAMP_STORAGE_KEY).catch(() => null);
    const storedTime = storedRaw ? Number(storedRaw) : null;

    let finalInstallTime: number;

    if (nativeInstallTime && nativeInstallTime > 0) {
      if (!storedTime || nativeInstallTime > storedTime) {
        finalInstallTime = nativeInstallTime;
        await AsyncStorage.setItem(INSTALL_TIMESTAMP_STORAGE_KEY, String(finalInstallTime)).catch(
          () => undefined,
        );
      } else {
        finalInstallTime = storedTime;
      }
    } else if (storedTime && storedTime > 0) {
      finalInstallTime = storedTime;
    } else {
      finalInstallTime = Date.now();
      await AsyncStorage.setItem(INSTALL_TIMESTAMP_STORAGE_KEY, String(finalInstallTime)).catch(
        () => undefined,
      );
    }

    cachedInstallTime = finalInstallTime;
    return finalInstallTime;
  },

  async getDaysSinceInstall(): Promise<number> {
    const installTime = await this.getLatestInstallTime();
    const elapsedMs = Math.max(0, Date.now() - installTime);
    return Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  },

  /** True only on or after Day 7 (D7+) from installation. */
  async isTrialOfferPermittedByInstall(): Promise<boolean> {
    const days = await this.getDaysSinceInstall();
    return days >= TRIAL_MIN_WAIT_DAYS;
  },

  async getDaysUntilTrialByInstall(): Promise<number> {
    const days = await this.getDaysSinceInstall();
    return Math.max(0, TRIAL_MIN_WAIT_DAYS - days);
  },
};

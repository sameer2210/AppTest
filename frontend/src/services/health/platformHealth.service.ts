import { Platform } from "react-native";
import { AppleHealthService } from "./appleHealth.service";
import { GoogleFitService, HealthConnectStatus } from "./googleFit.service";

/**
 * Cross-platform health merge: pedometer-first; adopt Health Connect / Apple Health
 * when the gap is >= 50 steps (either direction).
 */
export const PlatformHealthService = {
  async initializeIfEnabled(): Promise<boolean> {
    if (Platform.OS === "android") {
      return GoogleFitService.initializeIfEnabled();
    }
    if (Platform.OS === "ios") {
      return AppleHealthService.initializeIfEnabled();
    }
    return false;
  },

  async ensureConnected(): Promise<boolean> {
    if (Platform.OS === "android") {
      const status = await GoogleFitService.requestAuthorizationFlow();
      return status === HealthConnectStatus.authorized;
    }
    if (Platform.OS === "ios") {
      return AppleHealthService.requestAuthorization();
    }
    return false;
  },

  async syncTodaySteps(currentSteps: number): Promise<number> {
    if (Platform.OS === "android") {
      return GoogleFitService.syncTodaySteps(currentSteps);
    }
    if (Platform.OS === "ios") {
      return AppleHealthService.syncTodaySteps(currentSteps);
    }
    return currentSteps;
  },

  /**
   * Android: reconcile vs Health Connect (may lower inflated STRON totals).
   * iOS: raise-only via Apple Health (same as syncTodaySteps).
   */
  async reconcileTodaySteps(currentSteps: number): Promise<{
    steps: number;
    corrected: boolean;
    hcSteps: number;
  }> {
    if (Platform.OS === "android") {
      return GoogleFitService.reconcileTodaySteps(currentSteps);
    }
    if (Platform.OS === "ios") {
      return AppleHealthService.reconcileTodaySteps(currentSteps);
    }
    return { steps: currentSteps, corrected: false, hcSteps: 0 };
  },

  async getTodaySteps(pedometerHint = 0): Promise<number> {
    if (Platform.OS === "android") {
      return GoogleFitService.getTodaySteps(pedometerHint);
    }
    if (Platform.OS === "ios") {
      return AppleHealthService.getTodaySteps(pedometerHint);
    }
    return 0;
  },
};

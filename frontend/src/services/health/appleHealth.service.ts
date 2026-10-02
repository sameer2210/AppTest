import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { Pedometer } from "expo-sensors";
import { getHealthKitModule } from "../../provider/healthKitLazy";
import { logError } from "@/config/devLogger";
import { mergePedometerWithHealthSteps } from "../step/stepHealthMerge.utils";
import { sanitizeHealthConnectTodaySteps } from "../step/healthConnectDaySteps.utils";

const ENABLED_KEY = "apple_health_enabled";
const LAST_SYNC_KEY = "apple_health_last_sync";
const STEP_TYPE = "HKQuantityTypeIdentifierStepCount" as const;
/** AuthorizationRequestStatus from HealthKit. */
const AUTH_SHOULD_REQUEST = 1;
const AUTH_UNNECESSARY = 2;
const HEALTH_APP_URL = "x-apple-health://";

const readAuth = { toRead: [STEP_TYPE], toShare: [] as const };

const openHealthSources = async () => {
  try {
    await Linking.openURL(HEALTH_APP_URL);
  } catch (error) {
    logError("[AppleHealth] Could not open the Health app", error);
  }
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const localDateKey = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let cachedEnabled: boolean | null = null;

const setEnabled = async (enabled: boolean) => {
  cachedEnabled = enabled;
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    logError("[AppleHealth] setEnabled failed", error);
  }
};

const updateLastSync = async () => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/** CMPedometer day total — only when Motion permission is already granted. */
const getPedometerTodaySteps = async (): Promise<number> => {
  try {
    const motion = await Pedometer.getPermissionsAsync();
    if (!motion.granted) return 0;
    const dayStart = startOfDay(new Date());
    const dayEnd = new Date();
    const result = await Pedometer.getStepCountAsync(dayStart, dayEnd);
    return Math.max(0, Math.floor(result?.steps ?? 0));
  } catch (error) {
    logError("[AppleHealth] Pedometer day query failed", error);
    return 0;
  }
};

/** Apple HealthKit aggregate for today (includes Watch / Health sources). */
const getHealthKitTodaySteps = async (): Promise<number> => {
  const hk = getHealthKitModule();
  if (!hk) return 0;

  try {
    const available = await hk.isHealthDataAvailableAsync();
    if (!available) return 0;

    const dayStart = startOfDay(new Date());
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const stats = await hk.queryStatisticsForQuantity(STEP_TYPE, ["cumulativeSum"], {
      filter: { date: { startDate: dayStart, endDate: dayEnd } },
      unit: "count",
    });
    return Math.max(0, Math.floor(stats.sumQuantity?.quantity ?? 0));
  } catch (error) {
    logError("[AppleHealth] HealthKit query failed", error);
    return 0;
  }
};

export const AppleHealthService = {
  async isAvailable(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    try {
      const pedometerOk = await Pedometer.isAvailableAsync();
      const hk = getHealthKitModule();
      if (!hk) return pedometerOk;
      const hkOk = await hk.isHealthDataAvailableAsync().catch(() => false);
      return pedometerOk || hkOk;
    } catch {
      return false;
    }
  },

  async isEnabled(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    if (cachedEnabled === true) return true;

    try {
      const stored = (await AsyncStorage.getItem(ENABLED_KEY)) === "true";
      if (stored) {
        cachedEnabled = true;
        return true;
      }
    } catch {
      /* ignore */
    }

    // Actively verify native HealthKit authorization if AsyncStorage is unset or out of sync
    const hk = getHealthKitModule();
    if (hk) {
      try {
        const available = await hk.isHealthDataAvailableAsync();
        if (available) {
          const status = await hk.getRequestStatusForAuthorization(readAuth);
          // AuthorizationRequestStatus.unnecessary === 2 (user already completed authorization flow)
          if (status === AUTH_UNNECESSARY) {
            cachedEnabled = true;
            await setEnabled(true);
            return true;
          }

          // Fallback: verify if step count query returns samples/data
          const dayStart = startOfDay(new Date());
          const dayEnd = new Date(dayStart.getTime() + 86400000);
          const stats = await hk.queryStatisticsForQuantity(STEP_TYPE, ["cumulativeSum"], {
            filter: { date: { startDate: dayStart, endDate: dayEnd } },
            unit: "count",
          });
          if (stats?.sumQuantity?.quantity != null && stats.sumQuantity.quantity > 0) {
            cachedEnabled = true;
            await setEnabled(true);
            return true;
          }
        }
      } catch {
        /* ignore */
      }
    }

    return false;
  },

  async requestAuthorization(options?: { openHealthIfDecided?: boolean }): Promise<boolean> {
    if (Platform.OS !== "ios") return false;

    // HealthKit only — Motion/Fitness is requested from the activity Enable
    // button via StepService.requestPermissions(), not from this sheet.
    let granted = false;
    const hk = getHealthKitModule();
    if (!hk) return false;

    try {
      const available = await hk.isHealthDataAvailableAsync();
      if (!available) return false;

      const status = await hk.getRequestStatusForAuthorization(readAuth);

      // Show the Steps toggle only when Apple still needs a decision.
      if (status === AUTH_SHOULD_REQUEST) {
        await hk.requestAuthorization(readAuth);
        granted = true;
      }

      // Already asked (status === 2). iOS will not show the toggle again.
      // Treat that as granted and open Health only when the user tapped Sync again.
      if (status === AUTH_UNNECESSARY) {
        granted = true;
        if (options?.openHealthIfDecided) {
          await openHealthSources();
        }
      }
    } catch (error) {
      logError("[AppleHealth] HealthKit auth failed", error);
    }

    if (granted) {
      cachedEnabled = true;
      await setEnabled(true);
    }
    return granted;
  },

  async initializeIfEnabled(): Promise<boolean> {
    if (Platform.OS !== "ios") return false;
    const enabled = await AppleHealthService.isEnabled();
    if (!enabled) return false;
    return AppleHealthService.isAvailable();
  },

  /**
   * Best available system step total for today:
   * max(HealthKit aggregate, CMPedometer day query).
   */
  async getTodaySteps(pedometerHint = 0): Promise<number> {
    if (Platform.OS !== "ios") return 0;

    const [hkSteps, pedometerSteps] = await Promise.all([
      getHealthKitTodaySteps(),
      getPedometerTodaySteps(),
    ]);

    const ped = Math.max(pedometerHint, pedometerSteps);
    const raw = Math.max(hkSteps, pedometerSteps);
    const best = sanitizeHealthConnectTodaySteps(raw, ped, { isToday: true });
    if (best > 0) await updateLastSync();
    return best;
  },

  async syncTodaySteps(currentSteps: number): Promise<number> {
    if (Platform.OS !== "ios") return currentSteps;

    const available = await AppleHealthService.isAvailable();
    if (!available) return currentSteps;

    try {
      const hkSteps = await getHealthKitTodaySteps();
      if (hkSteps > 0) await setEnabled(true);
      const merged = mergePedometerWithHealthSteps(currentSteps, hkSteps);
      return merged.steps;
    } catch (error) {
      logError("[AppleHealth] syncTodaySteps failed", error);
      return currentSteps;
    }
  },

  async reconcileTodaySteps(currentSteps: number): Promise<{
    steps: number;
    corrected: boolean;
    hcSteps: number;
  }> {
    const current = Math.max(0, Math.floor(Number(currentSteps) || 0));
    if (Platform.OS !== "ios") {
      return { steps: current, corrected: false, hcSteps: 0 };
    }

    try {
      const hkSteps = await getHealthKitTodaySteps();
      const merged = mergePedometerWithHealthSteps(current, hkSteps);
      return { steps: merged.steps, corrected: merged.corrected, hcSteps: hkSteps };
    } catch (error) {
      logError("[AppleHealth] reconcileTodaySteps failed", error);
      return { steps: current, corrected: false, hcSteps: 0 };
    }
  },

  localDateKey,
};

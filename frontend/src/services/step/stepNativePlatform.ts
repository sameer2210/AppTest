import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { PermissionsAndroid, Platform } from "react-native";
import { logError } from "@/config/devLogger";
import { MAX_DAILY_STEPS } from "@/constants/steps";
import { PlatformHealthService } from "../health/platformHealth.service";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import { seedStepNotificationPayload } from "./stepNotificationSync.service";
import { mergePedometerWithHealthSteps } from "./stepHealthMerge.utils";
import { localDateKey } from "./stepDate.utils";
import {
  STORAGE_KEYS,
  getCachedStepsInternal,
  sanitizeStepCount,
} from "./stepStorage";

const RESET_THRESHOLD = 100;

/**
 * Read-only permission check. Never calls requestPermissionsAsync.
 * On iOS, any Pedometer.getStepCountAsync / watchStepCount while status is
 * NotDetermined shows the Motion & Fitness system dialog — so data APIs must
 * stay behind this gate until the user taps Enable on the permission sheet.
 */
export const hasPedometerAccess = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    try {
      return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION);
    } catch {
      return false;
    }
  }
  if (Platform.OS === "ios") {
    try {
      const result = await Pedometer.getPermissionsAsync();
      return result.granted;
    } catch {
      return false;
    }
  }
  return true;
};

export const isPedometerAvailable = async (): Promise<boolean> => {
  try {
    return await Pedometer.isAvailableAsync();
  } catch {
    return false;
  }
};

export const requestActivityPermissions = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: "Step Tracking Permission",
          message: "Stron needs access to your steps to track progress in challenges.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        },
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      logError("Android permission request failed", error);
      return false;
    }
  }
  if (Platform.OS === "ios") {
    try {
      const result = await Pedometer.requestPermissionsAsync();
      return result.granted;
    } catch {
      return true;
    }
  }
  return true;
};

export const replaceNativeAccountSteps = async (steps: number): Promise<void> => {
  if (Platform.OS !== "android") return;
  const svc = getStepForegroundService();
  if (!svc) return;
  const safe = sanitizeStepCount(steps);
  try {
    if (svc.replaceAccountSteps) {
      await svc.replaceAccountSteps(safe);
      return;
    }
    // Older native builds max() on updateDbSteps — that re-imports the previous
    // account. Clear prefs instead of sending 0 through updateDbSteps.
    if (svc.clearUserStepState) {
      await svc.clearUserStepState();
    }
    if (safe > 0 && svc.updateDbSteps) {
      await svc.updateDbSteps(safe);
    }
  } catch {
    /* ignore */
  }
};

/** Clear poisoned offset/local cache after a since-boot leak (e.g. 89k). */
export const clearCorruptedAndroidStepState = async (): Promise<void> => {
  const today = localDateKey();
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.dailyOffset,
    STORAGE_KEYS.offsetDate,
    STORAGE_KEYS.offsetTimestamp,
    STORAGE_KEYS.lastReading,
    STORAGE_KEYS.pendingSync,
  ]);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.localSteps, "0"],
    [STORAGE_KEYS.localStepsDate, today],
  ]);
  // CRITICAL: wipe native SharedPreferences + force notification shade to 0
  const svc = getStepForegroundService();
  if (svc?.resetDailyStepState) {
    await svc.resetDailyStepState().catch((error) => {
      logError("[StepService] resetDailyStepState failed", error);
    });
  } else if (svc) {
    void svc.updateDbSteps(0);
  }
  await seedStepNotificationPayload(0).catch(() => undefined);
};

/** Persist a fresh Android daily offset (raw - todaySteps). */
export const persistAndroidOffset = async (rawReading: number, todaySteps: number): Promise<number> => {
  const today = localDateKey();
  const safeToday = Math.min(MAX_DAILY_STEPS, Math.max(0, todaySteps));
  const newOffset = Math.max(0, rawReading - safeToday);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.dailyOffset, String(newOffset)],
    [STORAGE_KEYS.offsetDate, today],
    [STORAGE_KEYS.offsetTimestamp, String(Date.now())],
    [STORAGE_KEYS.lastReading, String(rawReading)],
    [STORAGE_KEYS.localSteps, String(safeToday)],
    [STORAGE_KEYS.localStepsDate, today],
  ]);
  const svc = getStepForegroundService();
  if (svc) {
    void svc.sendOffset(newOffset, today);
    void svc.updateDbSteps(safeToday);
  }
  return safeToday;
};

export const isAndroidOffsetPoisoned = (
  offsetDate: string | null,
  storedOffset: string | null,
  rawReading: number,
): boolean => {
  const today = localDateKey();
  if (!offsetDate || offsetDate !== today || storedOffset == null) return true;
  const offset = Number(storedOffset);
  if (!Number.isFinite(offset)) return true;
  if (offset === 0 && rawReading > RESET_THRESHOLD) return true;
  const computed = rawReading - offset;
  if (computed > MAX_DAILY_STEPS) return true;
  if (computed < -RESET_THRESHOLD) return true;
  return false;
};

export const computeAndroidSteps = async (
  rawReading: number,
  handleMidnight: () => Promise<void>,
): Promise<number> => {
  await handleMidnight();

  const offsetDate = await AsyncStorage.getItem(STORAGE_KEYS.offsetDate);
  const storedOffset = await AsyncStorage.getItem(STORAGE_KEYS.dailyOffset);

  if (isAndroidOffsetPoisoned(offsetDate, storedOffset, rawReading)) {
    const baseline = await getCachedStepsInternal();
    logError("[StepService] Re-baselining Android offset (poisoned or missing)", {
      offsetDate,
      storedOffset,
      rawReading,
      baseline,
    });
    return persistAndroidOffset(rawReading, baseline);
  }

  const offset = Number(storedOffset);
  const lastReading = Number((await AsyncStorage.getItem(STORAGE_KEYS.lastReading)) ?? 0);

  // Reboot / sensor-reset detection — mirrors Flutter's rebootDetected logic
  const dropped = lastReading - rawReading;
  if (lastReading > RESET_THRESHOLD && dropped > RESET_THRESHOLD) {
    const localSteps = Math.min(MAX_DAILY_STEPS, await getCachedStepsInternal());
    return persistAndroidOffset(rawReading, localSteps);
  }

  await AsyncStorage.setItem(STORAGE_KEYS.lastReading, String(rawReading));
  const steps = Math.max(0, rawReading - offset);
  if (steps > MAX_DAILY_STEPS) {
    return persistAndroidOffset(rawReading, 0);
  }
  return steps;
};

/**
 * Uses Pedometer.getStepCountAsync (CMPedometer on iOS, step counter on Android)
 * to batch-recover today's steps — mirrors Flutter recoverMissedSteps pattern.
 */
export const recoverMissedSteps = async (isIsolated = false): Promise<number | null> => {
  if (isIsolated) return null;

  let pedometerSteps = 0;

  if (Platform.OS === "ios") {
    if (!(await hasPedometerAccess())) return null;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const result = await Pedometer.getStepCountAsync(startOfDay, endOfDay);
      if (result?.steps != null && result.steps > 0) {
        pedometerSteps = result.steps;
      }
    } catch (error) {
      logError("Step recovery failed", error);
    }
  } else {
    const svc = getStepForegroundService();
    pedometerSteps = svc ? await svc.getCurrentSteps().catch(() => 0) : 0;
    pedometerSteps = sanitizeStepCount(pedometerSteps);
  }

  const cached = await getCachedStepsInternal();
  pedometerSteps = Math.max(pedometerSteps, cached);

  let healthSteps = 0;
  try {
    healthSteps = await PlatformHealthService.getTodaySteps(pedometerSteps);
  } catch {
    /* optional */
  }

  const merged = mergePedometerWithHealthSteps(pedometerSteps, healthSteps);

  if (merged.steps > MAX_DAILY_STEPS) {
    logError("[StepService] Ignoring implausible recovered steps", { best: merged.steps });
    return null;
  }
  return merged.steps > 0 ? sanitizeStepCount(merged.steps) : null;
};

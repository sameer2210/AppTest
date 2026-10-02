import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";
import { localDateKey } from "./stepDate.utils";
import { StepHistoryService } from "./stepHistory.service";
import { PlatformHealthService } from "../health/platformHealth.service";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import {
  clearIosStepNotification,
  invalidateStepNotificationHistoryCache,
} from "./stepNotificationSync.service";

export const STORAGE_KEYS = {
  dailyOffset: "stron_daily_step_offset",
  offsetDate: "stron_daily_offset_date",
  lastReading: "stron_last_pedometer_reading",
  localSteps: "stron_local_step_count",
  localStepsDate: "stron_local_step_count_date",
  pendingSync: "stron_pending_step_sync",
  lastSyncedDate: "stron_last_synced_date",
  offsetTimestamp: "stron_offset_timestamp_ms",
  activeUid: "stron_active_step_uid",
  /** UID whose session must not import phone-wide Fit / Health Connect totals. */
  isolateHealth: "stron_isolate_device_health",
  /** Last account that owned step tracking — survives logout so we can tell switch vs return. */
  lastStepUid: "stron_last_step_uid",
  /** Phone-wide day total captured at logout — used to detect leaked server counts. */
  deviceDaySteps: "stron_device_day_steps_snapshot",
  deviceDayStepsDate: "stron_device_day_steps_date",
  /** Same-day floor so cold start never regresses below a known-good total. */
  lastKnownGood: "stron_last_known_good_steps",
  lastKnownGoodDate: "stron_last_known_good_date",
} as const;

export const sanitizeStepCount = (steps: number): number => sanitizeDailySteps(steps);

export const uidStepSnapshotKey = (uid: string, date = localDateKey()): string =>
  `stron_uid_today_steps_${uid}_${date}`;

export const readUidStepSnapshot = async (uid: string): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(uidStepSnapshotKey(uid));
    if (raw == null) return null;
    const n = sanitizeStepCount(Number(raw));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
};

export const saveUidStepSnapshot = async (uid: string, steps: number): Promise<void> => {
  try {
    const safe = sanitizeStepCount(steps);
    await AsyncStorage.setItem(uidStepSnapshotKey(uid), String(safe));
  } catch {
    /* ignore */
  }
};

export const getCachedStepsInternal = async (): Promise<number> => {
  try {
    const storedDate = await AsyncStorage.getItem(STORAGE_KEYS.localStepsDate);
    const today = localDateKey();
    if (storedDate && storedDate !== today) {
      return 0;
    }
    const val = await AsyncStorage.getItem(STORAGE_KEYS.localSteps);
    if (!val) return 0;
    const n = Number(val);
    if (n > MAX_DAILY_STEPS) {
      await AsyncStorage.setItem(STORAGE_KEYS.localSteps, "0");
      return 0;
    }
    return Math.max(0, n);
  } catch {
    return 0;
  }
};

export const saveLocalSteps = async (steps: number): Promise<number> => {
  const safe = sanitizeStepCount(steps);
  const existing = await getCachedStepsInternal();
  const best = Math.max(existing, safe);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.localSteps, String(best)],
    [STORAGE_KEYS.localStepsDate, localDateKey()],
  ]);
  // Keep history in sync for today too (mirrors Flutter local_step_count save)
  await StepHistoryService.saveStepsForDate(localDateKey(), best);
  return best;
};

/** Overwrite today's local cache (allows downward HC correction). */
export const forceSaveLocalSteps = async (steps: number): Promise<number> => {
  const safe = sanitizeStepCount(steps);
  const today = localDateKey();
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.localSteps, String(safe)],
    [STORAGE_KEYS.localStepsDate, today],
  ]);
  await StepHistoryService.saveStepsForDate(today, safe);
  return safe;
};

export const loadOffset = async (): Promise<number> => {
  const offset = await AsyncStorage.getItem(STORAGE_KEYS.dailyOffset);
  return Number(offset ?? 0);
};

/** Capture phone-wide day total before logout clears native prefs. */
export const snapshotDeviceDaySteps = async (): Promise<number> => {
  let total = 0;
  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    total = svc ? await svc.getCurrentSteps().catch(() => 0) : 0;
  }
  if (total <= 0) {
    try {
      total = sanitizeStepCount(await PlatformHealthService.getTodaySteps());
    } catch {
      /* optional */
    }
  }
  if (total > 0) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.deviceDaySteps, String(total)],
      [STORAGE_KEYS.deviceDayStepsDate, localDateKey()],
    ]);
  }
  return total;
};

/** Best estimate of the phone's calendar-day step total (device-wide). */
export const resolveDeviceDayTotal = async (livePhone = 0): Promise<number> => {
  const today = localDateKey();
  let total = Math.max(0, sanitizeStepCount(livePhone));
  try {
    const storedDate = await AsyncStorage.getItem(STORAGE_KEYS.deviceDayStepsDate);
    if (storedDate === today) {
      const stored = Number((await AsyncStorage.getItem(STORAGE_KEYS.deviceDaySteps)) ?? 0);
      total = Math.max(total, sanitizeStepCount(stored));
    }
  } catch {
    /* ignore */
  }
  if (total <= 0) {
    try {
      total = Math.max(total, sanitizeStepCount(await PlatformHealthService.getTodaySteps()));
    } catch {
      /* optional */
    }
  }
  return total;
};

/** True when server steps likely came from the phone, not this account's walks. */
export const looksLikePhoneDayLeak = (accountSteps: number, deviceTotal: number): boolean => {
  const seeded = sanitizeStepCount(accountSteps);
  if (seeded <= 0) return false;
  if (deviceTotal > 50) {
    const slack = Math.max(100, Math.round(deviceTotal * 0.08));
    return Math.abs(seeded - deviceTotal) <= slack;
  }
  return seeded >= 800;
};

export const clearAccountLocalStepState = async (
  clearCorruptedAndroidState?: () => Promise<void>,
): Promise<void> => {
  const today = localDateKey();
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.dailyOffset,
    STORAGE_KEYS.offsetDate,
    STORAGE_KEYS.lastReading,
    STORAGE_KEYS.pendingSync,
    STORAGE_KEYS.lastSyncedDate,
    STORAGE_KEYS.offsetTimestamp,
    STORAGE_KEYS.lastKnownGood,
    STORAGE_KEYS.lastKnownGoodDate,
  ]);
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.localSteps, "0"],
    [STORAGE_KEYS.localStepsDate, today],
  ]);
  StepHistoryService.clearCache();
  invalidateStepNotificationHistoryCache();
  if (clearCorruptedAndroidState) {
    await clearCorruptedAndroidState();
  }
  await clearIosStepNotification().catch(() => undefined);
};

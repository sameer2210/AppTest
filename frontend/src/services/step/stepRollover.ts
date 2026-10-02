import AsyncStorage from "@react-native-async-storage/async-storage";
import { Pedometer } from "expo-sensors";
import { Platform } from "react-native";
import { UserService } from "../user/user.service";
import type { StepSyncMetadata } from "../user/user.service";
import { StepHistoryService } from "./stepHistory.service";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import {
  invalidateStepNotificationHistoryCache,
  seedStepNotificationPayload,
} from "./stepNotificationSync.service";
import { addDaysToDateKey, enumerateDateKeys, localDateKey } from "./stepDate.utils";
import { STORAGE_KEYS } from "./stepStorage";
import { hasPedometerAccess } from "./stepNativePlatform";

export const buildSyncMeta = (source: StepSyncMetadata["source"] = "debounced"): StepSyncMetadata => {
  const now = new Date();
  return {
    localDate: localDateKey(now),
    utcTimestamp: now.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source,
  };
};

export const readStepsFromSensorForDay = async (targetDateKey: string): Promise<number> => {
  const yesterdayKey = addDaysToDateKey(localDateKey(), -1);
  if (targetDateKey !== yesterdayKey) return 0;

  if (Platform.OS === "ios") {
    if (!(await hasPedometerAccess())) return 0;
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStart = new Date(yesterday);
      yStart.setHours(0, 0, 0, 0);
      const yEnd = new Date(yesterday);
      yEnd.setHours(23, 59, 59, 999);
      const result = await Pedometer.getStepCountAsync(yStart, yEnd);
      return Math.max(0, result?.steps ?? 0);
    } catch {
      return 0;
    }
  }

  const lastReading = Number((await AsyncStorage.getItem(STORAGE_KEYS.lastReading)) ?? 0);
  const offset = Number((await AsyncStorage.getItem(STORAGE_KEYS.dailyOffset)) ?? 0);
  return Math.max(0, lastReading - offset);
};

export const resolveArchivedDaySteps = async (dateKey: string, useSensor: boolean): Promise<number> => {
  const fromHistory = await StepHistoryService.getStepsForDate(dateKey);
  if (fromHistory != null && fromHistory > 0) return fromHistory;

  const lastKnownDate = await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGoodDate);
  if (lastKnownDate === dateKey) {
    const lastKnown = Number((await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGood)) ?? 0);
    if (lastKnown > 0) return lastKnown;
  }

  if (useSensor) {
    return readStepsFromSensorForDay(dateKey);
  }
  return 0;
};

export const syncArchivedDayToServer = async (
  dateKey: string,
  steps: number,
  uid?: string | null,
): Promise<void> => {
  if (steps <= 0) return;
  const targetUid = uid || (await AsyncStorage.getItem(STORAGE_KEYS.activeUid));
  if (!targetUid) return;
  try {
    await UserService.syncPastSteps(targetUid, dateKey, steps, buildSyncMeta("midnight_transition"));
  } catch {
    // Native FGS / next backfill retries
  }
};

export interface MidnightTransitionHooks {
  onStepsReset?: (steps: number) => void;
  onIosSubscriptionReset?: () => void;
}

export const handleMidnightIfNeeded = async (
  currentUid?: string | null,
  hooks?: MidnightTransitionHooks,
): Promise<void> => {
  const offsetDate = await AsyncStorage.getItem(STORAGE_KEYS.offsetDate);
  const today = localDateKey();
  if (!offsetDate || offsetDate === today) return;

  const yesterdayKey = addDaysToDateKey(today, -1);
  const datesToClose = enumerateDateKeys(offsetDate, yesterdayKey);
  if (datesToClose.length === 0) return;

  const useSensorForLastDay = datesToClose.length === 1 && datesToClose[0] === yesterdayKey;

  for (const dateKey of datesToClose) {
    const useSensor = useSensorForLastDay && dateKey === yesterdayKey;
    const steps = await resolveArchivedDaySteps(dateKey, useSensor);
    if (steps > 0) {
      await StepHistoryService.saveStepsForDate(dateKey, steps);
      await syncArchivedDayToServer(dateKey, steps, currentUid);
    }
  }

  await StepHistoryService.cleanupOldEntries();

  if (Platform.OS === "ios") {
    // iOS: no offset to reset — just update the date key and zero local cache
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.offsetDate, today],
      [STORAGE_KEYS.localSteps, "0"],
      [STORAGE_KEYS.localStepsDate, today],
    ]);
    await AsyncStorage.removeItem(STORAGE_KEYS.lastSyncedDate);
    hooks?.onIosSubscriptionReset?.();
    await seedStepNotificationPayload(0);
    invalidateStepNotificationHistoryCache();
    hooks?.onStepsReset?.(0);
  } else {
    // Android: new offset = current pedometer reading → 0 daily steps for new day
    const lastReading = Number((await AsyncStorage.getItem(STORAGE_KEYS.lastReading)) ?? 0);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.dailyOffset, String(lastReading)],
      [STORAGE_KEYS.offsetDate, today],
      [STORAGE_KEYS.offsetTimestamp, String(Date.now())],
      [STORAGE_KEYS.lastReading, String(lastReading)],
      [STORAGE_KEYS.localSteps, "0"],
      [STORAGE_KEYS.localStepsDate, today],
    ]);
    await AsyncStorage.removeItem(STORAGE_KEYS.lastSyncedDate);
    // Keep native FGS offset in sync so yesterday doesn't leak into today
    const svc = getStepForegroundService();
    if (svc) {
      void svc.sendOffset(lastReading, today);
      void svc.updateDbSteps(0);
    }
    await seedStepNotificationPayload(0);
    invalidateStepNotificationHistoryCache();
    hooks?.onStepsReset?.(0);
  }
};

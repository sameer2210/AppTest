/**
 * Shared step analytics — streak + merged history for Home, Profile, and notifications.
 */
import { UserService } from "../user/user.service";
import type { StepSyncMetadata } from "../user/user.service";
import { StepHistoryService } from "./stepHistory.service";
import { updateCachedHistoryMap } from "./stepNotificationSync.service";
import { logError } from "@/config/devLogger";
import { sanitizeDailySteps } from "@/constants/steps";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDaysToDateKey, localDateKey, toLocalDateKey } from "./stepDate.utils";

const sanitizeDaySteps = (steps: number): number => sanitizeDailySteps(steps);

const historyItemDateKey = (item: { date?: string; dateKey?: string }): string | null => {
  if (item.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(item.dateKey)) {
    return item.dateKey;
  }
  return toLocalDateKey(item.date);
};

const mergeDayMap = (target: Record<string, number>, source: Record<string, number>) => {
  for (const [key, steps] of Object.entries(source)) {
    const localKey = toLocalDateKey(key) ?? key;
    const next = sanitizeDaySteps(steps);
    if (next <= 0) continue;
    target[localKey] = Math.max(target[localKey] ?? 0, next);
  }
};

export type StepAnalyticsSnapshot = {
  historyMap: Record<string, number>;
  streakDays: number;
  lifetimeSteps: number;
};

/**
 * Consecutive active days ending today (or yesterday if today is still 0).
 * A day counts when steps >= minSteps.
 */
export const computeStepStreak = (
  historyMap: Record<string, number>,
  todaySteps: number,
  minSteps = 1,
): number => {
  const todayKey = localDateKey();
  const merged: Record<string, number> = { ...historyMap };
  merged[todayKey] = Math.max(merged[todayKey] ?? 0, sanitizeDaySteps(todaySteps));

  let cursor = new Date();
  if ((merged[todayKey] ?? 0) < minSteps) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const key = localDateKey(cursor);
    if ((merged[key] ?? 0) < minSteps) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

export const formatStreakLabel = (streakDays: number): string => {
  if (streakDays <= 0) return "0 Days";
  if (streakDays === 1) return "1 Day";
  return `${streakDays} Days`;
};

const getStreakCacheKey = (uid?: string) =>
  uid?.trim() ? `stron_cached_step_streak_${uid.trim()}` : "stron_cached_step_streak";

export const getCachedStepStreak = async (uid?: string): Promise<number> => {
  try {
    const key = getStreakCacheKey(uid);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
};

export const setCachedStepStreak = async (streak: number, uid?: string): Promise<void> => {
  try {
    const key = getStreakCacheKey(uid);
    await AsyncStorage.setItem(key, String(Math.max(0, streak)));
  } catch {
    // ignore
  }
};

export const clearCachedStepStreak = async (uid?: string): Promise<void> => {
  try {
    const keys = ["stron_cached_step_streak"];
    if (uid?.trim()) keys.push(getStreakCacheKey(uid));
    await AsyncStorage.multiRemove(keys);
  } catch {
    // ignore
  }
};

/** Merge this account's server history with UID-scoped local pedometer history.
 * Never import Google Fit / Health Connect — those stores are phone-wide. */
export const loadMergedStepHistory = async (
  uid: string,
  todaySteps = 0,
  _options?: { skipPlatformHealth?: boolean },
): Promise<Record<string, number>> => {
  const map: Record<string, number> = {};

  try {
    const [serverHistory, localDays] = await Promise.all([
      UserService.getActivityHistory(uid).catch(() => []),
      StepHistoryService.getLastNDays(90, uid).catch(() => ({})),
    ]);

    for (const item of serverHistory) {
      if (!item?.date && !item?.dateKey) continue;
      const next = sanitizeDaySteps(item.stepCount);
      if (next <= 0) continue;

      const localKey = historyItemDateKey(item);
      if (localKey) map[localKey] = Math.max(map[localKey] ?? 0, next);
    }

    mergeDayMap(map, localDays);
  } catch (error) {
    logError("[StepAnalytics] loadMergedStepHistory failed", error);
  }

  const todayKey = localDateKey();
  const liveToday = sanitizeDaySteps(todaySteps);
  try {
    const { StepService } = await import("./step.service");
    if (StepService.isDeviceWideRecoverySuppressed()) {
      map[todayKey] = liveToday;
      return map;
    }
  } catch {
    // ignore
  }
  map[todayKey] = Math.max(map[todayKey] ?? 0, liveToday);
  return map;
};

/**
 * Push locally recorded past days to the server when server history is missing them.
 * Fixes streak gaps after missed midnight transitions or offline periods.
 */
export const backfillLocalHistoryToServer = async (
  uid: string,
  meta?: StepSyncMetadata,
): Promise<void> => {
  if (!uid?.trim()) return;

  const todayKey = localDateKey();
  const yesterdayKey = addDaysToDateKey(todayKey, -1);

  let serverHistory: Awaited<ReturnType<typeof UserService.getActivityHistory>> = [];
  try {
    serverHistory = await UserService.getActivityHistory(uid);
  } catch {
    return;
  }

  const serverMap: Record<string, number> = {};
  for (const item of serverHistory) {
    const key = historyItemDateKey(item);
    if (!key) continue;
    serverMap[key] = Math.max(serverMap[key] ?? 0, sanitizeDaySteps(item.stepCount));
  }

  const localDays = await StepHistoryService.getAllRecordedDays(uid);
  const syncMeta: StepSyncMetadata = {
    ...meta,
    source: meta?.source ?? "local_backfill",
    timezone: meta?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  for (const [dateKey, steps] of Object.entries(localDays)) {
    if (dateKey >= todayKey || steps <= 0) continue;
    if (dateKey > yesterdayKey) continue;
    if ((serverMap[dateKey] ?? 0) >= steps) continue;
    try {
      await UserService.syncPastSteps(uid, dateKey, steps, syncMeta);
      serverMap[dateKey] = steps;
    } catch {
      // best-effort — next app open retries
    }
  }
};

export const loadStepAnalytics = async (
  uid: string,
  todaySteps = 0,
  options?: { skipPlatformHealth?: boolean },
): Promise<StepAnalyticsSnapshot> => {
  await backfillLocalHistoryToServer(uid, {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    source: "analytics_load",
  });

  const [historyMap, stats] = await Promise.all([
    loadMergedStepHistory(uid, todaySteps, options),
    UserService.getActivityStats(uid).catch(() => ({ totalSteps: 0 })),
  ]);

  const todayKey = localDateKey();
  const resolvedToday = Math.max(sanitizeDaySteps(todaySteps), historyMap[todayKey] ?? 0);

  const lifetimeFromStats = Number((stats as { totalSteps?: number })?.totalSteps) || 0;
  const lifetimeFromHistory = Object.values(historyMap).reduce((sum, n) => sum + n, 0);

  const computedStreak = computeStepStreak(historyMap, resolvedToday);
  void setCachedStepStreak(computedStreak, uid);
  try {
    updateCachedHistoryMap(historyMap);
  } catch {
    // ignore
  }

  return {
    historyMap,
    streakDays: computedStreak,
    lifetimeSteps: Math.max(lifetimeFromStats, lifetimeFromHistory),
  };
};

export const StepAnalyticsService = {
  localDateKey,
  toLocalDateKey,
  computeStepStreak,
  formatStreakLabel,
  loadMergedStepHistory,
  loadStepAnalytics,
  backfillLocalHistoryToServer,
};

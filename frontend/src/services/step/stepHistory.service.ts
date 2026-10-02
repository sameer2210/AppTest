/**
 * Step History Service
 * Mirrors Flutter's StepHistoryService — saves / loads daily step snapshots
 * so we can recover steps after midnight transitions, reboots or app restarts.
 * Scoped by UID so account switching never leaks past history or streak data.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logError } from "@/config/devLogger";

const MAX_HISTORY_DAYS = 365;

type HistoryMap = Record<string, number>; // { "2024-06-15": 8432, ... }

/** Local date key in YYYY-MM-DD format using device timezone — NOT UTC. */
const localDateKey = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let activeUid: string | null = null;
let memoryCacheMap: Record<string, HistoryMap | null> = {};

const getHistoryKey = (uid?: string): string => {
  const targetUid = uid?.trim() || activeUid?.trim();
  return targetUid ? `stron_step_history_${targetUid}` : "stron_step_history";
};

const loadHistory = async (uid?: string): Promise<HistoryMap> => {
  const key = getHistoryKey(uid);
  if (memoryCacheMap[key]) return memoryCacheMap[key]!;
  try {
    const raw = await AsyncStorage.getItem(key);
    memoryCacheMap[key] = raw ? (JSON.parse(raw) as HistoryMap) : {};
  } catch (error) {
    logError("[StepHistory] Error loading history", error);
    memoryCacheMap[key] = {};
  }
  return memoryCacheMap[key]!;
};

const persistHistory = async (history: HistoryMap, uid?: string): Promise<void> => {
  const key = getHistoryKey(uid);
  try {
    memoryCacheMap[key] = history;
    await AsyncStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    logError("[StepHistory] Error persisting history", error);
  }
};

export const StepHistoryService = {
  setActiveUid(uid: string | null): void {
    activeUid = uid;
  },

  async loadHistory(uid?: string): Promise<void> {
    await loadHistory(uid);
  },

  async saveStepsForDate(dateKey: string, steps: number, uid?: string): Promise<void> {
    const history = await loadHistory(uid);
    if (steps > 0) {
      history[dateKey] = Math.max(history[dateKey] ?? 0, steps);
      await persistHistory(history, uid);
    }
  },

  async getStepsForDate(dateKey: string, uid?: string): Promise<number | null> {
    const history = await loadHistory(uid);
    return history[dateKey] ?? null;
  },

  async getLastNDays(days: number, uid?: string): Promise<Record<string, number>> {
    const history = await loadHistory(uid);
    const result: Record<string, number> = {};
    const today = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = localDateKey(d);
      result[key] = history[key] ?? 0;
    }
    return result;
  },

  /** All locally stored days with steps > 0 (for server backfill). */
  async getAllRecordedDays(uid?: string): Promise<Record<string, number>> {
    const history = await loadHistory(uid);
    const result: Record<string, number> = {};
    for (const [key, steps] of Object.entries(history)) {
      const n = Math.max(0, Math.floor(Number(steps) || 0));
      if (n > 0) result[key] = n;
    }
    return result;
  },

  async recoverTodaySteps(uid?: string): Promise<number | null> {
    return StepHistoryService.getStepsForDate(localDateKey(), uid);
  },

  /** Remove entries older than MAX_HISTORY_DAYS — mirrors Flutter cleanupOldEntries */
  async cleanupOldEntries(uid?: string): Promise<void> {
    const history = await loadHistory(uid);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - MAX_HISTORY_DAYS);
    const cutoffKey = localDateKey(cutoff);
    let changed = false;
    for (const key of Object.keys(history)) {
      if (key < cutoffKey) {
        delete history[key];
        changed = true;
      }
    }
    if (changed) {
      await persistHistory(history, uid);
    }
  },

  /** Clear in-memory cache — call after app restart */
  clearCache(): void {
    memoryCacheMap = {};
    activeUid = null;
  },

  async clearAll(uid?: string): Promise<void> {
    const key = getHistoryKey(uid);
    delete memoryCacheMap[key];
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      logError("[StepHistory] Error clearing history", error);
    }
  },
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { logError } from "@/config/devLogger";
import { MAX_DAILY_STEPS } from "@/constants/steps";
import { UserService } from "../user/user.service";
import { PlatformHealthService } from "../health/platformHealth.service";
import { localDateKey } from "./stepDate.utils";
import {
  STORAGE_KEYS,
  forceSaveLocalSteps,
  getCachedStepsInternal,
  sanitizeStepCount,
  saveLocalSteps,
} from "./stepStorage";
import { buildSyncMeta } from "./stepRollover";
import { replaceNativeAccountSteps } from "./stepNativePlatform";

const MAX_HEALTH_JUMP_ABOVE_CACHE = 15_000;
const MAX_ISOLATED_DUMP_JUMP = 400;

export const rememberLastKnownGood = async (steps: number): Promise<void> => {
  const safe = sanitizeStepCount(steps);
  if (safe <= 0) return;
  const today = localDateKey();
  try {
    const prevDate = await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGoodDate);
    const prev =
      prevDate === today
        ? Number((await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGood)) ?? 0)
        : 0;
    const best = Math.max(prev, safe);
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastKnownGood, String(best)],
      [STORAGE_KEYS.lastKnownGoodDate, today],
    ]);
  } catch {
    /* ignore */
  }
};

/** Overwrite last-known-good (allows downward HC correction). */
export const forceRememberLastKnownGood = async (steps: number): Promise<void> => {
  const safe = sanitizeStepCount(steps);
  const today = localDateKey();
  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastKnownGood, String(safe)],
      [STORAGE_KEYS.lastKnownGoodDate, today],
    ]);
  } catch {
    /* ignore */
  }
};

export const readLastKnownGood = async (): Promise<number> => {
  try {
    const today = localDateKey();
    const date = await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGoodDate);
    if (date !== today) return 0;
    return sanitizeStepCount(Number((await AsyncStorage.getItem(STORAGE_KEYS.lastKnownGood)) ?? 0));
  } catch {
    return 0;
  }
};

/** Fire-and-forget Step Race progress sync (app-wide, not screen-bound). */
export const notifyRaceProgress = (currentUid: string | null, steps: number): void => {
  if (!currentUid || steps < 0) return;
  const uid = currentUid;
  void import("../stepRace/stepRaceSync.service")
    .then((m) => m.syncActiveRaceForUser(uid, steps))
    .catch(() => undefined);
};

export const syncToServer = async (
  currentUid: string | null,
  steps: number,
  options: {
    suppressDeviceWideRecovery?: boolean;
    isolatedStepFloor?: number;
    source?: string;
  } = {},
): Promise<void> => {
  if (!currentUid) return;
  const activeUid = await AsyncStorage.getItem(STORAGE_KEYS.activeUid);
  if (activeUid && activeUid !== currentUid) {
    logError("[StepService] Skipping sync — uid mismatch", {
      currentUid,
      activeUid,
    });
    return;
  }
  const safe = sanitizeStepCount(steps);
  let capped = safe;
  if (options.suppressDeviceWideRecovery) {
    const cached = await getCachedStepsInternal();
    const floor = options.isolatedStepFloor ?? 0;
    const ceiling = Math.max(floor, cached) + MAX_ISOLATED_DUMP_JUMP;
    if (capped > ceiling) {
      capped = Math.max(floor, cached);
      logError("[StepService] Blocked isolated sync above account ceiling", {
        requested: safe,
        capped,
        floor,
      });
    }
  }
  if (Math.floor(Number(steps) || 0) > MAX_DAILY_STEPS) {
    logError("[StepService] Capping implausible steps before sync", { steps, safe: capped });
  }
  try {
    await UserService.syncSteps(currentUid, capped, buildSyncMeta((options.source as any) ?? "debounced"));
    await AsyncStorage.setItem(STORAGE_KEYS.lastSyncedDate, localDateKey());
    await rememberLastKnownGood(capped);
    notifyRaceProgress(currentUid, capped);
  } catch (error) {
    logError("Step sync failed", error);
    await AsyncStorage.setItem(STORAGE_KEYS.pendingSync, String(capped));
  }
};

export const flushPendingSync = async (currentUid: string | null): Promise<void> => {
  const pending = await AsyncStorage.getItem(STORAGE_KEYS.pendingSync);
  if (pending && currentUid) {
    try {
      await UserService.syncSteps(currentUid, Number(pending), buildSyncMeta("pending_flush"));
      await AsyncStorage.removeItem(STORAGE_KEYS.pendingSync);
    } catch (error) {
      logError("Pending step sync flush failed", error);
    }
  }
};

/**
 * When Health Connect is authorized and STRON is materially higher, rebase cache + FGS
 * to HC calendar-day total. Also raises when behind HC.
 */
export const persistHealthConnectReconcile = async (
  currentSteps: number,
  isIsolated: boolean,
  onDownwardReconcile?: (next: number) => void,
  currentUid?: string | null,
): Promise<{ steps: number; corrected: boolean }> => {
  const current = sanitizeStepCount(currentSteps);
  if (isIsolated) {
    return { steps: current, corrected: false };
  }
  try {
    const result = await PlatformHealthService.reconcileTodaySteps(current);
    const next = sanitizeStepCount(result.steps);

    if (result.corrected && next < current) {
      // Never pull today's total down during a live step race (Fit lag froze races).
      try {
        const { getCachedActiveRace } = await import("../stepRace/stepRaceSync.service");
        const liveRace = getCachedActiveRace?.();
        if (liveRace?.status === "active") {
          return { steps: current, corrected: false };
        }
      } catch {
        // ignore
      }
      await forceSaveLocalSteps(next);
      await forceRememberLastKnownGood(next);
      await replaceNativeAccountSteps(next);
      onDownwardReconcile?.(next);
      void syncToServer(currentUid ?? null, next, { source: "health_connect_reconcile" });
      return { steps: next, corrected: true };
    }

    if (next > current) {
      const jump = next - current;
      if (jump > MAX_HEALTH_JUMP_ABOVE_CACHE) {
        logError("[StepService] Discarding implausible HC raise jump", {
          healthSteps: next,
          current,
          jump,
        });
        return { steps: current, corrected: false };
      }
      const saved = await saveLocalSteps(next);
      await rememberLastKnownGood(saved);
      void syncToServer(currentUid ?? null, saved, { source: "health_merge" });
      await replaceNativeAccountSteps(saved).catch(() => undefined);
      return { steps: saved, corrected: false };
    }

    return { steps: current, corrected: false };
  } catch (error) {
    logError("[StepService] persistHealthConnectReconcile failed", error);
    return { steps: current, corrected: false };
  }
};

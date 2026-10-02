/**
 * StepService
 * Mirrors Flutter's step_counting.dart + StepTaskHandler offset/reboot/midnight logic.
 *
 * Decomposed into modular sub-services:
 *  - stepStorage.ts: Local cache, AsyncStorage keys, snapshots, day totals
 *  - stepRollover.ts: Midnight transition and historical day reconciliation
 *  - stepNativePlatform.ts: Android foreground service, iOS CMPedometer, sensor recovery
 *  - stepSync.ts: Debounced server sync, last-known-good, Health Connect reconcile
 *  - stepIsolation.ts: Account switching, user isolation floor, device total slack
 *  - stepWatchdog.ts: Periodic sync timer, foreground polling, AppState listener
 *  - stepPedometerStream.ts: iOS CMPedometer subscription and offset
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { logError } from "@/config/devLogger";
import { StepHistoryService } from "./stepHistory.service";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import {
  clearIosStepNotification,
  invalidateStepNotificationHistoryCache,
  seedStepNotificationPayload,
  syncStepNotification,
} from "./stepNotificationSync.service";
import { StepTrackingPermissions } from "./stepTrackingPermissions.service";
import { STRON_BACKEND_URL } from "@/constants/stron";
import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";
import { localDateKey } from "./stepDate.utils";

import {
  STORAGE_KEYS,
  clearAccountLocalStepState as clearStorageLocalState,
  getCachedStepsInternal,
  looksLikePhoneDayLeak,
  readUidStepSnapshot,
  resolveDeviceDayTotal,
  sanitizeStepCount,
  saveLocalSteps,
  saveUidStepSnapshot,
  snapshotDeviceDaySteps,
} from "./stepStorage";
import {
  clearCorruptedAndroidStepState,
  computeAndroidSteps,
  hasPedometerAccess,
  isPedometerAvailable,
  recoverMissedSteps,
  replaceNativeAccountSteps,
  requestActivityPermissions,
} from "./stepNativePlatform";
import {
  buildSyncMeta,
  handleMidnightIfNeeded,
} from "./stepRollover";
import {
  flushPendingSync,
  persistHealthConnectReconcile,
  readLastKnownGood,
  rememberLastKnownGood,
  syncToServer,
} from "./stepSync";
import {
  consumeHcDownwardAdopt,
  filterIsolatedNativeSteps,
  getIsolatedStepFloor,
  getSuppressDeviceWideRecovery,
  isHealthIsolated,
  peekHcDownwardAdopt,
  setAllowHcDownwardAdopt,
  setDeviceDayTotalAtBind,
  setIsolatedStepFloor,
  setSuppressDeviceWideRecovery,
} from "./stepIsolation";
import {
  debouncedSync,
  startAndroidForegroundPoll,
  startAppStateListener,
  startPeriodicSyncTimer,
  stopWatchdogTimers,
} from "./stepWatchdog";
import {
  resetIosWatcher,
  subscribeIosWatcher,
} from "./stepPedometerStream";

let currentUid: string | null = null;
let onStepsUpdate: ((steps: number) => void) | null = null;

const getSyncMeta = () => ({
  suppressDeviceWideRecovery: getSuppressDeviceWideRecovery(),
  isolatedStepFloor: getIsolatedStepFloor(),
});

const triggerMidnightIfNeeded = async (): Promise<void> => {
  await handleMidnightIfNeeded(currentUid, {
    onStepsReset: (zero) => onStepsUpdate?.(zero),
    onIosSubscriptionReset: () => {
      resetIosWatcher();
    },
  });
};

const subscribeIos = async (base: number): Promise<void> => {
  await subscribeIosWatcher(base, (steps) => {
    onStepsUpdate?.(steps);
    debouncedSync(() => currentUid, steps, getSyncMeta);
  });
};

export const StepService = {
  async isAvailable(): Promise<boolean> {
    return isPedometerAvailable();
  },

  async hasActivityPermission(): Promise<boolean> {
    return hasPedometerAccess();
  },

  async requestPermissions(): Promise<boolean> {
    return requestActivityPermissions();
  },

  async seedInitialSteps(dbSteps: number, options?: { trustDb?: boolean }): Promise<number> {
    await triggerMidnightIfNeeded();
    const localSteps = await getCachedStepsInternal();
    const today = localDateKey();
    const localDate = await AsyncStorage.getItem(STORAGE_KEYS.localStepsDate);
    const lastSynced = await AsyncStorage.getItem(STORAGE_KEYS.lastSyncedDate);
    const cappedDb = sanitizeDailySteps(dbSteps);
    const dbSafeForToday = options?.trustDb || lastSynced === today ? cappedDb : 0;

    if (options?.trustDb) {
      if (cappedDb > 0) {
        const best = await saveLocalSteps(cappedDb);
        await AsyncStorage.setItem(STORAGE_KEYS.lastSyncedDate, today);
        return best;
      }
      return cappedDb;
    }

    if (localDate === today && localSteps > 0) {
      return Math.max(localSteps, dbSafeForToday);
    }

    if (dbSafeForToday > 0) {
      return await saveLocalSteps(dbSafeForToday);
    }

    return Math.max(localSteps, 0);
  },

  async bindToUser(
    uid: string,
    dbSteps: number,
  ): Promise<{ switched: boolean; seeded: number; restoredAccount: boolean }> {
    const prevUid = await AsyncStorage.getItem(STORAGE_KEYS.activeUid);
    const lastStepUid = await AsyncStorage.getItem(STORAGE_KEYS.lastStepUid);
    const isolatedUid = await AsyncStorage.getItem(STORAGE_KEYS.isolateHealth);
    const switched = !prevUid || prevUid !== uid;
    const stayIsolated = isolatedUid === uid;

    const sameAccountReturn = lastStepUid === uid;
    const isDifferentAccount = lastStepUid != null && lastStepUid !== uid;

    if (switched) {
      this.stopTracking();

      let phoneToday = 0;
      if (Platform.OS === "android") {
        const svc = getStepForegroundService();
        phoneToday = svc ? await svc.getCurrentSteps().catch(() => 0) : 0;
        await this.stopForegroundService();
      }

      await clearStorageLocalState(clearCorruptedAndroidStepState);
      StepHistoryService.setActiveUid(uid);
      if (isDifferentAccount) {
        const { clearCachedStepStreak } = await import("./stepAnalytics.service");
        await clearCachedStepStreak(uid).catch(() => undefined);
      }
      if (Platform.OS === "android") {
        const svc = getStepForegroundService();
        if (svc?.clearUserStepState) {
          await svc.clearUserStepState().catch(() => undefined);
        }
      }

      const rawDb = sanitizeStepCount(dbSteps);
      let seeded = rawDb;
      let unpoison = false;
      const deviceTotal = await resolveDeviceDayTotal(phoneToday);
      setDeviceDayTotalAtBind(deviceTotal);
      const uidSnapshot = await readUidStepSnapshot(uid);

      if (sameAccountReturn) {
        setSuppressDeviceWideRecovery(false);
        setDeviceDayTotalAtBind(0);
        if (uidSnapshot != null && !looksLikePhoneDayLeak(uidSnapshot, deviceTotal)) {
          seeded = Math.max(rawDb, uidSnapshot);
        } else if (looksLikePhoneDayLeak(rawDb, deviceTotal)) {
          seeded = uidSnapshot ?? 0;
          if (rawDb > 0 && seeded === 0) unpoison = true;
        }
        setIsolatedStepFloor(seeded);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.activeUid, uid],
          [STORAGE_KEYS.lastStepUid, uid],
        ]);
        await AsyncStorage.removeItem(STORAGE_KEYS.isolateHealth);
      } else {
        setSuppressDeviceWideRecovery(true);
        if (uidSnapshot != null && !looksLikePhoneDayLeak(uidSnapshot, deviceTotal)) {
          seeded = uidSnapshot;
        } else if (looksLikePhoneDayLeak(rawDb, deviceTotal)) {
          seeded = 0;
          unpoison = rawDb > 0;
        } else if (isDifferentAccount) {
          seeded = 0;
          if (rawDb > 0) unpoison = true;
        } else {
          seeded = rawDb;
        }
        setIsolatedStepFloor(seeded);
        await AsyncStorage.multiSet([
          [STORAGE_KEYS.activeUid, uid],
          [STORAGE_KEYS.isolateHealth, uid],
          [STORAGE_KEYS.lastStepUid, uid],
        ]);
      }

      currentUid = uid;

      const trusted = await this.seedInitialSteps(seeded, { trustDb: true });
      setIsolatedStepFloor(trusted);
      await replaceNativeAccountSteps(trusted);
      if (unpoison) {
        void syncToServer(currentUid, 0, { source: "account_switch_unpoison" });
      }
      void import("./stepAnalytics.service").then(({ backfillLocalHistoryToServer }) =>
        backfillLocalHistoryToServer(uid, buildSyncMeta("bind_to_user")),
      );
      return { switched: true, seeded: trusted, restoredAccount: sameAccountReturn };
    }

    currentUid = uid;
    StepHistoryService.setActiveUid(uid);
    setSuppressDeviceWideRecovery(stayIsolated);
    await AsyncStorage.setItem(STORAGE_KEYS.lastStepUid, uid);
    if (stayIsolated) {
      const cached = await getCachedStepsInternal();
      setIsolatedStepFloor(cached);
      return { switched: false, seeded: cached, restoredAccount: false };
    }
    const seeded = await this.seedInitialSteps(dbSteps);
    setIsolatedStepFloor(0);
    void import("./stepAnalytics.service").then(({ backfillLocalHistoryToServer }) =>
      backfillLocalHistoryToServer(uid, buildSyncMeta("bind_to_user")),
    );
    return { switched: false, seeded, restoredAccount: false };
  },

  isDeviceWideRecoverySuppressed(): boolean {
    return getSuppressDeviceWideRecovery();
  },

  filterIsolatedLiveSteps(incoming: number, current: number): number {
    return filterIsolatedNativeSteps(incoming, current);
  },

  async shouldSuppressDeviceWideRecovery(): Promise<boolean> {
    return isHealthIsolated(currentUid);
  },

  async clearAccountLocalStepState(): Promise<void> {
    await clearStorageLocalState(clearCorruptedAndroidStepState);
  },

  async teardownForLogout(): Promise<void> {
    const uidToRemember = currentUid || (await AsyncStorage.getItem(STORAGE_KEYS.activeUid));
    await snapshotDeviceDaySteps();
    if (uidToRemember) {
      const steps = await getCachedStepsInternal();
      await saveUidStepSnapshot(uidToRemember, steps);
    }
    this.stopTracking();
    setAllowHcDownwardAdopt(false);
    if (Platform.OS === "android") {
      const svc = getStepForegroundService();
      if (svc?.clearUserStepState) {
        await svc.clearUserStepState().catch(() => undefined);
      }
      await this.stopForegroundService();
    }
    await clearStorageLocalState(clearCorruptedAndroidStepState);
    if (uidToRemember) {
      await AsyncStorage.setItem(STORAGE_KEYS.lastStepUid, uidToRemember);
    }
    await AsyncStorage.multiRemove([STORAGE_KEYS.activeUid, STORAGE_KEYS.isolateHealth]);
    setSuppressDeviceWideRecovery(true);
    setIsolatedStepFloor(0);
    currentUid = null;
    StepHistoryService.setActiveUid(null);
    invalidateStepNotificationHistoryCache();
    const { clearCachedStepStreak } = await import("./stepAnalytics.service");
    await clearCachedStepStreak().catch(() => undefined);
  },

  localDateKey,

  async isLocalDayCurrent(): Promise<boolean> {
    const today = localDateKey();
    const offsetDate = await AsyncStorage.getItem(STORAGE_KEYS.offsetDate);
    const localDate = await AsyncStorage.getItem(STORAGE_KEYS.localStepsDate);
    return (!offsetDate || offsetDate === today) && (!localDate || localDate === today);
  },

  async getCachedSteps(): Promise<number> {
    return getCachedStepsInternal();
  },

  async startTracking(uid: string, onUpdate: (steps: number) => void): Promise<void> {
    currentUid = uid;
    onStepsUpdate = onUpdate;

    await StepHistoryService.loadHistory();
    await triggerMidnightIfNeeded();

    if (Platform.OS === "android") {
      const cachedRaw = Number((await AsyncStorage.getItem(STORAGE_KEYS.localSteps)) ?? 0);
      const svc = getStepForegroundService();
      const snapshot = svc?.getServiceSnapshot
        ? await svc.getServiceSnapshot().catch(() => null)
        : null;
      const nativeRaw =
        snapshot?.localSteps ?? (svc ? await svc.getCurrentSteps().catch(() => 0) : 0);
      if (
        cachedRaw > MAX_DAILY_STEPS ||
        nativeRaw > MAX_DAILY_STEPS ||
        (snapshot?.dbSteps ?? 0) > MAX_DAILY_STEPS
      ) {
        logError("[StepService] Clearing corrupted Android step state", {
          cachedRaw,
          nativeRaw,
          dbSteps: snapshot?.dbSteps,
        });
        await clearCorruptedAndroidStepState();
        onUpdate(0);
      }
    }

    const cached = await getCachedStepsInternal();
    if (cached > 0 && !getSuppressDeviceWideRecovery()) onUpdate(cached);

    const available = await this.isAvailable();
    if (!available) return;

    let recovered: number | null = null;
    if (!(await isHealthIsolated(currentUid))) {
      recovered = await recoverMissedSteps(false);
      if (recovered !== null && recovered > cached) {
        const best = await saveLocalSteps(recovered);
        onUpdate(best);
      }
    }

    await flushPendingSync(currentUid);

    if (Platform.OS === "ios") {
      const iosBase = Math.max(recovered ?? 0, cached);
      await seedStepNotificationPayload(iosBase);
      await subscribeIos(iosBase);
    } else {
      const fgsBaseline = getSuppressDeviceWideRecovery()
        ? getIsolatedStepFloor()
        : Math.max(cached, recovered ?? 0);
      await StepService.startForegroundService(uid, fgsBaseline);
      resetIosWatcher();
    }

    startPeriodicSyncTimer(() => currentUid, getSyncMeta);

    if (Platform.OS === "android") {
      startAndroidForegroundPoll((best) => {
        onStepsUpdate?.(best);
        debouncedSync(() => currentUid, best, getSyncMeta);
      });
    }

    startAppStateListener({
      onActive: async () => {
        await triggerMidnightIfNeeded();
        const current = await getCachedStepsInternal();

        if (Platform.OS === "ios") {
          let best = current;
          if (!(await isHealthIsolated(currentUid))) {
            const freshBatch = await recoverMissedSteps(false);
            best = Math.max(freshBatch ?? 0, current);
            if (best > current) {
              best = await saveLocalSteps(best);
              onStepsUpdate?.(best);
            }
          }
          await subscribeIos(best);
          await syncToServer(currentUid, best, {
            ...getSyncMeta(),
            source: "app_active_ios",
          });
        } else {
          const svc = getStepForegroundService();
          const isolated = await isHealthIsolated(currentUid);
          let best = await StepService.readAuthoritativeSteps({
            skipHealth: isolated,
          });
          if (best > MAX_DAILY_STEPS) {
            await clearCorruptedAndroidStepState();
            best = 0;
            onStepsUpdate?.(0);
          } else if (best > current) {
            onStepsUpdate?.(best);
          }
          if (svc && best > 0) {
            void svc.updateDbSteps(best);
          }
          await syncToServer(currentUid, best, {
            ...getSyncMeta(),
            source: "app_active_android",
          });
        }
      },
      onBackground: async () => {
        const steps = await getCachedStepsInternal();
        await syncToServer(currentUid, steps, {
          ...getSyncMeta(),
          source: "app_background",
        });
        const svc = getStepForegroundService();
        if (svc) void svc.updateDbSteps(steps);
        const { syncStepNotificationFromStore } = await import("./stepNotificationSync.service");
        syncStepNotificationFromStore();
      },
    });
  },

  async startForegroundService(uid: string, dbSteps: number): Promise<void> {
    if (Platform.OS !== "android") return;
    const svc = getStepForegroundService();
    if (!svc) return;

    try {
      await StepTrackingPermissions.ensureNotificationPermission();
      const today = localDateKey();
      const storedOffset = await AsyncStorage.getItem(STORAGE_KEYS.dailyOffset);
      const offsetDate = await AsyncStorage.getItem(STORAGE_KEYS.offsetDate);
      await seedStepNotificationPayload(dbSteps);

      const { TokenStorage } = await import("../auth/tokenStorage.service");
      const accessToken = (await TokenStorage.getAccessToken()) ?? undefined;
      const refreshToken = (await TokenStorage.getRefreshToken()) ?? undefined;

      const config: {
        userId: string;
        apiUrl: string;
        dbSteps: number;
        dailyOffset?: number;
        offsetDate?: string;
        accessToken?: string;
        refreshToken?: string;
      } = {
        userId: uid,
        apiUrl: STRON_BACKEND_URL,
        dbSteps: sanitizeDailySteps(dbSteps),
        accessToken,
        refreshToken,
      };
      if (storedOffset != null && offsetDate === today) {
        config.dailyOffset = Number(storedOffset);
        config.offsetDate = offsetDate;
      }

      await svc.startService(config);
      await this.sendDbStepsToService(config.dbSteps);
    } catch (error) {
      logError("[StepService] startForegroundService failed", error);
    }
  },

  async stopForegroundService(): Promise<void> {
    if (Platform.OS !== "android") return;
    const svc = getStepForegroundService();
    if (!svc) return;
    try {
      await svc.stopService();
    } catch {
      /* ignore */
    }
  },

  async sendDbStepsToService(steps: number): Promise<void> {
    if (Platform.OS !== "android") return;
    const svc = getStepForegroundService();
    if (!svc) return;
    try {
      let safe = sanitizeDailySteps(steps);
      if (getSuppressDeviceWideRecovery()) {
        const cached = await getCachedStepsInternal();
        safe = filterIsolatedNativeSteps(safe, Math.max(getIsolatedStepFloor(), cached));
        if (svc.replaceAccountSteps) {
          await svc.replaceAccountSteps(safe);
          return;
        }
      }
      await svc.updateDbSteps(safe);
    } catch {
      /* ignore */
    }
  },

  async forceRefreshSteps(): Promise<number> {
    try {
      const best = await this.readAuthoritativeSteps();
      if (Platform.OS === "ios" && best > 0) {
        await subscribeIos(best);
      }
      if (best > 0) {
        onStepsUpdate?.(best);
      }
      return best;
    } catch (error) {
      logError("Force refresh steps failed", error);
    }
    return getCachedStepsInternal();
  },

  async readAuthoritativeSteps(options?: {
    serverSteps?: number;
    skipHealth?: boolean;
  }): Promise<number> {
    await triggerMidnightIfNeeded();
    const cached = await getCachedStepsInternal();
    const lastGood = await readLastKnownGood();
    let best = Math.max(cached, lastGood);

    if (Platform.OS === "android") {
      const svc = getStepForegroundService();
      let nativeSteps = svc ? await svc.getCurrentSteps().catch(() => 0) : 0;
      if (nativeSteps > MAX_DAILY_STEPS) {
        await clearCorruptedAndroidStepState();
        nativeSteps = 0;
      }
      const trusted = filterIsolatedNativeSteps(nativeSteps, best);
      best = Math.max(best, trusted);

      if (!options?.skipHealth && !(await isHealthIsolated(currentUid))) {
        const batch = await recoverMissedSteps(false);
        if (batch !== null && batch > 0 && batch <= MAX_DAILY_STEPS) {
          best = Math.max(best, sanitizeDailySteps(batch));
        }
      }
    } else if (!(await isHealthIsolated(currentUid)) && !options?.skipHealth) {
      const batch = await recoverMissedSteps(false);
      if (batch !== null && batch > 0) {
        best = Math.max(best, sanitizeDailySteps(batch));
      }
    }

    const server = options?.serverSteps;
    if (server != null && server > 0) {
      const serverSafe = sanitizeDailySteps(server);
      if (!(serverSafe > 20_000 && best < 15_000)) {
        best = Math.max(best, serverSafe);
      }
    }

    best = sanitizeDailySteps(best);

    if (!options?.skipHealth && !(await isHealthIsolated(currentUid))) {
      const isolated = await isHealthIsolated(currentUid);
      const reconciled = await persistHealthConnectReconcile(
        best,
        isolated,
        (next) => {
          setIsolatedStepFloor(next);
          setAllowHcDownwardAdopt(true);
        },
        currentUid,
      );
      if (reconciled.corrected) {
        return reconciled.steps;
      }
      best = Math.max(best, reconciled.steps);
    }

    if (best > 0) {
      best = await saveLocalSteps(best);
      await rememberLastKnownGood(best);
    }
    return best;
  },

  async backgroundRefreshAndSync(): Promise<void> {
    try {
      const raw = await AsyncStorage.getItem("stron_user_session");
      if (!raw) return;
      let uid: string | null = null;
      try {
        uid = (JSON.parse(raw) as { uid?: string }).uid ?? null;
      } catch {
        /* malformed session */
      }
      if (!uid) return;

      const prevUid = currentUid;
      currentUid = uid;
      try {
        await triggerMidnightIfNeeded();
        const isolated = await isHealthIsolated(currentUid);
        const steps = await this.readAuthoritativeSteps({ skipHealth: isolated });
        if (steps > 0) {
          await syncToServer(currentUid, steps, {
            ...getSyncMeta(),
            source: "background_fetch_task",
          });
          if (Platform.OS === "ios") {
            await syncStepNotification({
              uid,
              liveSteps: steps,
              enrolledEvents: [],
            });
          }
        }
      } finally {
        currentUid = prevUid;
      }
    } catch (error) {
      logError("[StepService] backgroundRefreshAndSync failed", error);
    }
  },

  async syncCurrentStepsToServer(): Promise<void> {
    try {
      const steps = await getCachedStepsInternal();
      await syncToServer(currentUid, steps, {
        ...getSyncMeta(),
        source: "manual_flush",
      });
    } catch (e) {
      logError("[StepService] syncCurrentStepsToServer failed", e);
    }
  },

  async applyPlatformHealthMerge(currentSteps: number): Promise<number> {
    const current = sanitizeStepCount(currentSteps);
    if (await isHealthIsolated(currentUid)) {
      return current;
    }
    try {
      const isolated = await isHealthIsolated(currentUid);
      const { steps, corrected } = await persistHealthConnectReconcile(
        current,
        isolated,
        (next) => {
          setIsolatedStepFloor(next);
          setAllowHcDownwardAdopt(true);
        },
        currentUid,
      );
      if (steps > current) {
        await this.sendDbStepsToService(steps);
      } else if (corrected || steps < current) {
        await replaceNativeAccountSteps(steps);
      }
      return steps;
    } catch (error) {
      logError("[StepService] applyPlatformHealthMerge failed", error);
      return current;
    }
  },

  consumeHcDownwardAdopt(): boolean {
    return consumeHcDownwardAdopt();
  },

  peekHcDownwardAdopt(): boolean {
    return peekHcDownwardAdopt();
  },

  async replaceAccountStepsForHcCorrection(steps: number): Promise<void> {
    await replaceNativeAccountSteps(sanitizeStepCount(steps));
  },

  stopTracking(): void {
    resetIosWatcher();
    stopWatchdogTimers();
    currentUid = null;
    onStepsUpdate = null;
    void clearIosStepNotification();
  },

  getTrackingStage(steps: number): "weak" | "normal" | "strong" | "maxed" {
    if (steps < 1000) return "weak";
    if (steps < 5000) return "normal";
    if (steps < 10000) return "strong";
    return "maxed";
  },

  async loadOffset(): Promise<number> {
    await triggerMidnightIfNeeded();
    const offset = await AsyncStorage.getItem(STORAGE_KEYS.dailyOffset);
    return Number(offset ?? 0);
  },

  async computeSteps(rawReading: number): Promise<number> {
    return computeAndroidSteps(rawReading, triggerMidnightIfNeeded);
  },
};

import { createAsyncThunk } from "@reduxjs/toolkit";
import { Platform } from "react-native";
import {
  StepTrackingPermissions,
  StepService,
  GoogleFitService,
  AppleHealthService,
  PlatformHealthService,
  syncStepNotificationFromStore,
  seedStepNotificationPayload,
  HealthConnectStatus,
  loadStepAnalytics,
  computeStepStreak,
  invalidateStepNotificationHistoryCache,
  getCachedStepStreak,
} from "../api/steps.api";
import { setTodaySteps, setTrackingStage, setIsTracking, resetStepsState } from "./steps.slice";
import { updateUser } from "@/features/auth";
import { getAppStore } from "@/store/getAppStore";
import type { RootState } from "@/store/store";
import type { TrackingStage } from "@/models/tracking";

import type { MonthlyStepStats, WeeklyStepStats } from "@/models/stepStats";
import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";
const applyTrackingStage = async (dispatch: (action: unknown) => void) => {
  const snapshot = await StepTrackingPermissions.loadSnapshot();
  const stage = StepTrackingPermissions.resolveStage(snapshot);
  dispatch(setTrackingStage(stage));
  return stage;
};

let healthSyncTimer: ReturnType<typeof setInterval> | null = null;
/** Prevents Bootstrap + Home from racing two inits for the same uid. */
let initializeInFlightUid: string | null = null;
let initializeInFlight: Promise<void> | null = null;

const mergeWithPlatformHealth = async (steps: number): Promise<number> => {
  // Health Connect / Apple Health are device-wide — never import them onto a
  // freshly switched account (would copy the previous user's day total).
  // Persists + syncs via StepService so UI/FGS/server stay aligned (H3).
  return StepService.applyPlatformHealthMerge(steps);
};

const handleLiveStepUpdate = (dispatch: (action: unknown) => void, steps: number) => {
  const incoming = sanitizeDailySteps(steps);
  const current = (getAppStore()?.getState?.() as RootState | undefined)?.steps?.todaySteps ?? 0;
  const currentSafe = sanitizeDailySteps(current);
  const isolated = StepService.isDeviceWideRecoverySuppressed();
  const filtered = isolated ? StepService.filterIsolatedLiveSteps(incoming, currentSafe) : incoming;
  const allowDownward = StepService.consumeHcDownwardAdopt();
  const isNewDayOrReset = filtered === 0 || isolated;
  const resolved = isNewDayOrReset || allowDownward ? filtered : Math.max(filtered, currentSafe);
  if (resolved === current && current <= MAX_DAILY_STEPS && !isNewDayOrReset) return;
  if (isolated && filtered === currentSafe && incoming > currentSafe) return;

  dispatch(setTodaySteps(resolved));
  dispatch(setIsTracking(true));
  dispatch(updateUser({ todaysStepCount: resolved }));
  if (allowDownward && resolved < currentSafe) {
    // HC rebase: replace native session — updateDbSteps would max back up.
    void StepService.replaceAccountStepsForHcCorrection(resolved);
  } else {
    void StepService.sendDbStepsToService(resolved);
  }
  syncStepNotificationFromStore();
  const uid = getAppStore()?.getState?.()?.auth?.user?.uid;
  if (uid) {
    void import("@/features/stepRace").then(({ syncActiveRace }) =>
      dispatch(syncActiveRace({ uid, steps: resolved })),
    );
  }
};

export const teardownStepTracking = createAsyncThunk<void, void>(
  "steps/teardown",
  async (_, { dispatch }) => {
    await StepService.syncCurrentStepsToServer();
    if (healthSyncTimer) {
      clearInterval(healthSyncTimer);
      healthSyncTimer = null;
    }
    initializeInFlightUid = null;
    initializeInFlight = null;
    await StepService.teardownForLogout();
    void import("@/features/stepRace").then(({ clearActiveRaceSync }) =>
      dispatch(clearActiveRaceSync()),
    );
    dispatch(resetStepsState());
  },
);

export const initializeStepTracking = createAsyncThunk<void, string, { state: RootState }>(
  "steps/initialize",
  async (uid, { dispatch, getState }) => {
    if (initializeInFlightUid === uid && initializeInFlight) {
      await initializeInFlight;
      return;
    }

    let resolveInFlight: () => void = () => undefined;
    initializeInFlight = new Promise<void>((resolve) => {
      resolveInFlight = resolve;
    });
    initializeInFlightUid = uid;

    try {
      const authUser = getState().auth.user;
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // After logout the auth slice may still hold stale counts — refresh first.
      let profileUser = authUser;
      try {
        const { refreshCurrentUserProfile } = await import("@/features/auth");
        await dispatch(refreshCurrentUserProfile(uid));
        profileUser = getState().auth.user;
      } catch {
        // keep auth slice user
      }

      const lastActive = profileUser?.lastActive ? new Date(profileUser.lastActive) : null;
      const lastActiveKey = lastActive
        ? `${lastActive.getFullYear()}-${String(lastActive.getMonth() + 1).padStart(2, "0")}-${String(lastActive.getDate()).padStart(2, "0")}`
        : null;
      const serverIsToday = lastActiveKey === todayKey;
      const rawDb = serverIsToday ? (profileUser?.todaysStepCount ?? 0) : 0;
      const dbSteps = sanitizeDailySteps(rawDb);

      const { switched, seeded, restoredAccount } = await StepService.bindToUser(uid, dbSteps);
      // On non-switched restart (app killed & reopened), FGS may have a higher
      // count than the stale server/cache seed. Read it eagerly so Redux never
      // holds a stale value that makes the step race UI regress.
      let effectiveSeeded = seeded;
      if (!switched && Platform.OS === "android") {
        try {
          const { getStepForegroundService } =
            await import("../../../provider/stepForegroundServiceLazy");
          const svc = getStepForegroundService();
          const fgsSteps = svc ? await svc.getCurrentSteps().catch(() => 0) : 0;
          if (fgsSteps > 0 && fgsSteps <= MAX_DAILY_STEPS && fgsSteps > effectiveSeeded) {
            effectiveSeeded = sanitizeDailySteps(fgsSteps);
          }
        } catch {
          /* ignore */
        }
      }
      dispatch(setTodaySteps(effectiveSeeded));
      dispatch(updateUser({ todaysStepCount: effectiveSeeded }));

      await applyTrackingStage(dispatch);

      const available = await StepService.isAvailable();

      // Never request Motion / Health / Notifications here — and never touch
      // pedometer data APIs until the in-app Enable button has granted access.
      const granted = await StepService.hasActivityPermission();
      if (!granted) {
        dispatch(setTrackingStage("weak"));
        return;
      }
      // Soft reconnect only when the user already opted in previously.
      await PlatformHealthService.initializeIfEnabled();

      if (!available) {
        let healthOnly = seeded;
        if (!switched && !StepService.isDeviceWideRecoverySuppressed()) {
          healthOnly = await mergeWithPlatformHealth(seeded);
        }
        if (healthOnly !== seeded) {
          handleLiveStepUpdate(dispatch, healthOnly);
          // applyPlatformHealthMerge already saved/synced/FGS-updated
        }
        await applyTrackingStage(dispatch);
        return;
      }

      await StepService.startTracking(uid, (steps) => {
        handleLiveStepUpdate(dispatch, steps);
      });

      let merged = seeded;
      if (restoredAccount || !switched) {
        const refreshed = await StepService.readAuthoritativeSteps({
          serverSteps: dbSteps,
          skipHealth: StepService.isDeviceWideRecoverySuppressed(),
        });
        // HC reconcile inside readAuthoritativeSteps may lower; don't Math.max back up.
        merged = StepService.peekHcDownwardAdopt()
          ? sanitizeDailySteps(refreshed)
          : sanitizeDailySteps(Math.max(refreshed, seeded));
        if (!StepService.isDeviceWideRecoverySuppressed()) {
          merged = await mergeWithPlatformHealth(merged);
        }
        merged = sanitizeDailySteps(merged);
        handleLiveStepUpdate(dispatch, merged);
      } else {
        void StepService.sendDbStepsToService(seeded);
        handleLiveStepUpdate(dispatch, seeded);
      }

      await applyTrackingStage(dispatch);
      syncStepNotificationFromStore();
      void seedStepNotificationPayload((getAppStore()?.getState?.() as RootState | undefined)?.steps?.todaySteps ?? 0);

      if (healthSyncTimer) clearInterval(healthSyncTimer);
      healthSyncTimer = setInterval(() => {
        if (StepService.isDeviceWideRecoverySuppressed()) return;
        const current = (getAppStore()?.getState?.() as RootState | undefined)?.steps?.todaySteps ?? 0;
        void mergeWithPlatformHealth(current).then((nextSteps) => {
          if (nextSteps !== current) {
            const appStore = getAppStore();
            if (appStore?.dispatch) {
              handleLiveStepUpdate(appStore.dispatch, nextSteps);
            }
          }
        });
      }, 30 * 1000);
    } finally {
      resolveInFlight();
      if (initializeInFlightUid === uid) {
        initializeInFlightUid = null;
        initializeInFlight = null;
      }
    }
  },
);

export const advanceStepTrackingPermission = createAsyncThunk<
  TrackingStage,
  void,
  { state: RootState }
>("steps/advancePermission", async (_, { dispatch, getState }) => {
  const current = getState().steps.trackingStage;

  if (current === "weak") {
    const granted = await StepService.requestPermissions();
    if (!granted) {
      dispatch(setTrackingStage("weak"));
      return "weak";
    }
  }

  const next = await StepTrackingPermissions.advancePermissionStage(current);
  dispatch(setTrackingStage(next));

  if (Platform.OS === "ios" && current === "active") {
    syncStepNotificationFromStore();
  }

  const uid = getState().auth.user?.uid;
  if (uid && (current === "weak" || current === "stable" || current === "active")) {
    await dispatch(initializeStepTracking(uid));
  }

  return next;
});

export const refreshUserStepsFromProfile = createAsyncThunk<void, void, { state: RootState }>(
  "steps/refreshFromProfile",
  async (_, { getState, dispatch }) => {
    const user = getState().auth.user;
    const dbSteps = user?.todaysStepCount ?? 0;
    const currentLive = getState().steps.todaySteps;
    const merged = Math.max(currentLive, await StepService.seedInitialSteps(dbSteps));
    dispatch(setTodaySteps(merged));
    dispatch(updateUser({ todaysStepCount: merged }));
    await applyTrackingStage(dispatch);
  },
);

export const refreshTrackingStage = createAsyncThunk<void, void>(
  "steps/refreshTrackingStage",
  async (_, { dispatch }) => {
    await applyTrackingStage(dispatch);
  },
);

export const refreshTodaySteps = createAsyncThunk<number, void, { state: RootState }>(
  "steps/refreshToday",
  async (_, { dispatch, getState }) => {
    const isolated = StepService.isDeviceWideRecoverySuppressed();
    const refreshed = await StepService.readAuthoritativeSteps({
      skipHealth: isolated,
    });
    let merged = refreshed;
    if (!isolated) {
      merged = await mergeWithPlatformHealth(refreshed);
    }
    handleLiveStepUpdate(dispatch, merged);
    await applyTrackingStage(dispatch);
    return getState().steps.todaySteps;
  },
);

export const syncWithGoogleFit = createAsyncThunk<number, void, { state: RootState }>(
  "steps/syncGoogleFit",
  async (_, { getState, dispatch }) => {
    const current = getState().steps.todaySteps;
    if (await StepService.shouldSuppressDeviceWideRecovery()) {
      return current;
    }
    const merged = await mergeWithPlatformHealth(current);
    if (merged !== current) {
      handleLiveStepUpdate(dispatch, merged);
    }
    await applyTrackingStage(dispatch);
    return getState().steps.todaySteps;
  },
);

export const requestGoogleFitAuthorization = createAsyncThunk<
  HealthConnectStatus,
  void,
  { state: RootState }
>("steps/requestGoogleFitAuthorization", async (_, { dispatch }) => {
  const status = await GoogleFitService.requestAuthorizationFlow();
  await applyTrackingStage(dispatch);
  if (status === HealthConnectStatus.authorized) {
    await dispatch(syncWithGoogleFit());
  }
  return status;
});

export type GoogleFitStatsPayload = {
  weeklyStats: WeeklyStepStats;
  monthlyStats: MonthlyStepStats;
  todaySteps: number;
  lastSync: string | null;
};

export const loadGoogleFitStats = createAsyncThunk<GoogleFitStatsPayload, void>(
  "steps/loadGoogleFitStats",
  async () => {
    await GoogleFitService.initializeIfEnabled();
    const [weeklyStats, monthlyStats, todaySteps, lastSync] = await Promise.all([
      GoogleFitService.getWeeklyStats(),
      GoogleFitService.getMonthlyStats(),
      GoogleFitService.getTodaySteps(),
      GoogleFitService.getLastSyncTime(),
    ]);
    // lastSync is already an ISO string from the service (never a Date).
    return { weeklyStats, monthlyStats, todaySteps, lastSync };
  },
);

export const requestStepPermissions = createAsyncThunk<boolean, void>(
  "steps/requestPermissions",
  async () => {
    return StepService.requestPermissions();
  },
);

export const syncCurrentStepsToServer = createAsyncThunk<void, void>(
  "steps/syncCurrentToServer",
  async () => {
    await StepService.syncCurrentStepsToServer();
  },
);

export const checkGoogleFitEnabled = createAsyncThunk<boolean, void>(
  "steps/checkGoogleFitEnabled",
  async () => {
    return GoogleFitService.isEnabled();
  },
);

export const checkHealthConnectSyncNeededThunk = createAsyncThunk<boolean, void>(
  "steps/checkHealthConnectSyncNeeded",
  async () => {
    try {
      const activityGranted = await StepService.hasActivityPermission();
      if (!activityGranted) return false;

      if (Platform.OS === "android") {
        const status = await GoogleFitService.checkHealthConnectStatus();
        const needsConnect =
          status === HealthConnectStatus.notAuthorized ||
          status === HealthConnectStatus.notInstalled;
        return needsConnect;
      }
      if (Platform.OS === "ios") {
        const available = await AppleHealthService.isAvailable();
        const enabled = await AppleHealthService.isEnabled();
        return available && !enabled;
      }
      return false;
    } catch {
      return false;
    }
  },
);

export const loadStepAnalyticsThunk = createAsyncThunk<
  { historyMap: Record<string, number>; streakDays: number; nextSteps: number },
  { uid: string; stepsForStreak: number; currentLiveSteps: number; force?: boolean }
>("steps/loadAnalytics", async ({ uid, stepsForStreak, currentLiveSteps, force }) => {
  if (force) invalidateStepNotificationHistoryCache();
  const skipPlatformHealth = StepService.isDeviceWideRecoverySuppressed();
  const analytics = await loadStepAnalytics(uid, stepsForStreak, {
    skipPlatformHealth,
  });
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const historyToday = analytics.historyMap[todayKey] ?? 0;
  const nextSteps = skipPlatformHealth ? currentLiveSteps : Math.max(currentLiveSteps, historyToday);
  const streakDays = computeStepStreak(analytics.historyMap, nextSteps);
  return { historyMap: analytics.historyMap, streakDays, nextSteps };
});

export const computeStreakFromHistoryThunk = createAsyncThunk<
  number,
  { historyMap: Record<string, number>; todaySteps: number }
>("steps/computeStreak", async ({ historyMap, todaySteps }) => {
  return computeStepStreak(historyMap, todaySteps);
});

export const getCachedStepStreakThunk = createAsyncThunk<number, string>(
  "steps/getCachedStreak",
  async (uid) => {
    return getCachedStepStreak(uid);
  },
);

export const refreshPermissionSnapshotThunk = createAsyncThunk<void, void>(
  "steps/refreshPermissionSnapshot",
  async (_, { dispatch }) => {
    await StepTrackingPermissions.loadSnapshot();
    await dispatch(refreshTrackingStage());
  },
);

export const resolveServerMergedStepsThunk = createAsyncThunk<
  number,
  { serverSteps: number; liveSteps: number; serverIsToday: boolean }
>("steps/resolveServerMergedSteps", async ({ serverSteps, liveSteps, serverIsToday }) => {
  const isServerPoisoned = serverSteps > 20000 && liveSteps < 15000;
  const isolated = StepService.isDeviceWideRecoverySuppressed();
  return isolated || !serverIsToday || isServerPoisoned
    ? liveSteps
    : Math.max(serverSteps, liveSteps);
});

export const checkActivityPermissionThunk = createAsyncThunk<boolean, void>(
  "steps/checkActivityPermission",
  async () => {
    return StepService.hasActivityPermission();
  },
);




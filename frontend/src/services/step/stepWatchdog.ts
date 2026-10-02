import { AppState, Platform } from "react-native";
import { MAX_DAILY_STEPS } from "@/constants/steps";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import { filterIsolatedNativeSteps } from "./stepIsolation";
import { getCachedStepsInternal, saveLocalSteps } from "./stepStorage";
import { syncToServer } from "./stepSync";

const SYNC_INTERVAL_MS = 60 * 1000;
const DEBOUNCE_MS = 2000;
const FOREGROUND_POLL_MS = 3000;

let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let foregroundPollTimer: ReturnType<typeof setInterval> | null = null;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const debouncedSync = (
  getUid: () => string | null,
  steps: number,
  getSyncMeta: () => { suppressDeviceWideRecovery: boolean; isolatedStepFloor: number },
): void => {
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    void syncToServer(getUid(), steps, {
      ...getSyncMeta(),
      source: "debounced",
    });
  }, DEBOUNCE_MS);
};

export const startPeriodicSyncTimer = (
  getUid: () => string | null,
  getSyncMeta: () => { suppressDeviceWideRecovery: boolean; isolatedStepFloor: number },
): void => {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    void getCachedStepsInternal().then((steps) =>
      syncToServer(getUid(), steps, {
        ...getSyncMeta(),
        source: "periodic_timer",
      }),
    );
  }, SYNC_INTERVAL_MS);
};

export const startAndroidForegroundPoll = (
  onPollSteps: (steps: number) => void,
): void => {
  if (foregroundPollTimer) clearInterval(foregroundPollTimer);
  if (Platform.OS !== "android") return;
  foregroundPollTimer = setInterval(() => {
    void (async () => {
      const svc = getStepForegroundService();
      if (!svc) return;
      const nativeSteps = await svc.getCurrentSteps().catch(() => 0);
      if (nativeSteps <= 0 || nativeSteps > MAX_DAILY_STEPS) return;
      const currentCached = await getCachedStepsInternal();
      const trusted = filterIsolatedNativeSteps(nativeSteps, currentCached);
      if (trusted !== currentCached) {
        const best = await saveLocalSteps(trusted);
        onPollSteps(best);
      }
    })();
  }, FOREGROUND_POLL_MS);
};

export const startAppStateListener = (handlers: {
  onActive: () => Promise<void>;
  onBackground: () => Promise<void>;
}): void => {
  appStateSubscription?.remove();
  appStateSubscription = AppState.addEventListener("change", async (state) => {
    if (state === "active") {
      await handlers.onActive();
    } else if (state === "background") {
      await handlers.onBackground();
    }
  });
};

export const stopWatchdogTimers = (): void => {
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
  if (foregroundPollTimer) clearInterval(foregroundPollTimer);
  foregroundPollTimer = null;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = null;
  appStateSubscription?.remove();
  appStateSubscription = null;
};

/**
 * Background task registration.
 * Foreground-service periodic repeat + Google Fit sync.
 *
 * expo-background-fetch wakes the app every ~15 min on iOS and Android.
 * We use it to:
 *  1. Recover any steps missed while the app was killed (Pedometer batch query)
 *  2. Sync step count to the server
 *
 * defineTask MUST be called at module load time (before any await) so
 * expo-task-manager can find it when the OS wakes the app.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import { getExpoTaskManager } from "./provider/expoTaskManagerLazy";
import { getExpoNotifications } from "./provider/expoNotificationsLazy";
import { logError } from "./config/devLogger";

const BACKGROUND_NOTIFICATION_TASK = "STRON_BACKGROUND_NOTIFICATION";
export const BACKGROUND_STEP_TASK = "STRON_BACKGROUND_STEP_SYNC";

// ─── Define tasks at module load (required by expo-task-manager) ──────────────

if (Constants.executionEnvironment !== ExecutionEnvironment.StoreClient) {
  try {
    const TaskManager = getExpoTaskManager();
    if (TaskManager) {
      // Notification background task (keep existing)
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => undefined);

      // Step sync background task — runs on iOS & Android when app is in background/killed.
      // Uses backgroundRefreshAndSync which reads the stored UID from AsyncStorage so it
      // can sync to the server even when no live session is active.
      TaskManager.defineTask(BACKGROUND_STEP_TASK, async ({ error }) => {
        if (error) {
          logError("[BgStepTask] Error from OS", error);
          try {
            const BackgroundFetch = await import("expo-background-fetch");
            return BackgroundFetch.BackgroundFetchResult.Failed;
          } catch {
            return;
          }
        }
        try {
          const { StepService } = await import("./services/step/step.service");
          await StepService.backgroundRefreshAndSync();

          try {
            const BackgroundFetch = await import("expo-background-fetch");
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } catch {
            return;
          }
        } catch (err) {
          logError("[BgStepTask] backgroundRefreshAndSync failed", err);
          try {
            const BackgroundFetch = await import("expo-background-fetch");
            return BackgroundFetch.BackgroundFetchResult.Failed;
          } catch {
            return;
          }
        }
      });
    }

    // Register notification task
    const Notifications = getExpoNotifications();
    if (TaskManager && Notifications) {
      void Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(() => {});
    }
  } catch {
    // Expo Go or platform without task manager — silently ignore
  }
}

// ─── Registration helper (call once after auth) ───────────────────────────────

export const registerBackgroundStepSync = async (): Promise<void> => {
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return;

  try {
    const TaskManager = getExpoTaskManager();
    if (!TaskManager) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_STEP_TASK);
    if (isRegistered) return;

    // expo-background-fetch must be loaded lazily for Expo Go safety
    const BackgroundFetch = await import("expo-background-fetch");
    await BackgroundFetch.registerTaskAsync(BACKGROUND_STEP_TASK, {
      minimumInterval: 15 * 60, // 15 minutes — system minimum on iOS & Android
      stopOnTerminate: false, // Keep running after app is killed (Android)
      startOnBoot: true, // Auto-restart on device boot (Android)
    });
  } catch (error) {
    logError("[BgStepTask] Registration failed", error);
  }
};

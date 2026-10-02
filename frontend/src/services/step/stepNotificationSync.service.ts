import { Platform } from "react-native";
import { getStepForegroundService } from "@/provider/stepForegroundServiceLazy";
import { getExpoNotifications } from "@/provider/expoNotificationsLazy";
import type { EventEnrollment } from "@/models/event";
import { buildStepNotificationContext } from "./stepNotificationContextBuilder.service";
import { buildStepNotificationContent, toCustomPayload, toIosBannerContent } from "./stepNotificationFormatter.service";
import type { StepNotificationContext } from "@/models/stepNotification.types";
import { getAppStore } from "@/store/getAppStore";
import { computeStepStreak, loadMergedStepHistory } from "./stepAnalytics.service";
import { hasPushNotificationPermission } from "../notification/pushNotification.service";

export const IOS_STEP_NOTIFICATION_ID = "stron-step-tracker";

let lastContextKey: string | null = null;
let lastSyncedSteps = -1;
let lastSyncedStreak = -1;
let cachedHistoryMap: Record<string, number> = {};
let historyFetchedAt = 0;
const HISTORY_TTL_MS = 5 * 60 * 1000;

export const updateCachedHistoryMap = (map: Record<string, number>) => {
  cachedHistoryMap = { ...map };
  historyFetchedAt = Date.now();
};

const contextKey = (context: StepNotificationContext) =>
  JSON.stringify({
    case: context.notificationCase,
    marathonRemainingKm: context.marathonRemainingKm ?? null,
    highestOtherMemberSteps: context.highestOtherMemberSteps ?? null,
    streakDays: context.streakDays ?? 0,
  });

const resolveStreakDays = async (uid: string, liveSteps: number): Promise<number> => {
  if (!uid || !uid.trim()) {
    return 0;
  }

  const isFirstLoad = historyFetchedAt === 0;
  const isCacheStale = Date.now() - historyFetchedAt > HISTORY_TTL_MS;
  try {
    if (isFirstLoad || isCacheStale) {
      cachedHistoryMap = await loadMergedStepHistory(uid, liveSteps, { skipPlatformHealth: true });
      historyFetchedAt = Date.now();
    }
  } catch {
    // keep cachedHistoryMap as-is
  }

  return computeStepStreak(cachedHistoryMap, liveSteps);
};

export const hasStepNotificationPermission = async (): Promise<boolean> => {
  return hasPushNotificationPermission();
};

const dismissStaleIosStepNotifications = async (
  notifications: NonNullable<ReturnType<typeof getExpoNotifications>>,
) => {
  try {
    const presented = await notifications.getPresentedNotificationsAsync().catch(() => []);
    for (const item of presented) {
      if (
        item.request.identifier === IOS_STEP_NOTIFICATION_ID ||
        item.request.content.title?.includes("STRON Tracker") ||
        item.request.content.body?.includes("👣")
      ) {
        await notifications.dismissNotificationAsync(item.request.identifier).catch(() => undefined);
      }
    }
  } catch {
    /* ignore dismiss errors */
  }
};

const presentIosStepNotification = async (steps: number, context: StepNotificationContext) => {
  if (Platform.OS !== "ios") return;

  const notifications = getExpoNotifications();
  if (!notifications) return;
  if (!(await hasStepNotificationPermission())) return;

  const content = buildStepNotificationContent(steps, context);
  const banner = toIosBannerContent(content);

  await dismissStaleIosStepNotifications(notifications);

  await notifications.scheduleNotificationAsync({
    identifier: IOS_STEP_NOTIFICATION_ID,
    content: {
      title: banner.title,
      subtitle: banner.subtitle,
      body: banner.body,
      sound: false,
      interruptionLevel: "passive",
      data: {
        key: "step_tracker",
        deepLink: "stron://home",
        type: "notification_delivery_tracking",
        _local: "1",
      },
    },
    trigger: null,
  });
};

/** Clears the persistent iOS step tracker notification (logout / tracking stopped). */
export const clearIosStepNotification = async () => {
  if (Platform.OS !== "ios") return;
  const notifications = getExpoNotifications();
  if (!notifications) return;
  try {
    await dismissStaleIosStepNotifications(notifications);
  } catch {
    await notifications.dismissNotificationAsync(IOS_STEP_NOTIFICATION_ID).catch(() => undefined);
  }
  lastContextKey = null;
  lastSyncedSteps = -1;
  lastSyncedStreak = -1;
};

/** Parity: HomeScreen._scheduleStepNotificationContextSync + StepNotificationPayloadStore */
export const syncStepNotification = async ({
  uid,
  liveSteps,
  enrolledEvents,
}: {
  uid: string;
  liveSteps: number;
  enrolledEvents: EventEnrollment[];
}) => {
  const effectiveUid = uid?.trim() || "";

  const { StepService } = await import("./step.service");
  const isolated = StepService.isDeviceWideRecoverySuppressed?.() === true;
  const cachedSteps = isolated ? 0 : await StepService.getCachedSteps().catch(() => 0);
  const safeSteps = isolated ? liveSteps : Math.max(liveSteps, cachedSteps);

  const streakDays = await resolveStreakDays(effectiveUid, safeSteps);
  const context = {
    ...buildStepNotificationContext({
      enrolledEvents,
      liveSteps: safeSteps,
    }),
    streakDays,
  };

  const nextKey = contextKey(context);
  if (
    nextKey === lastContextKey &&
    safeSteps === lastSyncedSteps &&
    streakDays === lastSyncedStreak
  ) {
    return;
  }
  lastContextKey = nextKey;
  lastSyncedSteps = safeSteps;
  lastSyncedStreak = streakDays;

  const content = buildStepNotificationContent(safeSteps, context);
  const payload = toCustomPayload(content);

  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    if (svc?.updateNotificationPayload) {
      await svc.updateNotificationPayload(payload).catch(() => undefined);
    }
    if (svc?.updateDbSteps) {
      await svc.updateDbSteps(safeSteps).catch(() => undefined);
    }
    // Refresh race/event shade from persisted prefs + latest local steps
    await svc?.refreshLiveNotifications?.().catch(() => undefined);
    return;
  }

  if (Platform.OS === "ios" && safeSteps >= 0) {
    await presentIosStepNotification(safeSteps, context);
  }
};

/** Read Redux state and sync — parity: HomeScreen._scheduleStepNotificationContextSync */
export const syncStepNotificationFromStore = () => {
  const store = getAppStore();
  const state = store?.getState?.();
  const uid = state?.auth?.user?.uid;
  if (!uid) return;

  const enrolledEvents = (state as any)?.events?.myEnrollments ?? [];
  void syncStepNotification({
    uid,
    liveSteps: (state as any)?.steps?.todaySteps ?? 0,
    enrolledEvents,
  });
};

/** Seed idle notification before foreground service starts — Flutter: _seedForegroundNotificationPayload */
export const seedStepNotificationPayload = async (steps: number, streakDays?: number) => {
  const store = getAppStore();
  const state = store?.getState?.();
  const uid = state?.auth?.user?.uid || "";
  const { StepService } = await import("./step.service");
  const isolated = StepService.isDeviceWideRecoverySuppressed?.() === true;
  const cachedSteps = isolated ? 0 : await StepService.getCachedSteps().catch(() => 0);
  const safeSteps = isolated ? steps : Math.max(steps, cachedSteps);
  const resolvedStreak = streakDays ?? (uid ? await resolveStreakDays(uid, safeSteps) : 0);

  const content = buildStepNotificationContent(safeSteps, {
    notificationCase: "idle",
    streakDays: resolvedStreak,
  });
  const payload = toCustomPayload(content);

  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    if (svc?.updateNotificationPayload) {
      await svc.updateNotificationPayload(payload).catch(() => undefined);
    }
    return;
  }

  if (Platform.OS === "ios") {
    await presentIosStepNotification(safeSteps, {
      notificationCase: "idle",
      streakDays: resolvedStreak,
    });
  }
};

/** Force refresh cached history (call after midnight / profile reload). */
export const invalidateStepNotificationHistoryCache = () => {
  historyFetchedAt = 0;
  cachedHistoryMap = {};
  lastContextKey = null;
  lastSyncedSteps = -1;
  lastSyncedStreak = -1;
};

/** Recompute streak from fresh history — use after midnight rollover. */
export const refreshStreakFromHistory = async (uid: string, liveSteps: number): Promise<number> => {
  cachedHistoryMap = await loadMergedStepHistory(uid, liveSteps, { skipPlatformHealth: true });
  historyFetchedAt = Date.now();
  return computeStepStreak(cachedHistoryMap, liveSteps);
};

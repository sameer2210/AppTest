import { Platform } from "react-native";
import { getExpoNotifications } from "@/provider/expoNotificationsLazy";

/** Marks a notification we scheduled locally (never re-display as a new local). */
export const LOCAL_DELIVERY_TYPE = "notification_delivery_tracking";

export const LIVE_STICKY_DATA_KEYS = new Set([
  "step_race_live",
  "events_live",
  "step_tracker",
]);

export const LIVE_STICKY_IDENTIFIERS = new Set([
  "stron-step-race-live",
  "stron-events-live",
  "stron-step-tracker",
]);

/** Skip identical alert banners (title+body) within this window — all app sections. */
const ALERT_DEDUPE_MS = 30_000;
/** iOS sticky live shade: replace at most this often unless force. */
const IOS_STICKY_MIN_INTERVAL_MS = 60_000;

const recentAlerts = new Map<string, number>();
const stickyLastAt = new Map<string, number>();

const pruneOld = (map: Map<string, number>, maxAgeMs: number, now: number) => {
  for (const [key, at] of map) {
    if (now - at > maxAgeMs) map.delete(key);
  }
};

export const isLiveStickyNotification = (notification: {
  request: {
    identifier?: string;
    content: { data?: Record<string, unknown>; title?: string | null };
  };
}): boolean => {
  const data = notification.request.content.data;
  const key = typeof data?.key === "string" ? data.key : undefined;
  const id = notification.request.identifier;
  if (key && LIVE_STICKY_DATA_KEYS.has(key)) return true;
  if (id && LIVE_STICKY_IDENTIFIERS.has(id)) return true;
  if (notification.request.content.title?.includes("STRON Tracker")) return true;
  return false;
};

const alertFingerprint = (title: string, body: string) =>
  `${title.trim().toLowerCase()}|${body.trim().toLowerCase()}`;

/**
 * One-shot alert (payments, publish, registration, etc.).
 * Dedupes identical copy and tags data so listeners never re-schedule it.
 */
export const scheduleAlertNotification = async (params: {
  title: string;
  body: string;
  subtitle?: string;
  data?: Record<string, unknown>;
  identifier?: string;
  sound?: boolean | string;
}): Promise<boolean> => {
  const title = params.title?.trim() ?? "";
  const body = params.body?.trim() ?? "";
  if (!title || !body) return false;

  const notifications = getExpoNotifications();
  if (!notifications) return false;

  const now = Date.now();
  pruneOld(recentAlerts, ALERT_DEDUPE_MS * 2, now);
  const fp = alertFingerprint(title, body);
  const last = recentAlerts.get(fp);
  if (last != null && now - last < ALERT_DEDUPE_MS) {
    return false;
  }
  recentAlerts.set(fp, now);

  await notifications.scheduleNotificationAsync({
    ...(params.identifier ? { identifier: params.identifier } : {}),
    content: {
      title,
      body,
      ...(params.subtitle ? { subtitle: params.subtitle } : {}),
      sound: params.sound ?? true,
      data: {
        ...(params.data as Record<string, string> | undefined),
        type: LOCAL_DELIVERY_TYPE,
        _local: "1",
      },
    },
    trigger: null,
  });
  return true;
};

/**
 * Sticky / live shade updates (same identifier replaces prior).
 * On iOS each schedule can still surface a banner — enforce a min interval.
 */
export const scheduleStickyLocalNotification = async (params: {
  identifier: string;
  title: string;
  body: string;
  subtitle?: string;
  data: Record<string, unknown>;
  sound?: boolean | string;
  color?: string;
  sticky?: boolean;
  autoDismiss?: boolean;
  androidChannelId?: string;
  androidPriority?: unknown;
  interruptionLevel?: "passive" | "active" | "timeSensitive" | "critical";
  /** Bypass iOS interval (e.g. race finished / new event set). */
  force?: boolean;
}): Promise<boolean> => {
  const notifications = getExpoNotifications();
  if (!notifications) return false;

  const now = Date.now();
  if (Platform.OS === "ios" && !params.force) {
    const last = stickyLastAt.get(params.identifier) ?? 0;
    if (now - last < IOS_STICKY_MIN_INTERVAL_MS) {
      return false;
    }
  }
  stickyLastAt.set(params.identifier, now);

  await notifications.scheduleNotificationAsync({
    identifier: params.identifier,
    content: {
      title: params.title,
      body: params.body,
      ...(params.subtitle ? { subtitle: params.subtitle } : {}),
      sound: params.sound ?? false,
      ...(params.color ? { color: params.color } : {}),
      sticky: params.sticky ?? true,
      autoDismiss: params.autoDismiss ?? false,
      data: {
        ...params.data,
        type: LOCAL_DELIVERY_TYPE,
        _local: "1",
      },
      ...(Platform.OS === "android" && params.androidChannelId
        ? {
            channelId: params.androidChannelId,
            ...(params.androidPriority != null
              ? { priority: params.androidPriority as never }
              : {}),
          }
        : {}),
      ...(Platform.OS === "ios"
        ? { interruptionLevel: params.interruptionLevel ?? ("passive" as const) }
        : {}),
    },
    trigger: null,
  });
  return true;
};

export const clearStickyScheduleThrottle = (identifier?: string) => {
  if (identifier) stickyLastAt.delete(identifier);
  else stickyLastAt.clear();
};

export const clearAlertDedupe = () => {
  recentAlerts.clear();
};

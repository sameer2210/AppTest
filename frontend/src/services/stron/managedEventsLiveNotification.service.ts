import { Platform } from "react-native";
import { getExpoNotifications } from "../../provider/expoNotificationsLazy";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import { StronManagedService } from "../stron/stronManaged.service";
import {
  clearStickyScheduleThrottle,
  scheduleStickyLocalNotification,
} from "@/services/notification/safeLocalNotification.service";

export const EVENTS_LIVE_NOTIFICATION_ID = "stron-events-live";
export const EVENTS_LIVE_CHANNEL_ID = "stron-events-live";

type ActivityRow = Awaited<ReturnType<typeof StronManagedService.getMyActivity>>[number];

let channelReady = false;
let lastPayloadKey: string | null = null;

const fmt = (n: number) => n.toLocaleString("en-US");

const isActiveEventStatus = (status?: string | null, participationStatus?: string | null) => {
  const s = status?.trim().toLowerCase() ?? "";
  const p = participationStatus?.trim().toLowerCase() ?? "";
  if (s === "live" || p === "active") return true;
  return false;
};

const formatChip = (row: ActivityRow) => {
  const raw = (row.format || row.tag || "LIVE").trim();
  return raw.slice(0, 12).toUpperCase();
};

const buildRow = (row: ActivityRow, todaySteps: number) => {
  const covered = Math.max(0, Math.round(row.coveredSteps ?? 0));
  const target = Math.max(0, Math.round(row.targetSteps ?? 0));
  const unit =
    (row.format || "").toLowerCase().includes("km") ||
    (row.progressLabel || "").toLowerCase().includes("km")
      ? "km"
      : "steps";

  const progressPercent =
    row.progressPercent != null && Number.isFinite(row.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(row.progressPercent)))
      : target > 0
        ? Math.max(0, Math.min(100, Math.round((covered / target) * 100)))
        : 0;

  const progressLabel =
    row.progressLabel?.trim() ||
    (target > 0 ? `${fmt(covered)} / ${fmt(target)} ${unit}` : `${Math.round(progressPercent)}%`);

  return {
    title: row.title || "Event",
    format: formatChip(row),
    progressLabel,
    progressPercent,
    covered,
    target,
    unit,
    lastLocalSteps: todaySteps,
    eventKey: row.eventKey || "",
  };
};

const ensureChannel = async () => {
  if (channelReady || Platform.OS !== "android") return;
  const notifications = getExpoNotifications();
  if (!notifications?.setNotificationChannelAsync) return;
  await notifications.setNotificationChannelAsync(EVENTS_LIVE_CHANNEL_ID, {
    name: "Active Events",
    description: "Live managed event progress",
    importance: notifications.AndroidImportance.DEFAULT,
    enableVibrate: false,
    showBadge: false,
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    sound: undefined,
  });
  channelReady = true;
};

const hasPermission = async (): Promise<boolean> => {
  const notifications = getExpoNotifications();
  if (!notifications) return false;
  try {
    const { status } = await notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
};

export const syncManagedEventsLiveNotification = async ({
  activity,
  todaySteps,
}: {
  activity?: ActivityRow[] | null;
  todaySteps: number;
}) => {
  let rowsSource = activity;
  if (rowsSource == null) {
    try {
      rowsSource = await StronManagedService.getMyActivity();
    } catch {
      rowsSource = [];
    }
  }

  const active = (rowsSource || [])
    .filter((item) => isActiveEventStatus(item.eventStatus, item.participationStatus))
    .slice(0, 4);

  if (active.length === 0) {
    await clearManagedEventsLiveNotification();
    return;
  }

  const rows = active.map((row) => buildRow(row, todaySteps));
  const payloadKey = JSON.stringify(rows);
  if (payloadKey === lastPayloadKey) return;
  lastPayloadKey = payloadKey;

  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    if (svc?.updateEventsLiveNotification) {
      await svc.updateEventsLiveNotification({ rows }).catch(() => undefined);
      return;
    }
  }

  if (!(await hasPermission())) return;
  await ensureChannel();

  const notifications = getExpoNotifications();
  const body =
    rows.length === 1
      ? `${rows[0].title} · ${rows[0].progressLabel}`
      : rows.map((r) => `${r.title}: ${r.progressLabel}`).join("\n");

  await scheduleStickyLocalNotification({
    identifier: EVENTS_LIVE_NOTIFICATION_ID,
    title: rows.length === 1 ? "Active Event" : `Active Events · ${rows.length}`,
    body,
    sound: false,
    color: "#086CFF",
    sticky: true,
    autoDismiss: false,
    data: { key: "events_live", deepLink: "stron://home" },
    androidChannelId: EVENTS_LIVE_CHANNEL_ID,
    androidPriority: notifications?.AndroidNotificationPriority?.DEFAULT,
    interruptionLevel: "passive",
  });
};

export const clearManagedEventsLiveNotification = async () => {
  lastPayloadKey = null;
  clearStickyScheduleThrottle(EVENTS_LIVE_NOTIFICATION_ID);
  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    if (svc?.clearEventsLiveNotification) {
      await svc.clearEventsLiveNotification().catch(() => undefined);
    }
  }
  const notifications = getExpoNotifications();
  if (!notifications) return;
  await notifications.dismissNotificationAsync(EVENTS_LIVE_NOTIFICATION_ID).catch(() => undefined);
};

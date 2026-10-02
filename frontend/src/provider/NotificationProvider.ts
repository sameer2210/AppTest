import { LOCAL_NOTIFICATION_ID, NOTIFICATION_KEYS } from "../utils/constants";
import { log } from "../config/devLogger";
import { getExpoNotifications } from "./expoNotificationsLazy";
import { scheduleAlertNotification } from "@/services/notification/safeLocalNotification.service";

const capitalizeFirstLetterOnly = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.substr(1) : "";

type NotificationPressDetail = {
  notification: { id: string; data: Record<string, unknown> };
};

/**
 * Schedule a one-shot local alert.
 * Never use this to re-display a notification that was just received —
 * that caused unbounded FCM → local → received loops across event publish,
 * payments, registration, and other sections.
 */
export const displayNotifications = async (payload: {
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
}) => {
  const title = capitalizeFirstLetterOnly(payload.notification?.title ?? "");
  const body = capitalizeFirstLetterOnly(payload.notification?.body ?? "");
  if (!title || !body) return;

  await scheduleAlertNotification({
    title,
    body,
    data: payload.data,
  });
};

export const createChannel = async () => {
  const Notifications = getExpoNotifications();
  if (!Notifications) return;

  if (Notifications.setNotificationChannelAsync) {
    await Notifications.setNotificationChannelAsync(LOCAL_NOTIFICATION_ID, {
      name: "Local Notifications",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [300, 500],
      sound: "default",
    });
  }
  // Do not request permission here — channel setup must stay silent.
};

// User tapped a notification while the app is in the foreground (Expo)
export const localNotificationHelper = (type: string, detail: NotificationPressDetail) => {
  log("localNotificationHelper", type, detail);
  if (type !== "press") {
    return;
  }
  const { notification } = detail;
  const data = (notification?.data || {}) as Record<string, unknown>;
  const key = data?.key as string | undefined;
  switch (key) {
    case NOTIFICATION_KEYS.SUBSCRIPTION:
      log("localNotificationHelper SUBSCRIPTION");
      break;
    default:
      break;
  }
};

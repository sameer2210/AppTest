import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { log, logError } from "@/config/devLogger";
import { createChannel } from "@/provider/NotificationProvider";
import { getExpoNotifications } from "@/provider/expoNotificationsLazy";
import { captureEvent } from "@/analytics/posthog/events";
import { apiClient } from "../core/apiClient.service";

const FCM_REGISTERED_KEY = "hasRegisteredFcmToken";

type NotificationPermissionSnapshot = {
  granted?: boolean;
  status?: string;
  canAskAgain?: boolean;
  ios?: { status?: string | number };
};

const IOS_AUTHORIZED_STATUSES = new Set([
  "authorized",
  "provisional",
  "ephemeral",
  2,
  3,
  4,
  "2",
  "3",
  "4",
]);

const isGrantedPermission = (settings: NotificationPermissionSnapshot | null | undefined): boolean => {
  if (!settings) return false;
  if (settings.granted === true) return true;
  if (
    settings.status === "granted" ||
    settings.status === "provisional" ||
    settings.status === "ephemeral"
  ) {
    return true;
  }
  return IOS_AUTHORIZED_STATUSES.has(settings.ios?.status as string | number);
};

/** Live OS status — do not cache; Google/Apple can revoke at any time. */
export const hasPushNotificationPermission = async (): Promise<boolean> => {
  const notifications = getExpoNotifications();
  if (!notifications) return true;
  try {
    const settings = await notifications.getPermissionsAsync();
    return isGrantedPermission(settings);
  } catch {
    return true;
  }
};

/** Shows the OS notification dialog. Never auto-opens app Settings. */
export const requestPushNotificationPermission = async (): Promise<boolean> => {
  const notifications = getExpoNotifications();
  if (!notifications) return Platform.OS !== "ios";

  try {
    if (Platform.OS === "android") {
      await createChannel();
    }

    const existing = await notifications.getPermissionsAsync();
    if (isGrantedPermission(existing)) return true;

    const requested = await notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
    captureEvent("permission_result", {
      type: "notification",
      result: isGrantedPermission(requested) ? "granted" : "denied",
    });
    return isGrantedPermission(requested);
  } catch (error) {
    logError("[PushNotifications] Permission request failed", error);
    return false;
  }
};

export const registerFcmTokenToServer = async (uid: string, token: string): Promise<void> => {
  await apiClient.post("/api/notifications/register-token", { uid, token });
};

const registerDeviceToken = async (uid: string): Promise<void> => {
  const notifications = getExpoNotifications();
  if (!notifications) return;

  const tokenResponse = await notifications.getDevicePushTokenAsync();
  const token = tokenResponse.data?.trim();
  if (!token) return;

  try {
    await registerFcmTokenToServer(uid, token);
    await AsyncStorage.setItem(FCM_REGISTERED_KEY, "true");
    void import("../payment/revenueCat.service").then(({ RevenueCatService }) =>
      RevenueCatService.setDevicePushToken(token),
    );
    log("[PushNotifications] Token registered");
  } catch (error) {
    logError("registerDeviceToken error:", error);
  }
};

/**
 * Soft init after auth — registers FCM only when notification permission is
 * already granted. Does not show the system dialog; AppPermissionFlowModal
 * requests after the user taps Enable Notification.
 */
export const initializePushNotifications = async (uid: string): Promise<void> => {
  if (!uid.trim() || !Device.isDevice) return;

  const notifications = getExpoNotifications();
  if (!notifications) return;

  try {
    if (Platform.OS === "android") {
      await createChannel();
    }

    if (!(await hasPushNotificationPermission())) {
      await AsyncStorage.removeItem(FCM_REGISTERED_KEY);
      return;
    }

    const hasRegistered = (await AsyncStorage.getItem(FCM_REGISTERED_KEY)) === "true";
    if (hasRegistered) return;

    await registerDeviceToken(uid);
  } catch (error) {
    logError("[PushNotifications] initialize failed", error);
  }
};

export const clearPushRegistrationFlag = async (): Promise<void> => {
  await AsyncStorage.removeItem(FCM_REGISTERED_KEY);
};

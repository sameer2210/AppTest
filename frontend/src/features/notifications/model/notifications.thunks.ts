import { createAsyncThunk } from "@reduxjs/toolkit";
import { log } from "@/config/devLogger";
import { NotificationsApi } from "../api/notifications.api";
import { getAppStore } from "@/store/getAppStore";

export const registerFcmToken = createAsyncThunk<void, string>(
  "notifications/registerFcmToken",
  async (token) => {
    const uid = getAppStore().getState().auth.user?.uid;
    if (!uid) return;

    try {
      await NotificationsApi.registerFcmToken(uid, token);
    } catch (error) {
      log("registerFcmToken error:", error);
    }
  },
);

export const fetchUnreadNotificationCount = createAsyncThunk<number, void>(
  "notifications/fetchUnreadCount",
  async () => {
    return NotificationsApi.inbox.unreadCount();
  },
);

export const fetchInboxNotificationsThunk = createAsyncThunk(
  "notifications/fetchInboxNotifications",
  async () => {
    const { notifications } = await NotificationsApi.inbox.list();
    return notifications;
  },
);

export const markAllInboxNotificationsReadThunk = createAsyncThunk(
  "notifications/markAllRead",
  async () => {
    await NotificationsApi.inbox.markAllRead();
  },
);

export const dismissInboxNotificationThunk = createAsyncThunk<string, string>(
  "notifications/dismiss",
  async (id: string) => {
    await NotificationsApi.inbox.dismiss(id);
    return id;
  },
);


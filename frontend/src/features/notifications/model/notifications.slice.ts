import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  registerFcmToken,
  fetchUnreadNotificationCount,
  fetchInboxNotificationsThunk,
  markAllInboxNotificationsReadThunk,
  dismissInboxNotificationThunk,
} from "./notifications.thunks";
import type { InboxNotification } from "../api/notifications.api";

export interface NotificationsState {
  unreadCount: number;
  notifications: InboxNotification[];
  fcmToken: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  unreadCount: 0,
  notifications: [],
  fcmToken: null,
  loading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
    setNotifications(state, action: PayloadAction<InboxNotification[]>) {
      state.notifications = action.payload;
    },
    decrementUnreadCount(state) {
      if (state.unreadCount > 0) {
        state.unreadCount -= 1;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerFcmToken.fulfilled, (state, action) => {
        state.fcmToken = action.meta.arg;
      })
      .addCase(fetchUnreadNotificationCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(fetchInboxNotificationsThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInboxNotificationsThunk.fulfilled, (state, action) => {
        state.notifications = action.payload;
        state.loading = false;
      })
      .addCase(fetchInboxNotificationsThunk.rejected, (state) => {
        state.loading = false;
      })
      .addCase(markAllInboxNotificationsReadThunk.fulfilled, (state) => {
        state.unreadCount = 0;
      })
      .addCase(dismissInboxNotificationThunk.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter((n) => n.id !== action.payload);
      });
  },
});

export const { setUnreadCount, setNotifications, decrementUnreadCount } =
  notificationsSlice.actions;

export default notificationsSlice.reducer;

export const selectUnreadNotificationCount = (state: { notifications: NotificationsState }) =>
  state.notifications.unreadCount;
export const selectNotificationsList = (state: { notifications: NotificationsState }) =>
  state.notifications.notifications;

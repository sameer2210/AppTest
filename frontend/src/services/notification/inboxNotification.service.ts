import { isAxiosError } from "axios";
import { apiClient } from "../core/apiClient.service";
import { getExpoNotifications } from "../../provider/expoNotificationsLazy";

export type OpinionResultOption = {
  optionId: string;
  text: string;
  percentage: number;
  voteWeight?: number;
};

export type OpinionResultData = {
  kind: "opinion_result";
  questionId: string;
  questionNumber: number | string;
  questionText: string;
  cycleId?: number;
  winningOptionId?: string | null;
  options: OpinionResultOption[];
};

export type InboxNotification = {
  id: string;
  tag: string;
  title: string;
  body: string;
  eventKey?: string | null;
  data?: OpinionResultData | Record<string, unknown> | null;
  readAt?: string | null;
  createdAt?: string;
};

const toApiError = (error: unknown): Error => {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    return new Error(data?.message || data?.error || error.message || "Request failed.");
  }
  if (error instanceof Error) return error;
  return new Error("Something went wrong.");
};

export const syncAppBadgeCount = async (count?: number): Promise<void> => {
  try {
    const notifications = getExpoNotifications();
    if (!notifications?.setBadgeCountAsync) return;
    const finalCount = count !== undefined ? count : await InboxNotificationService.unreadCount();
    await notifications.setBadgeCountAsync(Math.max(0, finalCount));
  } catch {
    // Non-blocking badge sync error
  }
};

let cachedUnreadCount: number | null = null;
let lastUnreadFetchTime = 0;
let inFlightUnreadPromise: Promise<number> | null = null;
const CACHE_TTL_MS = 3000;

export const InboxNotificationService = {
  async list(): Promise<{ notifications: InboxNotification[]; unreadCount: number }> {
    try {
      const { data } = await apiClient.get<{
        success: boolean;
        notifications: InboxNotification[];
        unreadCount: number;
      }>("/api/notifications");
      if (!data?.success) {
        cachedUnreadCount = 0;
        lastUnreadFetchTime = Date.now();
        void syncAppBadgeCount(0);
        return { notifications: [], unreadCount: 0 };
      }
      const unreadCount = data.unreadCount || 0;
      cachedUnreadCount = unreadCount;
      lastUnreadFetchTime = Date.now();
      void syncAppBadgeCount(unreadCount);
      return {
        notifications: data.notifications || [],
        unreadCount,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Authentication required")) {
        cachedUnreadCount = 0;
        lastUnreadFetchTime = Date.now();
        void syncAppBadgeCount(0);
        return { notifications: [], unreadCount: 0 };
      }
      throw toApiError(error);
    }
  },

  async unreadCount(force = false): Promise<number> {
    const now = Date.now();
    if (!force && cachedUnreadCount !== null && now - lastUnreadFetchTime < CACHE_TTL_MS) {
      return cachedUnreadCount;
    }
    if (inFlightUnreadPromise) {
      return inFlightUnreadPromise;
    }

    inFlightUnreadPromise = (async () => {
      try {
        const { data } = await apiClient.get<{ success: boolean; unreadCount: number }>(
          "/api/notifications/unread-count",
        );
        const count = data?.unreadCount || 0;
        cachedUnreadCount = count;
        lastUnreadFetchTime = Date.now();
        void syncAppBadgeCount(count);
        return count;
      } catch {
        return cachedUnreadCount ?? 0;
      } finally {
        inFlightUnreadPromise = null;
      }
    })();

    return inFlightUnreadPromise;
  },

  async markRead(id: string): Promise<void> {
    try {
      await apiClient.post(`/api/notifications/${encodeURIComponent(id)}/read`);
      cachedUnreadCount = Math.max(0, (cachedUnreadCount ?? 1) - 1);
      lastUnreadFetchTime = Date.now();
      void syncAppBadgeCount(cachedUnreadCount);
      void this.unreadCount(true);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async markAllRead(): Promise<void> {
    try {
      await apiClient.post("/api/notifications/read-all");
      cachedUnreadCount = 0;
      lastUnreadFetchTime = Date.now();
      void syncAppBadgeCount(0);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async dismiss(id: string): Promise<void> {
    try {
      await apiClient.delete(`/api/notifications/${encodeURIComponent(id)}`);
      cachedUnreadCount = null;
      void this.unreadCount(true);
    } catch (error) {
      throw toApiError(error);
    }
  },
};

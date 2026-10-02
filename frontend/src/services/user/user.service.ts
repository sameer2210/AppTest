import { apiClient } from "../core/apiClient.service";
import { AuthService } from "../auth/auth.service";
import { StronUser, stronUserFromJson } from "@/models/user";
import type { ActivityHistoryItem } from "@/models/activity";

/**
 * Optional metadata attached to step sync requests.
 * Enables server-side timezone-aware bucketing, clock-drift detection,
 * and idempotent deduplication.
 */
export type StepSyncMetadata = {
  /** User's local calendar date (YYYY-MM-DD) — determines "today". */
  localDate?: string;
  /** ISO-8601 UTC timestamp of the sync moment. */
  utcTimestamp?: string;
  /** IANA timezone string (e.g. "Asia/Kolkata"). */
  timezone?: string;
  /** Client-generated UUID for deduplication. */
  syncId?: string;
  /** Origin of this sync event. */
  source?: string;
};

export const UserService = {
  async getUserProfile(uid: string): Promise<StronUser | null> {
    try {
      const { data } = await apiClient.get<Record<string, unknown>>(`/api/user/profile/${uid}`);
      return stronUserFromJson(data) || null;
    } catch {
      return null;
    }
  },

  /**
   * `meta` is purely diagnostic — echoed back into the backend's STEP_TRACE logs
   * (clientLocalDate/clientTimezone/clientSource) so server-side corruption can be
   * correlated with the exact device/moment that produced a bad reading.
   */
  async syncSteps(uid: string, todaysStepCount: number, meta?: StepSyncMetadata) {
    await apiClient.post("/api/user/sync-steps", { uid, todaysStepCount, ...meta });
  },

  async syncPastSteps(uid: string, date: string, steps: number, meta?: StepSyncMetadata) {
    await apiClient.post("/api/user/sync-past-steps", {
      uid,
      date,
      steps,
      ...(meta?.timezone && { timezone: meta.timezone }),
      ...(meta?.utcTimestamp && { utcTimestamp: meta.utcTimestamp }),
      ...(meta?.source && { source: meta.source }),
    });
  },

  async getRewards(userId: string) {
    const { data } = await apiClient.get<Record<string, unknown>>(`/api/user/rewards/${userId}`);
    return data;
  },

  async getActivityStats(userId: string) {
    const { data } = await apiClient.get<Record<string, unknown>>(
      `/api/user/activity/stats/${userId}`,
    );
    return data;
  },

  async getActivityHistory(userId: string) {
    const { data } = await apiClient.get<ActivityHistoryItem[]>(`/api/user/activity/${userId}`);
    return data ?? [];
  },

  async updateProfile(user: StronUser) {
    return AuthService.updateUserProfile(user);
  },

  async deleteAccount(userId: string) {
    await apiClient.delete(`/api/user/account/${userId}`);
  },
};

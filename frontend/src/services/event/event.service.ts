import { apiClient } from "../core/apiClient.service";
import {
  parseEventCatalogItem,
  parseEventEnrollment,
  type EventCatalogItem,
  type EventEnrollment,
} from "@/models/event";

/**
 * Platform event catalog / enroll / rewards (`/api/events`).
 * STRON managed create/enroll flows use StronManagedService (`/api/stron`).
 */
export const EventService = {
  async getCatalog(uid?: string): Promise<EventCatalogItem[]> {
    const response = await this.getCatalogResponse(uid);
    return response.events;
  },

  async getCatalogResponse(uid?: string): Promise<{
    events: EventCatalogItem[];
    userCanEnroll: boolean;
    warriorPassActive: boolean;
  }> {
    const { data } = await apiClient.get<Record<string, unknown>>("/api/events/catalog", {
      params: uid ? { uid } : undefined,
    });
    const user =
      data.user && typeof data.user === "object"
        ? (data.user as Record<string, unknown>)
        : undefined;

    return {
      events: ((data.events as Record<string, unknown>[] | undefined) ?? []).map((e) =>
        parseEventCatalogItem(e),
      ),
      userCanEnroll: data.userCanEnroll === true || user?.canEnroll === true,
      warriorPassActive: false,
    };
  },

  async getMyEvents(uid: string): Promise<EventEnrollment[]> {
    const { data } = await apiClient.get<{ enrollments?: Record<string, unknown>[] }>(
      `/api/events/my/${uid}`,
    );
    return (data.enrollments ?? []).map((e) => parseEventEnrollment(e));
  },

  async enroll(payload: {
    uid: string;
    eventKey: string;
    planId?: string;
    forceFree?: boolean;
    couponCode?: string;
    currentStepCount?: number;
  }): Promise<EventEnrollment> {
    const { data } = await apiClient.post<{ enrollment: Record<string, unknown> }>(
      "/api/events/enroll",
      payload,
    );
    return parseEventEnrollment(data.enrollment);
  },

  async getLeaderboard(eventKey: string, uid: string, planId?: string) {
    const { data } = await apiClient.get<Record<string, unknown>>(
      `/api/events/leaderboard/${eventKey}`,
      {
        params: { uid, planId },
      },
    );
    return data;
  },

  async syncMarathonProgress(uid: string, stepCount: number) {
    const { data } = await apiClient.post("/api/events/marathon/progress", {
      uid,
      eventKey: "marathon",
      stepCount,
    });
    return data;
  },

  async claimReward(uid: string, eventKey: string) {
    const { data } = await apiClient.post<{ reward?: Record<string, unknown> }>(
      "/api/events/claim-reward",
      {
        uid,
        eventKey,
      },
    );
    return data.reward;
  },

  async checkIsAdmin(uid: string): Promise<boolean> {
    const { data } = await apiClient.get<{ isAdmin?: boolean }>(`/api/user/is-admin/${uid}`);
    return data.isAdmin === true;
  },

  async redeemCoupon(payload: {
    uid: string;
    eventKey: string;
    couponCode: string;
    planId?: string;
    currentStepCount?: number;
  }) {
    const { data } = await apiClient.post<{
      enrollment?: Record<string, unknown>;
      message?: string;
    }>("/api/events/enroll", payload);
    return data;
  },

  async completeMarathon(uid: string, eventKey: string, stepCount: number) {
    const { data } = await apiClient.post<{ enrollment?: Record<string, unknown> }>(
      "/api/events/marathon/complete",
      { uid, eventKey, stepCount },
    );
    return data;
  },
};

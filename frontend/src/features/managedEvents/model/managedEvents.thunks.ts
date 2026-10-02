import { createAsyncThunk } from "@reduxjs/toolkit";
import { ManagedEventsApi } from "../api/managedEvents.api";
import type {
  CreateMarathonPayload,
  CreateStepChallengePayload,
  CreateDuelPayload,
} from "@/models/stronManaged/event";

/* ── Catalog / Feed ─────────────────────────────────────────────────────── */

export const fetchManagedEventsCatalog = createAsyncThunk(
  "managedEvents/fetchCatalog",
  async (format?: string) => ManagedEventsApi.getCatalog(format),
);

export const fetchMyActivity = createAsyncThunk(
  "managedEvents/fetchMyActivity",
  async () => ManagedEventsApi.getMyActivity(),
);

export const fetchRewardPreviews = createAsyncThunk(
  "managedEvents/fetchRewardPreviews",
  async () => ManagedEventsApi.getRewardPreviews(),
);

/* ── Event CRUD ─────────────────────────────────────────────────────────── */

export const fetchEvent = createAsyncThunk(
  "managedEvents/fetchEvent",
  async (key: string) => ManagedEventsApi.getEvent(key),
);

export const fetchEventDashboard = createAsyncThunk(
  "managedEvents/fetchEventDashboard",
  async (key: string) => ManagedEventsApi.getEventDashboard(key),
);

export const createMarathonEvent = createAsyncThunk(
  "managedEvents/createMarathon",
  async (payload: CreateMarathonPayload) => ManagedEventsApi.createMarathon(payload),
);

export const createStepChallengeEvent = createAsyncThunk(
  "managedEvents/createStepChallenge",
  async (payload: CreateStepChallengePayload) =>
    ManagedEventsApi.createStepChallenge(payload),
);

export const createKingOfTheHillEvent = createAsyncThunk(
  "managedEvents/createKingOfTheHill",
  async (payload: CreateDuelPayload) => ManagedEventsApi.createKingOfTheHill(payload),
);

export const createFaceOffEvent = createAsyncThunk(
  "managedEvents/createFaceOff",
  async (payload: CreateDuelPayload) => ManagedEventsApi.createFaceOff(payload),
);

export const publishManagedEvent = createAsyncThunk(
  "managedEvents/publishEvent",
  async (key: string) => ManagedEventsApi.publishEvent(key),
);

export const cancelManagedEvent = createAsyncThunk(
  "managedEvents/cancelEvent",
  async (arg: string | { key: string; reason?: string }) => {
    const key = typeof arg === "string" ? arg : arg.key;
    const reason = typeof arg === "string" ? undefined : arg.reason;
    return ManagedEventsApi.cancelEvent(key, reason);
  },
);

export const deleteManagedEvent = createAsyncThunk(
  "managedEvents/deleteEvent",
  async (key: string) => ManagedEventsApi.deleteEvent(key),
);

export const updateManagedEvent = createAsyncThunk(
  "managedEvents/updateEvent",
  async ({ key, payload }: { key: string; payload: Record<string, unknown> }) =>
    ManagedEventsApi.updateEvent(key, payload),
);

/* ── Organizer ──────────────────────────────────────────────────────────── */

export const fetchMyOrganizer = createAsyncThunk(
  "managedEvents/fetchMyOrganizer",
  async () => ManagedEventsApi.getMyOrganizer(),
);

export const upsertOrganizer = createAsyncThunk(
  "managedEvents/upsertOrganizer",
  async (payload: {
    fullName: string;
    organizationName?: string;
    website?: string;
    instagram?: string;
    accountType?: "individual" | "team";
    mobileNumber?: string;
  }) => ManagedEventsApi.upsertOrganizer(payload),
);

export const fetchMyOrganizerEvents = createAsyncThunk(
  "managedEvents/fetchMyOrganizerEvents",
  async () => ManagedEventsApi.getMyOrganizerEvents(),
);

/* ── Participation ──────────────────────────────────────────────────────── */

export const fetchMyParticipation = createAsyncThunk(
  "managedEvents/fetchMyParticipation",
  async (key: string) => ManagedEventsApi.getMyParticipation(key),
);

export const fetchMyParticipantInfoPrefill = createAsyncThunk(
  "managedEvents/fetchMyParticipantInfoPrefill",
  async () => ManagedEventsApi.getMyParticipantInfoPrefill(),
);

export const fetchProgress = createAsyncThunk(
  "managedEvents/fetchProgress",
  async (key: string) => ManagedEventsApi.getProgress(key),
);

export const fetchLeaderboard = createAsyncThunk(
  "managedEvents/fetchLeaderboard",
  async (key: string) => ManagedEventsApi.getLeaderboard(key),
);

export const fetchMatches = createAsyncThunk(
  "managedEvents/fetchMatches",
  async ({ key, myUid }: { key: string; myUid?: string | null }) =>
    ManagedEventsApi.getMatches(key, myUid),
);

export const validateRegistrationCouponThunk = createAsyncThunk(
  "managedEvents/validateRegistrationCoupon",
  async ({
    eventKey,
    ticketTypeId,
    code,
  }: {
    eventKey: string;
    ticketTypeId: string;
    code: string;
  }) => ManagedEventsApi.validateRegistrationCoupon(eventKey, ticketTypeId, code),
);

/* ── Settlement ─────────────────────────────────────────────────────────── */

export const fetchSettlement = createAsyncThunk(
  "managedEvents/fetchSettlement",
  async (eventKey: string) => ManagedEventsApi.getSettlement(eventKey),
);

export const initSettlement = createAsyncThunk(
  "managedEvents/initSettlement",
  async (eventKey: string) => ManagedEventsApi.initSettlement(eventKey),
);

export const releaseSettlement = createAsyncThunk(
  "managedEvents/releaseSettlement",
  async ({ eventKey, reference }: { eventKey: string; reference?: string }) =>
    ManagedEventsApi.releaseSettlement(eventKey, reference),
);

/* ── Rewards ────────────────────────────────────────────────────────────── */

export const fetchMyRewards = createAsyncThunk(
  "managedEvents/fetchMyRewards",
  async () => ManagedEventsApi.getMyRewards(),
);

export const fetchRewardPreviewsList = createAsyncThunk(
  "managedEvents/fetchRewardPreviewsList",
  async () => ManagedEventsApi.getRewardPreviews(),
);

/* ── Live Notification ─────────────────────────────────────────────────── */

export const syncManagedEventsLiveNotificationThunk = createAsyncThunk(
  "managedEvents/syncLiveNotification",
  async (
    payload: Parameters<
      typeof ManagedEventsApi.liveNotification.syncManagedEventsLiveNotification
    >[0],
  ) => {
    return ManagedEventsApi.liveNotification.syncManagedEventsLiveNotification(payload);
  },
);

export const clearManagedEventsLiveNotificationThunk = createAsyncThunk(
  "managedEvents/clearLiveNotification",
  async () => {
    return ManagedEventsApi.liveNotification.clearManagedEventsLiveNotification();
  },
);


import { createAsyncThunk } from "@reduxjs/toolkit";
import { StepRaceApi } from "../api/stepRace.api";

export const fetchActiveStepRace = createAsyncThunk(
  "stepRace/fetchActiveRace",
  async (uid: string) => StepRaceApi.getActiveRace(uid),
);

export const fetchStepRaceStats = createAsyncThunk(
  "stepRace/fetchStats",
  async (uid: string) => StepRaceApi.getStepRaceStats(uid),
);

export const searchStepRaceOpponents = createAsyncThunk(
  "stepRace/searchOpponents",
  async (query: string) => StepRaceApi.searchOpponents(query),
);

export const syncActiveRace = createAsyncThunk(
  "stepRace/syncActiveRace",
  async ({ uid, steps }: { uid: string; steps: number }) => {
    return StepRaceApi.sync.syncActiveRaceForUser(uid, steps);
  },
);

export const clearActiveRaceSync = createAsyncThunk(
  "stepRace/clearActiveRaceSync",
  async () => {
    StepRaceApi.sync.clearActiveRaceSyncCache();
  },
);

export const syncStepRaceLiveNotificationThunk = createAsyncThunk(
  "stepRace/syncLiveNotification",
  async (payload: Parameters<typeof StepRaceApi.liveNotification.syncStepRaceLiveNotification>[0]) => {
    return StepRaceApi.liveNotification.syncStepRaceLiveNotification(payload);
  },
);

export const clearStepRaceLiveNotificationThunk = createAsyncThunk(
  "stepRace/clearLiveNotification",
  async () => {
    return StepRaceApi.liveNotification.clearStepRaceLiveNotification();
  },
);

export const getUserWinsCountThunk = createAsyncThunk(
  "stepRace/getUserWinsCount",
  async () => StepRaceApi.getUserWinsCount(),
);

export const incrementUserWinsCountThunk = createAsyncThunk(
  "stepRace/incrementUserWinsCount",
  async () => StepRaceApi.incrementUserWinsCount(),
);

export const getRandomShadowOpponentsThunk = createAsyncThunk(
  "stepRace/getRandomShadowOpponents",
  async (count?: number) => StepRaceApi.getRandomShadowOpponents(count),
);

export const createStepRaceThunk = createAsyncThunk(
  "stepRace/createStepRace",
  async (req: Parameters<typeof StepRaceApi.createStepRace>[0]) => StepRaceApi.createStepRace(req),
);

export const completeStepRaceThunk = createAsyncThunk(
  "stepRace/completeStepRace",
  async (payload: { raceId: string; finalSteps?: number; finalSeconds?: number }) =>
    StepRaceApi.completeRace(payload.raceId, payload.finalSteps, payload.finalSeconds),
);

export const getMatchHistoryThunk = createAsyncThunk(
  "stepRace/getMatchHistory",
  async (uid: string) => StepRaceApi.getMatchHistory(uid),
);

export const saveMatchHistoryThunk = createAsyncThunk(
  "stepRace/saveMatchHistory",
  async (race: Parameters<typeof StepRaceApi.saveMatchHistory>[0]) =>
    StepRaceApi.saveMatchHistory(race),
);

export const getRivalryHistoryThunk = createAsyncThunk(
  "stepRace/getRivalryHistory",
  async (opponentUid: string) => StepRaceApi.getRivalryHistory(opponentUid),
);

export const syncActiveRaceIfNeededThunk = createAsyncThunk(
  "stepRace/syncActiveRaceIfNeeded",
  async (payload: Parameters<typeof StepRaceApi.sync.syncActiveRaceIfNeeded>[0]) =>
    StepRaceApi.sync.syncActiveRaceIfNeeded(payload),
);

export const markRaceCompletedThunk = createAsyncThunk(
  "stepRace/markRaceCompleted",
  async (raceId: string) => StepRaceApi.sync.markRaceCompleted(raceId),
);

export const generateAndShareResultPdfCardThunk = createAsyncThunk(
  "stepRace/generateAndShareResultPdfCard",
  async (payload: Parameters<typeof StepRaceApi.shareCard.generateAndShareResultPdfCard>[0]) =>
    StepRaceApi.shareCard.generateAndShareResultPdfCard(payload),
);

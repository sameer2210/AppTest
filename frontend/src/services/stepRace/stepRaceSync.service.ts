/**
 * App-wide Step Race progress sync.
 * Screens may call this for immediate UI feedback; StepService / Bootstrap also
 * invoke it so progress continues when Ongoing-Step-Race is not mounted.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { StepRace } from "@/models/stepRace";
import { StepRaceService } from "./stepRace.service";
import { computeLiveStepRaceStatus, resolveRaceTargetSteps } from "./stepRace.live";
import {
  clearStepRaceLiveNotification,
  syncStepRaceLiveNotification,
} from "./stepRaceLiveNotification.service";

const RACE_START_STEPS_KEY = "stron_race_start_steps";

const persistStartSteps = (raceId: string, startSteps: number): void => {
  void AsyncStorage.setItem(RACE_START_STEPS_KEY, JSON.stringify({ raceId, startSteps })).catch(
    () => undefined,
  );
};

const loadPersistedStartSteps = async (raceId: string): Promise<number | null> => {
  try {
    const raw = await AsyncStorage.getItem(RACE_START_STEPS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { raceId?: string; startSteps?: number };
    if (parsed.raceId === raceId && parsed.startSteps && parsed.startSteps > 0) {
      return parsed.startSteps;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const clearPersistedStartSteps = (): void => {
  void AsyncStorage.removeItem(RACE_START_STEPS_KEY).catch(() => undefined);
};

export type RaceSyncResult = {
  userSteps: number | null;
  completedRace?: StepRace | null;
};

let lastSyncedKey: string | null = null;
let lastTimeSyncAt = 0;
let cachedActiveRace: StepRace | null = null;
let inFlight: Promise<RaceSyncResult> | null = null;
/** Race IDs that must not receive further /update calls. */
const stoppedRaceIds = new Set<string>();

const TIME_SYNC_INTERVAL_MS = 15_000;

const raceSyncKey = (raceId: string, userSteps: number) => `${raceId}:${userSteps}`;

/** Prefer server startSteps; only infer once when missing. */
export const resolveImmutableStartSteps = (race: StepRace, todaySteps: number): number => {
  if (race.startSteps !== undefined && race.startSteps > 0) {
    return race.startSteps;
  }
  return Math.max(0, todaySteps - (race.userSteps || 0));
};

export const ensureRaceStartSteps = (race: StepRace, todaySteps: number): StepRace => {
  if (race.startSteps !== undefined && race.startSteps > 0) {
    persistStartSteps(race.raceId, race.startSteps);
    return race;
  }
  const startSteps = resolveImmutableStartSteps(race, todaySteps);
  if (startSteps > 0) persistStartSteps(race.raceId, startSteps);
  return { ...race, startSteps };
};

const stopRaceSync = (raceId: string): void => {
  if (!raceId) return;
  stoppedRaceIds.add(raceId);
  if (cachedActiveRace?.raceId === raceId) {
    cachedActiveRace = null;
  }
  lastSyncedKey = `stopped:${raceId}`;
  lastTimeSyncAt = 0;
  clearPersistedStartSteps();
  void clearStepRaceLiveNotification();
};

/** Call when the race finishes normally (win/loss completion flow). */
export const markRaceCompleted = (raceId: string): void => {
  stopRaceSync(raceId);
};

/** Server rejected updates — race already ended or expired. */
const markRaceEnded = (raceId: string): void => {
  stopRaceSync(raceId);
};

export const isRaceSyncEnded = (raceId: string): boolean => stoppedRaceIds.has(raceId);

/**
 * Sync active race progress to backend (+ persist native state via notification helper).
 */
export const syncActiveRaceIfNeeded = async ({
  race,
  todaySteps,
  userTimeSeconds,
  userAvatarUrl,
  userUid,
}: {
  race: StepRace | null | undefined;
  todaySteps: number;
  userTimeSeconds?: number;
  userAvatarUrl?: string | null;
  userUid?: string | null;
}): Promise<RaceSyncResult> => {
  if (!race || race.status !== "active") {
    return { userSteps: null };
  }
  if (stoppedRaceIds.has(race.raceId)) {
    return { userSteps: null };
  }

  const withBaseline = ensureRaceStartSteps(race, todaySteps);
  cachedActiveRace = withBaseline;

  const live = computeLiveStepRaceStatus(withBaseline, todaySteps);
  if (live.userSteps <= 0) {
    // Notification service owns iOS/Android throttle — safe to call from 500ms timers.
    void syncStepRaceLiveNotification({
      race: withBaseline,
      todaySteps,
      userAvatarUrl,
      userUid,
    });
    return { userSteps: null };
  }

  const key = raceSyncKey(withBaseline.raceId, live.userSteps);
  const now = Date.now();
  const stepsChanged = key !== lastSyncedKey;
  const timeDue = now - lastTimeSyncAt >= TIME_SYNC_INTERVAL_MS;
  if (!stepsChanged && !timeDue) {
    return { userSteps: live.userSteps };
  }

  if (inFlight) {
    await inFlight;
    if (stoppedRaceIds.has(withBaseline.raceId)) {
      return { userSteps: null };
    }
    if (key === lastSyncedKey && now - lastTimeSyncAt < TIME_SYNC_INTERVAL_MS) {
      return { userSteps: live.userSteps };
    }
  }

  inFlight = (async (): Promise<RaceSyncResult> => {
    const elapsed = userTimeSeconds ?? live.elapsedSeconds;
    const result = await StepRaceService.updateRaceProgress({
      raceId: withBaseline.raceId,
      userSteps: live.userSteps,
      userTimeSeconds: elapsed,
    });
    if (result.status === "completed") {
      markRaceCompleted(withBaseline.raceId);
      return { userSteps: live.userSteps, completedRace: result.race };
    }
    if (result.status === "ok") {
      lastSyncedKey = key;
      lastTimeSyncAt = Date.now();
      cachedActiveRace = {
        ...withBaseline,
        userSteps: live.userSteps,
        userTimeSeconds: elapsed,
      };
      void syncStepRaceLiveNotification({
        race: cachedActiveRace,
        todaySteps,
        userAvatarUrl,
        userUid,
      });
      return { userSteps: live.userSteps };
    }
    if (result.status === "not_active") {
      markRaceEnded(withBaseline.raceId);
      return { userSteps: null };
    }
    void syncStepRaceLiveNotification({
      race: cachedActiveRace,
      todaySteps,
      userAvatarUrl,
      userUid,
    });
    return { userSteps: null };
  })();

  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
};

/** Fetch active race for uid and sync from today's step total. */
export const syncActiveRaceForUser = async (
  uid: string,
  todaySteps: number,
  userAvatarUrl?: string | null,
): Promise<number | null> => {
  if (!uid || todaySteps < 0) return null;
  try {
    let race = cachedActiveRace;
    if (
      !race ||
      race.status !== "active" ||
      race.userId !== uid ||
      stoppedRaceIds.has(race.raceId)
    ) {
      race = await StepRaceService.getActiveRace(uid);
    }
    if (!race || race.status !== "active" || stoppedRaceIds.has(race.raceId)) {
      cachedActiveRace = null;
      lastSyncedKey = null;
      return null;
    }
    // Restore persisted startSteps after app kill (in-memory cache is wiped)
    if (!race.startSteps || race.startSteps <= 0) {
      const persisted = await loadPersistedStartSteps(race.raceId);
      if (persisted) {
        race = { ...race, startSteps: persisted };
      }
    }
    const result = await syncActiveRaceIfNeeded({
      race,
      todaySteps,
      userAvatarUrl,
    });
    return result.userSteps;
  } catch {
    return null;
  }
};

/** Cache race after create so app-wide sync has immutable startSteps immediately. */
export const rememberActiveRace = (race: StepRace | null, todaySteps = 0): void => {
  if (!race || race.status !== "active") {
    cachedActiveRace = null;
    lastSyncedKey = null;
    return;
  }
  stoppedRaceIds.delete(race.raceId);
  cachedActiveRace = ensureRaceStartSteps(race, todaySteps);
  lastSyncedKey = null;
  lastTimeSyncAt = 0;
};

export const clearActiveRaceSyncCache = (): void => {
  cachedActiveRace = null;
  lastSyncedKey = null;
  lastTimeSyncAt = 0;
  stoppedRaceIds.clear();
  clearPersistedStartSteps();
};

export const getCachedActiveRace = (): StepRace | null => cachedActiveRace;

/** Expose target helper for callers that need it without importing live.ts. */
export const getRaceTargetSteps = resolveRaceTargetSteps;

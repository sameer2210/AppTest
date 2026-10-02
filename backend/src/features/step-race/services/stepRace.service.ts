import moment from "moment-timezone";
import StepRaceModel from "../models/stepRace.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import type {
  GetStepRaceStatsParams,
  SearchOpponentsParams,
  CreateStepRaceServiceParams,
  GetActiveRaceParams,
  UpdateRaceProgressServiceParams,
  CompleteRaceServiceParams,
  GetLeaderboardParams,
  GetRivalryHistoryParams,
  GetStepRaceHistoryParams,
} from "../types/index.js";

import {
  DEFAULT_PACE_SECONDS,
  MAX_SHADOW_PACE_SECONDS,
  PACE_DECAY_RATE,
  OPPONENT_AVATARS,
  LEGENDARY_ATHLETES,
} from "../../../constants/index.js";

export {
  DEFAULT_PACE_SECONDS,
  MAX_SHADOW_PACE_SECONDS,
  PACE_DECAY_RATE,
  OPPONENT_AVATARS,
  LEGENDARY_ATHLETES,
};


/** Calendar day key in user timezone (YYYY-MM-DD). */
export const calendarDayKey = (date: Date | string | number = new Date(), timezone = "Asia/Kolkata"): string => {
  return moment.tz(date, timezone || "Asia/Kolkata").format("YYYY-MM-DD");
};

/** Projected seconds to complete targetSteps at the race sample rate. */
export const projectedPaceSeconds = (
  timeSeconds: unknown,
  steps: unknown,
  targetSteps = 1000,
): number | null => {
  const t = Math.max(0, Math.floor(Number(timeSeconds) || 0));
  const s = Math.max(0, Math.floor(Number(steps) || 0));
  const target = Math.max(1, Math.floor(Number(targetSteps) || 1000));
  if (s < 10 || t <= 0) return null;
  return Math.round((t / s) * target);
};

/**
 * Shadow pace gets 10% slower per complete calendar day without a step race.
 * missedDays = floor(today - lastStepRaceDate); 0 if raced today or no date.
 */
export const calculateDecayedPace = (
  basePaceSeconds: unknown,
  lastStepRaceDate: unknown,
  timezone = "Asia/Kolkata",
  decayRate = PACE_DECAY_RATE,
): number => {
  const base = Math.max(
    1,
    Math.floor(Number(basePaceSeconds) || DEFAULT_PACE_SECONDS),
  );
  if (!lastStepRaceDate) return Math.min(MAX_SHADOW_PACE_SECONDS, base);

  const tz = timezone || "Asia/Kolkata";
  const today = moment.tz(tz).startOf("day");
  const last = moment.tz(String(lastStepRaceDate), "YYYY-MM-DD", tz).startOf("day");
  if (!last.isValid()) return Math.min(MAX_SHADOW_PACE_SECONDS, base);

  const missedCompleteDays = Math.max(0, today.diff(last, "days"));
  if (missedCompleteDays <= 0) return Math.min(MAX_SHADOW_PACE_SECONDS, base);

  const decayed = Math.round(base * Math.pow(1 + decayRate, missedCompleteDays));
  return Math.min(MAX_SHADOW_PACE_SECONDS, Math.max(base, decayed));
};

/**
 * Persist latest race pace on the user (not lifetime-best-only).
 * Call on win or loss when we have a valid sample.
 */
export const persistLatestRacePace = async (
  userId: string,
  timeSeconds: unknown,
  steps: unknown,
  targetSteps = 1000,
): Promise<number | null> => {
  const pace = projectedPaceSeconds(timeSeconds, steps, targetSteps);
  if (pace == null) return null;

  const user = await UserModel.findOne({ uid: userId });
  if (!user) return null;

  const tz = user.timezone || "Asia/Kolkata";
  user.bestPaceSeconds = pace;
  user.lastStepRaceDate = calendarDayKey(new Date(), tz);
  await user.save();
  return pace;
};

/**
 * Resolve current shadow pace for a user document:
 * backfill from latest race if lastStepRaceDate missing, then apply miss-day decay.
 * Returns { paceSeconds, persisted }.
 */
export const resolveUserShadowPace = async (
  user: ServiceParams | null | undefined,
  completedRacesNewestFirst: ServiceParams[] | null = null,
): Promise<{ paceSeconds: number; persisted: boolean }> => {
  if (!user) {
    return { paceSeconds: DEFAULT_PACE_SECONDS, persisted: false };
  }

  const tz = user.timezone || "Asia/Kolkata";
  let basePace = user.bestPaceSeconds || DEFAULT_PACE_SECONDS;
  let lastRaceDay = user.lastStepRaceDate || null;
  let needsSave = false;

  // One-time backfill when we have race history but no lastStepRaceDate
  if (!lastRaceDay) {
    let races: ServiceParams[] | null = completedRacesNewestFirst;
    if (!races) {
      races = (await StepRaceModel.find({ userId: user.uid, status: "completed" })
        .sort({ endTime: -1, createdAt: -1 })
        .limit(20)
        .lean()) as ServiceParams[];
    }

    for (const r of races || []) {
      const target = r.targetSteps || 1000;
      const pace = projectedPaceSeconds(r.userTimeSeconds, r.userSteps, target);
      if (pace == null) continue;
      const raceAt = r.endTime || r.createdAt || r.updatedAt;
      if (!raceAt) continue;
      basePace = pace;
      lastRaceDay = calendarDayKey(new Date(raceAt), tz);
      user.bestPaceSeconds = basePace;
      user.lastStepRaceDate = lastRaceDay;
      needsSave = true;
      break;
    }
  }

  const paceSeconds = calculateDecayedPace(basePace, lastRaceDay, tz);

  if (needsSave && typeof user.save === "function") {
    await user.save();
  }

  return { paceSeconds, persisted: needsSave };
};

// Helper function to calculate decayed steps
export const calculateDecayedSteps = (
  originalSteps: unknown,
  lastActiveDate: unknown,
  decayRate = 0.10,
): number => {
  const steps = Math.floor(Number(originalSteps) || 0);
  if (!steps) return 0;
  if (!lastActiveDate) return steps;

  const now = new Date();
  const lastActive = new Date(lastActiveDate as string | number | Date);
  const daysInactive = Math.floor(
    (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysInactive <= 0) return steps;

  return Math.round(steps * Math.pow(1 - decayRate, daysInactive));
};

/** Decayed shadow pace from a user lean/doc for opponent cards. */
export const shadowPaceForUser = (user: ServiceParams | null | undefined): number => {
  if (!user) return DEFAULT_PACE_SECONDS;
  const tz = user.timezone || "Asia/Kolkata";
  return calculateDecayedPace(
    user.bestPaceSeconds || DEFAULT_PACE_SECONDS,
    user.lastStepRaceDate || null,
    tz,
  );
};

export const countShadowRacesAway = async (
  userId: string | null | undefined,
  lastManualRaceTime: Date | string | null | undefined,
): Promise<number> => {
  if (!userId) return 0;
  const query: MongoFilter = {
    status: "completed",
    $or: [{ "opponent.uid": userId }, { "opponent.shadowData.uid": userId }],
    "opponent.type": "shadow",
    userId: { $ne: userId },
  };
  if (lastManualRaceTime) {
    query.createdAt = { $gt: new Date(lastManualRaceTime) };
  }
  return StepRaceModel.countDocuments(query);
};

export const getStepRaceStatsService = async ({
  userId,
  requesterUid,
}: GetStepRaceStatsParams): Promise<ServiceParams> => {
  if (!userId) {
    throw codedError("bad_request", "User ID is required");
  }

  const finalUserId = userId === "current_user" && requesterUid ? requesterUid : String(userId);
  if (requesterUid && finalUserId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to view this user's stats");
  }

  const allRaces = (await StepRaceModel.find({ userId: finalUserId, status: "completed" }).lean()) as ServiceParams[];

  let wins = 0;
  let losses = 0;
  let streak = 0;

  allRaces.sort(
    (a, b) =>
      new Date(b.endTime || b.createdAt).getTime() -
      new Date(a.endTime || a.createdAt).getTime(),
  );

  for (let i = 0; i < allRaces.length; i++) {
    const r = allRaces[i];
    if (r.winner === "user") {
      wins++;
      if (losses === 0) streak++;
    } else if (r.winner === "opponent") {
      losses++;
    }
  }

  const user = await UserModel.findOne({ uid: finalUserId });
  const { paceSeconds: bestPaceSeconds } = await resolveUserShadowPace(
    user as ServiceParams | null,
    allRaces,
  );

  const tz = user?.timezone || "Asia/Kolkata";
  const todayStart = moment.tz(tz).startOf("day").toDate();
  const racesToday = allRaces.filter(
    (r) => new Date(r.createdAt || r.endTime) >= todayStart,
  ).length;

  const activeRace = await StepRaceModel.findOne({
    userId: finalUserId,
    status: "active",
  }).lean();

  const lastNonShadowRace = allRaces.find((r) => r.opponent?.type !== "shadow");
  const mostRecentManualRace = activeRace || lastNonShadowRace;
  const lastManualRaceTime = mostRecentManualRace
    ? new Date(
        (mostRecentManualRace as ServiceParams).endTime ||
          (mostRecentManualRace as ServiceParams).createdAt,
      )
    : null;

  const shadowRacesAway = await countShadowRacesAway(finalUserId, lastManualRaceTime);

  return {
    racesToday,
    wins,
    losses,
    streak,
    totalRaces: allRaces.length,
    bestPaceSeconds,
    shadowRacesAway,
    currentRace: activeRace || null,
  };
};

/** Search opponents with escaped regex */
export const searchOpponentsService = async ({
  q,
  requesterUid,
}: SearchOpponentsParams) => {
  if (!q || q.length < 2) {
    throw codedError("bad_request", "Search query must be at least 2 characters");
  }

  const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const users = await UserModel.find({
    username: { $regex: escaped, $options: "i" },
    isGuest: false,
  })
    .limit(10)
    .lean();

  const results = users.map((user) => {
    const bestStepCount = user.bestStepCount || 10000;
    const decayedSteps = calculateDecayedSteps(bestStepCount, user.lastActive);
    const bestPaceSeconds = shadowPaceForUser(user as ServiceParams);

    return {
      uid: user.uid,
      username: user.username,
      profileImageUrl: user.profileImageUrl,
      bestStepCount: decayedSteps,
      bestPaceSeconds,
      isOnline: false,
      lastActiveDate: user.lastActive,
      type: "shadow",
      shadowData: {
        uid: user.uid,
        username: user.username,
        profileImageUrl: user.profileImageUrl,
        bestStepCount: decayedSteps,
        originalBestStepCount: bestStepCount,
        bestPaceSeconds,
        lastActiveDate: user.lastActive,
        decayRate: 0.10,
        isOnline: false,
      },
    };
  });

  const qLower = String(q).toLowerCase();
  const athleteResults = LEGENDARY_ATHLETES.filter((athlete) =>
    athlete.username.toLowerCase().includes(qLower),
  ).map((athlete) => ({
    uid: athlete.uid,
    username: athlete.username,
    profileImageUrl: athlete.profileImageUrl,
    bestStepCount: athlete.shadowData?.bestStepCount || 1000,
    bestPaceSeconds: athlete.bestPaceSeconds,
    isOnline: true,
    lastActiveDate: athlete.shadowData?.lastActiveDate || new Date().toISOString(),
    type: "shadow",
    shadowData: athlete.shadowData,
  }));

  const seen = new Set(athleteResults.map((item) => item.uid));
  const merged = [
    ...athleteResults,
    ...results.filter((item) => {
      const uid = item.uid;
      return uid != null && !seen.has(uid);
    }),
  ];

  trackEvent(ANALYTICS_EVENTS.RACE_OPPONENT_SEARCHED, {
    user_id: requesterUid,
    query_length: String(q).length,
    result_count: merged.length,
  });

  return merged;
};

/** Get random shadow opponents */
export const getRandomShadowOpponentsService = () => {
  return LEGENDARY_ATHLETES;
};

/** Create step race */
export const createStepRaceService = async ({
  userId,
  opponentUid,
  opponentType,
  duration = 24,
  startSteps = 0,
}: CreateStepRaceServiceParams) => {
  if (!opponentUid || !opponentType) {
    throw codedError("bad_request", "Opponent UID and type are required");
  }

  const existingActiveRace = await StepRaceModel.findOne({ userId, status: "active" });
  if (existingActiveRace) {
    if (new Date() > new Date(existingActiveRace.endTime)) {
      existingActiveRace.status = "expired";
      await existingActiveRace.save();
    } else {
      const err = codedError("conflict", "You already have an active race in progress");
      (err as unknown as { activeRace: typeof existingActiveRace }).activeRace = existingActiveRace;
      throw err;
    }
  }

  let opponent: ServiceParams | undefined;
  const legendary = LEGENDARY_ATHLETES.find((a) => a.uid === opponentUid);
  if (legendary) {
    opponent = legendary as unknown as ServiceParams;
  } else {
    const oppUser = await UserModel.findOne({ uid: opponentUid }).lean();
    if (!oppUser) {
      throw codedError("not_found", "Opponent not found");
    }

    const bestStepCount = oppUser.bestStepCount || 10000;
    const decayedSteps = calculateDecayedSteps(bestStepCount, oppUser.lastActive);
    const opponentPaceSeconds = shadowPaceForUser(oppUser as ServiceParams);

    opponent = {
      uid: oppUser.uid,
      username: oppUser.username,
      profileImageUrl: oppUser.profileImageUrl,
      type: "shadow",
      currentSteps: decayedSteps,
      shadowData: {
        uid: oppUser.uid,
        username: oppUser.username,
        profileImageUrl: oppUser.profileImageUrl,
        bestStepCount: decayedSteps,
        originalBestStepCount: bestStepCount,
        bestPaceSeconds: opponentPaceSeconds,
        lastActiveDate: oppUser.lastActive,
        decayRate: 0.10,
        isOnline: false,
      },
    };
  }

  const opponentPaceSeconds =
    (opponent.shadowData as ServiceParams)?.bestPaceSeconds ||
    opponent.bestPaceSeconds ||
    DEFAULT_PACE_SECONDS;

  const now = new Date();
  const paceDurationHours = (Number(opponentPaceSeconds) + 3600) / 3600;
  const finalDurationHours = Math.max(Number(duration) || 24, paceDurationHours);
  const endTime = new Date(now.getTime() + finalDurationHours * 60 * 60 * 1000);

  const race = await StepRaceModel.create({
    raceId: `race_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    userId,
    opponent,
    targetSteps: 1000,
    opponentPaceSeconds,
    startSteps: Number(startSteps) || 0,
    userSteps: 0,
    opponentSteps: 1000,
    status: "active",
    startTime: now.toISOString(),
    endTime: endTime.toISOString(),
    duration: finalDurationHours,
  });

  trackEvent(ANALYTICS_EVENTS.RACE_CREATED, {
    user_id: userId,
    opponent_type: opponentType === "shadow" ? "shadow" : "friend",
    duration: finalDurationHours,
  });

  return race;
};

/** Get active race */
export const getActiveRaceService = async ({
  userId,
  requesterUid,
}: GetActiveRaceParams) => {
  const finalUserId = userId === "current_user" && requesterUid ? requesterUid : userId;
  if (requesterUid && finalUserId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to view this user's active race");
  }

  const activeRace = await StepRaceModel.findOne({ userId: finalUserId, status: "active" });
  if (!activeRace) {
    throw codedError("not_found", "No active race found");
  }

  if (new Date() > new Date(activeRace.endTime)) {
    activeRace.status = "expired";
    await activeRace.save();
    throw codedError("not_found", "No active race found");
  }

  return activeRace;
};

/** Update race progress */
export const updateRaceProgressService = async ({
  raceId,
  userSteps,
  userTimeSeconds,
  requesterUid,
}: UpdateRaceProgressServiceParams) => {
  if (!raceId || userSteps === undefined) {
    throw codedError("bad_request", "Race ID and user steps are required");
  }

  const race = await StepRaceModel.findOne({ raceId });
  if (!race) {
    throw codedError("not_found", "Race not found");
  }

  if (requesterUid && race.userId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to update this race");
  }

  if (race.status !== "active") {
    throw codedError("bad_request", "Race is not active");
  }

  const opponentPaceSec = race.opponentPaceSeconds || DEFAULT_PACE_SECONDS;
  const target = race.targetSteps || 1000;
  const incomingSteps = Math.max(0, Math.floor(Number(userSteps) || 0));
  race.userSteps = Math.min(target, Math.max(Number(race.userSteps) || 0, incomingSteps));
  const now = new Date();
  const elapsedSeconds = Math.round(
    (now.getTime() - new Date(race.startTime).getTime()) / 1000,
  );
  const opponentSimulatedSteps = Math.min(
    target,
    Math.round((elapsedSeconds / opponentPaceSec) * target),
  );
  race.opponentSteps = opponentSimulatedSteps;

  if (race.userSteps >= target) {
    const timeTaken = userTimeSeconds || elapsedSeconds;
    race.userTimeSeconds = timeTaken;
    race.status = "completed";
    race.winner = "user";

    await persistLatestRacePace(race.userId, timeTaken, race.userSteps, target);
  } else if (opponentSimulatedSteps >= target) {
    race.status = "completed";
    race.userTimeSeconds = elapsedSeconds;
    race.winner = userSteps >= opponentSimulatedSteps ? "user" : "opponent";
    await persistLatestRacePace(race.userId, elapsedSeconds, userSteps, target);
  }

  await race.save();
  return race;
};

/** Complete race */
export const completeRaceService = async ({
  raceId,
  userSteps,
  userTimeSeconds,
  requesterUid,
}: CompleteRaceServiceParams) => {
  if (!raceId) {
    throw codedError("bad_request", "Race ID is required");
  }

  const race = await StepRaceModel.findOne({ raceId });
  if (!race) {
    throw codedError("not_found", "Race not found");
  }

  if (requesterUid && race.userId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to complete this race");
  }

  if (race.status !== "active") {
    return race;
  }

  const now = new Date();
  const elapsedSeconds =
    userTimeSeconds ||
    Math.round((now.getTime() - new Date(race.startTime).getTime()) / 1000);
  const finalSteps = userSteps !== undefined ? userSteps : race.userSteps;

  race.userSteps = finalSteps;
  race.userTimeSeconds = elapsedSeconds;
  race.status = "completed";

  const opponentPaceSec = race.opponentPaceSeconds || DEFAULT_PACE_SECONDS;
  const target = race.targetSteps || 1000;
  const opponentSimulatedSteps = Math.min(
    target,
    Math.round((elapsedSeconds / opponentPaceSec) * target),
  );
  race.opponentSteps = opponentSimulatedSteps;

  if (finalSteps >= target || finalSteps >= opponentSimulatedSteps) {
    race.winner = "user";
  } else {
    race.winner = "opponent";
  }

  await persistLatestRacePace(race.userId, elapsedSeconds, finalSteps, target);
  await race.save();

  trackEvent(ANALYTICS_EVENTS.RACE_COMPLETED, {
    user_id: race.userId,
    result: race.winner === "user" ? "win" : race.winner === "opponent" ? "loss" : "draw",
    my_steps: race.userSteps,
    opponent_steps: race.opponentSteps,
    opponent_type: race.opponent?.type,
  });

  return race;
};

/** Get leaderboard */
export const getLeaderboardService = async ({ limit = 10 }: GetLeaderboardParams) => {
  const leaderboardUsers = await UserModel.find({ isGuest: false })
    .sort({ bestPaceSeconds: 1 })
    .limit(limit)
    .lean();

  return leaderboardUsers.map((u) => ({
    uid: u.uid,
    username: u.username,
    profileImageUrl: u.profileImageUrl,
    bestPaceSeconds: u.bestPaceSeconds || DEFAULT_PACE_SECONDS,
    bestStepCount: u.bestStepCount || 0,
    totalWins: 0,
    currentStreak: 0,
  }));
};

/** Get rivalry history */
export const getRivalryHistoryService = async ({
  userId,
  opponentUid,
  requesterUid,
}: GetRivalryHistoryParams) => {
  const finalUserId = userId === "current_user" && requesterUid ? requesterUid : userId;
  if (requesterUid && finalUserId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to view this user's rivalry history");
  }

  const completedRaces = await StepRaceModel.find({
    userId: finalUserId,
    "opponent.uid": opponentUid,
    status: "completed",
  })
    .sort({ updatedAt: -1 })
    .limit(7)
    .lean();

  const wins = completedRaces.filter((r) => r.winner === "user").length;
  const losses = completedRaces.filter((r) => r.winner === "opponent").length;
  const history = completedRaces.map((r) => (r.winner === "user" ? "win" : "loss"));

  return { wins, losses, history };
};

/** Get match history for My Races screen */
export const getStepRaceHistoryService = async ({
  userId,
  requesterUid,
}: GetStepRaceHistoryParams) => {
  const finalUserId = userId === "current_user" && requesterUid ? requesterUid : userId;
  if (requesterUid && finalUserId !== requesterUid) {
    throw codedError("forbidden", "You are not authorized to view this user's race history");
  }

  const races = await StepRaceModel.find({
    userId: finalUserId,
    status: "completed",
  })
    .sort({ updatedAt: -1 })
    .limit(30)
    .lean();

  return races.map((r) => {
    const isWin = r.winner === "user";
    const userSteps = r.userSteps || 0;
    const oppSteps = r.opponentSteps || 1000;
    const stepDiff = Math.abs(userSteps - oppSteps);

    return {
      id: r.raceId || String(r._id),
      opponentUid: r.opponent?.uid || "opponent",
      opponentName: r.opponent?.username || "Rohit Sharma",
      opponentAvatar:
        r.opponent?.profileImageUrl ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400",
      isWin,
      stepDiff: stepDiff > 0 ? stepDiff : 245,
      completedAt: r.updatedAt
        ? new Date(r.updatedAt).toLocaleDateString("en-IN", {
            month: "short",
            day: "numeric",
          })
        : "Recent",
    };
  });
};

export default {
  calendarDayKey,
  projectedPaceSeconds,
  calculateDecayedPace,
  persistLatestRacePace,
  resolveUserShadowPace,
  calculateDecayedSteps,
  shadowPaceForUser,
  countShadowRacesAway,
  getStepRaceStatsService,
  searchOpponentsService,
  getRandomShadowOpponentsService,
  createStepRaceService,
  getActiveRaceService,
  updateRaceProgressService,
  completeRaceService,
  getLeaderboardService,
  getRivalryHistoryService,
  getStepRaceHistoryService,
};

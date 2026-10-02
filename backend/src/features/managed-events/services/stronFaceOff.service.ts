// Face Off mechanics: each active day every participant is randomly paired 1v1 (odd
// participant paired with a bot). A match is decided by an instant knockout when one
// player's step lead reaches the configured threshold, otherwise by step count at day end.
// Daily wins roll up into weekly wins; the champion is whoever wins the most days.

import BotService from "../../../utils/bot.service.js";
import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import StronFaceOffMatch from "../models/stronFaceOffMatch.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { getStronConfig, STRON_BOT_PREFIX } from "../../../config/stronConfig.js";
import { dayKey, weekKey } from "../../../utils/stronTime.util.js";
import { randomBotDailySteps, shuffle, simulateBotSteps } from "../../../utils/stronRandom.util.js";
import { memberGainedSteps } from "../../../utils/stronSteps.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import type { FaceOffSide, FaceOffMatchDoc, IStronFaceOffMatch } from "../types/index.js";


const makeSide = (
  uid: string,
  { isBot = false, baselineSteps = 0 }: { isBot?: boolean; baselineSteps?: number } = {},
) => ({
  uid,
  isBot,
  steps: 0,
  baselineSteps,
  botTargetSteps: isBot ? randomBotDailySteps() : 0,
});

const botUid = () => `${STRON_BOT_PREFIX}${BotService.selectRandomBot().type.toLowerCase()}`;

// Credit a daily win to a real participant (bots are not tracked). Idempotent-safe enough:
// only ever called once per completed match.
const creditWin = async (winnerUid: string, eventKey: string, isoWeek: string) => {
  if (!winnerUid || winnerUid.startsWith(STRON_BOT_PREFIX)) {
    return;
  }
  await StronParticipation.updateOne(
    { uid: winnerUid, eventKey },
    { $inc: { totalWins: 1, [`weeklyWins.${isoWeek}`]: 1 } },
  );
};

// Generate the day's pairings for every live Face Off event. Skips events already paired.
export const generateForDay = async ({ forDayKey = dayKey() }: { forDayKey?: string } = {}) => {
  const events = await StronEvent.find({ format: "face_off", status: "live" });
  for (const event of events) {
    await generateEventMatches(event as ServiceParams, forDayKey);
  }
};

const generateEventMatches = async (event: ServiceParams, forDayKey: string) => {
  const existing = await StronFaceOffMatch.countDocuments({
    eventKey: event.key,
    dayKey: forDayKey,
  });
  if (existing > 0) {
    return;
  }

  const participants = await StronParticipation.find({
    eventKey: event.key,
    status: "active",
  })
    .select("uid")
    .lean();
  if (participants.length === 0) {
    return;
  }

  const isoWeek = weekKey();
  const order = shuffle(participants.map((p) => p.uid));
  const users = await UserModel.find({ uid: { $in: order } })
    .select("uid todaysStepCount")
    .lean();
  const stepsByUid = new Map(users.map((u) => [u.uid, Number(u.todaysStepCount || 0)]));
  const matches = [];
  for (let i = 0; i < order.length; i += 2) {
    const a = order[i];
    const b = i + 1 < order.length ? order[i + 1] : null;
    matches.push({
      eventKey: event.key,
      dayKey: forDayKey,
      weekKey: isoWeek,
      playerA: makeSide(a, { baselineSteps: stepsByUid.get(a) || 0 }),
      playerB: b
        ? makeSide(b, { baselineSteps: stepsByUid.get(b) || 0 })
        : makeSide(botUid(), { isBot: true }),
      status: "active",
    });
  }
  if (matches.length) {
    await StronFaceOffMatch.insertMany(matches);
  }
};

// Complete a match, record the winner, and credit the win. No-op if already completed.
const completeMatch = async (
  match: FaceOffMatchDoc,
  winnerUid: string | null,
  decidedBy: string,
) => {
  if (match.status === "completed") {
    return match;
  }
  match.status = "completed";
  match.winnerUid = winnerUid;
  match.decidedBy = decidedBy;
  match.completedAt = new Date();
  if (decidedBy === "ko") {
    match.koAt = new Date();
  }
  await match.save?.();
  if (winnerUid) {
    await creditWin(winnerUid, String(match.eventKey || ""), String(match.weekKey || ""));
  }
  return match;
};

// Opponent's current steps: live value for humans, time-simulated for bots.
const currentStepsForSide = (side: FaceOffSide, forDayKey: string | null = null) =>
  side.isBot
    ? simulateBotSteps(side.botTargetSteps, new Date(), forDayKey)
    : Number(side.steps || 0);

// Real-time step-sync hook: update the caller's steps in today's active match and apply
// an instant knockout when the step lead reaches the threshold. Best-effort and cheap.
export const onStepsSynced = async ({
  uid,
  todaysStepCount,
  eventKey,
}: ServiceParams & { uid?: string; todaysStepCount?: number; eventKey?: string } = {}) => {
  const today = dayKey();
  const filter: MongoFilter = {
    dayKey: today,
    status: "active",
    $or: [{ "playerA.uid": uid }, { "playerB.uid": uid }],
  };
  if (eventKey) {
    filter.eventKey = eventKey;
  }
  const match = await StronFaceOffMatch.findOne(filter);
  if (!match) {
    return;
  }

  const matchDoc = match as unknown as FaceOffMatchDoc;
  if (!matchDoc) {
    return;
  }

  const isA = matchDoc.playerA?.uid === uid;
  const me = (isA ? matchDoc.playerA : matchDoc.playerB) as FaceOffSide;
  const opponent = (isA ? matchDoc.playerB : matchDoc.playerA) as FaceOffSide;

  me.steps = memberGainedSteps(me, Number(todaysStepCount || 0));
  const opponentSteps = currentStepsForSide(opponent, matchDoc.dayKey || null);
  await matchDoc.save?.();

  await StronParticipation.updateOne(
    { uid, eventKey: matchDoc.eventKey, status: "active" },
    {
      $set: {
        lastSyncedAt: new Date(),
        // So face-off leaderboard subtitle is never stuck at 0 between match lookups.
        leaderboardSteps: me.steps,
      },
    },
  );

  const { faceOffKoStepLead } = getStronConfig();
  const mySteps = Number(me.steps || 0);
  if (mySteps - opponentSteps >= faceOffKoStepLead) {
    await completeMatch(matchDoc, String(me.uid || ""), "ko");
  } else if (opponentSteps - mySteps >= faceOffKoStepLead) {
    await completeMatch(matchDoc, String(opponent.uid || ""), "ko");
  }
};

// Decide the winner of a match from final step counts.
const resolveWinner = (
  aUid: string,
  aSteps: number,
  aIsBot: boolean,
  bUid: string,
  bSteps: number,
  bIsBot: boolean,
) => {
  if (aSteps > bSteps) return { winnerUid: aUid, decidedBy: "day_end" };
  if (bSteps > aSteps) return { winnerUid: bUid, decidedBy: "day_end" };
  // Tie: prefer a real player; if both real, no win is credited.
  if (aIsBot && !bIsBot) return { winnerUid: bUid, decidedBy: "tie" };
  if (bIsBot && !aIsBot) return { winnerUid: aUid, decidedBy: "tie" };
  return { winnerUid: null, decidedBy: "tie" };
};

// Finalize the settled day's matches using each participant's archived step total.
export const settleDay = async ({
  settleDayKey,
  stepsByUid,
}: ServiceParams & { settleDayKey: string; stepsByUid: Map<string, number> }) => {
  const matches = await StronFaceOffMatch.find({
    dayKey: settleDayKey,
    status: "active",
  });
  for (const match of matches) {
    const aSteps = match.playerA.isBot
      ? match.playerA.botTargetSteps
      : memberGainedSteps(match.playerA as ServiceParams, stepsByUid.get(match.playerA.uid) || 0);
    const bSteps = match.playerB.isBot
      ? match.playerB.botTargetSteps
      : memberGainedSteps(match.playerB as ServiceParams, stepsByUid.get(match.playerB.uid) || 0);

    match.playerA.steps = aSteps;
    match.playerB.steps = bSteps;
    const { winnerUid, decidedBy } = resolveWinner(
      match.playerA.uid,
      aSteps,
      match.playerA.isBot,
      match.playerB.uid,
      bSteps,
      match.playerB.isBot,
    );
    await completeMatch(match as unknown as FaceOffMatchDoc, winnerUid, decidedBy);
  }
};

// Participant progress: today's match plus running totals.
export const getProgress = async (participation: ServiceParams, todaySteps = 0) => {
  const today = dayKey();
  const match = await StronFaceOffMatch.findOne({
    eventKey: participation.eventKey,
    dayKey: today,
    $or: [{ "playerA.uid": participation.uid }, { "playerB.uid": participation.uid }],
  }).lean();

  let todayMatch = null;
  if (match) {
    const isA = match.playerA.uid === participation.uid;
    const me = isA ? match.playerA : match.playerB;
    const opp = isA ? match.playerB : match.playerA;
    // Live VS card: recompute caller from phone; keep stored max.
    const mySteps =
      match.status === "active" && !me.isBot
        ? Math.max(
            Number(me.steps || 0),
            memberGainedSteps(me as ServiceParams, todaySteps),
          )
        : Math.max(0, Number(me.steps || 0));
    const opponentSteps = Math.max(
      0,
      Number(currentStepsForSide(opp, match.dayKey) || 0),
    );
    todayMatch = {
      status: match.status,
      mySteps,
      opponentUid: opp.uid,
      opponentIsBot: opp.isBot,
      opponentSteps,
      stepDifference: mySteps - opponentSteps,
      winnerUid: match.winnerUid,
      decidedBy: match.decidedBy,
    };
  }

  return {
    format: "face_off",
    status: participation.status,
    totalWins: participation.totalWins || 0,
    weeklyWins: participation.weeklyWins || {},
    todayMatch,
    lastSyncedAt: participation.lastSyncedAt || null,
  };
};

// Recent matches for a participant (past matches screen).
export const getMatches = async ({
  uid,
  eventKey,
  limit = 30,
}: ServiceParams & { uid: string; eventKey: string; limit?: number }) =>
  StronFaceOffMatch.find({
    eventKey,
    $or: [{ "playerA.uid": uid }, { "playerB.uid": uid }],
  })
    .sort({ dayKey: -1 })
    .limit(limit)
    .lean();

// Leaderboard: most daily wins first; subtitle = today's match steps (or last match).
export const buildLeaderboard = async (event: ServiceParams) => {
  const rows = await StronParticipation.find({
    eventKey: event.key,
    status: { $nin: ["cancelled", "refunded"] },
  }).lean();

  const today = dayKey();
  const uids = [...new Set(rows.map((r) => r.uid).filter(Boolean).map(String))];

  const [todaysMatches, users] = await Promise.all([
    StronFaceOffMatch.find({ eventKey: event.key, dayKey: today }).lean(),
    uids.length
      ? UserModel.find({ uid: { $in: uids } })
          .select("uid todaysStepCount")
          .lean()
      : Promise.resolve([]),
  ]);

  let recentMatches: ServiceParams[] = [];
  if (uids.length) {
    // Latest matches (incl. prior days) so we never show blank step lines.
    recentMatches = await StronFaceOffMatch.find({
      eventKey: event.key,
      $or: [{ "playerA.uid": { $in: uids } }, { "playerB.uid": { $in: uids } }],
    })
      .sort({ dayKey: -1 })
      .limit(Math.max(40, uids.length * 4))
      .lean();
  }

  const phoneByUid = new Map(
    users.map((u) => [String(u.uid), Math.max(0, Number(u.todaysStepCount || 0))]),
  );

  const resolveSideSteps = (match: ServiceParams, side: ServiceParams) => {
    if (!side?.uid || side.isBot) return 0;
    const phone = phoneByUid.get(String(side.uid)) || 0;
    const stored = Math.max(0, Number(side.steps || 0));
    if (match.status === "active") {
      return Math.max(stored, memberGainedSteps(side as ServiceParams, phone));
    }
    return stored;
  };

  // Today first, then latest historical match once per uid.
  const stepsByUid = new Map();
  for (const match of todaysMatches) {
    for (const side of [match.playerA, match.playerB]) {
      if (!side?.uid || side.isBot) continue;
      stepsByUid.set(String(side.uid), resolveSideSteps(match, side));
    }
  }
  for (const match of recentMatches) {
    for (const side of [match.playerA, match.playerB]) {
      if (!side?.uid || side.isBot) continue;
      const key = String(side.uid);
      if (stepsByUid.has(key)) continue;
      stepsByUid.set(key, resolveSideSteps(match, side));
    }
  }

  const enriched = rows.map((row) => {
    const uid = String(row.uid);
    const totalWins = Number(row.totalWins || 0);
    const steps = Math.max(
      0,
      stepsByUid.get(uid) ??
        Number(row.leaderboardSteps || row.accumulatedSteps || 0),
    );
    return { row, totalWins, steps };
  });

  enriched.sort((a, b) => b.totalWins - a.totalWins || b.steps - a.steps);

  return enriched.map((item, index) => {
    const { row, totalWins, steps } = item;
    return {
      rank: index + 1,
      uid: row.uid,
      status: row.status,
      totalWins,
      weeklyWins: row.weeklyWins || {},
      leaderboardSteps: steps,
      steps,
      score: totalWins,
      ticketLabel: row.ticketLabel,
      lastSyncedAt: row.lastSyncedAt || null,
      label: "wins",
    };
  });
};

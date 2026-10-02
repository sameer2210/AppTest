// King of the Hill mechanics: daily groups of 2-5 (bots fill gaps). Whoever has the most
// steps is the "king"; time spent as king accrues to that member. King time is credited on
// every step-sync, topped up by a reconciliation cron every minute (so idle stretches and
// bot minute-ticks count), and finalized at day end. Cumulative king time across days ranks
// the event; ties break on steps. Bots walk at constant speed and finish their daily target
// by end of the IST day.

import BotService from "../../../utils/bot.service.js";
import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import StronKingOfHillGroup from "../models/stronKingOfHillGroup.model.js";
import type { IStronKingOfHillGroup } from "../types/index.js";
import { UserModel } from "../../identity-auth/index.js";
import { getStronConfig, STRON_BOT_PREFIX } from "../../../config/stronConfig.js";
import { dayKey, istDayStartFromKey, addIstDays } from "../../../utils/stronTime.util.js";
import { randomBotDailySteps, shuffle, simulateBotSteps } from "../../../utils/stronRandom.util.js";
import { memberGainedSteps } from "../../../utils/stronSteps.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";

const makeMember = (
  uid: string,
  { isBot = false, baselineSteps = 0 }: { isBot?: boolean; baselineSteps?: number } = {},
) => ({
  uid,
  isBot,
  steps: 0,
  baselineSteps: isBot ? 0 : Math.max(0, Number(baselineSteps || 0)),
  botTargetSteps: isBot ? randomBotDailySteps() : 0,
  kingSeconds: 0,
});

const botUid = (suffix: number) =>
  `${STRON_BOT_PREFIX}${BotService.selectRandomBot().type.toLowerCase()}_${suffix}`;

// A member's step count right now: stored for humans, time-simulated for bots.
const memberSteps = (
  member: ServiceParams,
  at: Date = new Date(),
  forDayKey: string | null = null,
) =>
  member.isBot ? simulateBotSteps(member.botTargetSteps, at, forDayKey) : member.steps;

// Pick the leader (most steps). Keep the incumbent on a tie to avoid needless churn.
const resolveLeader = (group: ServiceParams, at: Date) => {
  let leader = null;
  let best = -1;
  for (const member of group.members) {
    const steps = memberSteps(member, at, group.dayKey);
    if (steps > best) {
      best = steps;
      leader = member.uid;
    }
  }
  if (best <= 0) {
    return group.currentLeaderUid; // nobody has moved yet
  }
  return leader;
};

// Credit elapsed seconds (capped at `until`) to the current king, then advance checkpoint.
const creditElapsed = (group: ServiceParams, until: Date) => {
  const checkpoint = group.lastCheckpoint || group.createdAt || new Date();
  const boundedUntil = until < checkpoint ? checkpoint : until;
  const elapsedSeconds = Math.floor((boundedUntil - checkpoint) / 1000);
  if (elapsedSeconds > 0 && group.currentLeaderUid) {
    const member = group.members.find((m: ServiceParams) => m.uid === group.currentLeaderUid);
    if (member) {
      member.kingSeconds += elapsedSeconds;
    }
  }
  group.lastCheckpoint = boundedUntil;
};

// Re-evaluate the king after crediting; record a new reign start on a change.
const refreshLeader = (group: ServiceParams, at: Date) => {
  const leader = resolveLeader(group, at);
  if (leader && leader !== group.currentLeaderUid) {
    group.currentLeaderUid = leader;
    group.leaderSince = at;
  }
};

// Generate the day's groups for every live King of the Hill event. Skips existing days.
export const generateForDay = async ({ forDayKey = dayKey() }: { forDayKey?: string } = {}) => {
  const events = await StronEvent.find({ format: "king_of_the_hill", status: "live" });
  for (const event of events) {
    await generateEventGroups(event as ServiceParams, forDayKey);
  }
};

const generateEventGroups = async (event: ServiceParams, forDayKey: string) => {
  const existing = await StronKingOfHillGroup.countDocuments({
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

  const { kothMinGroup, kothMaxGroup } = getStronConfig();
  const order = shuffle(participants.map((p) => p.uid));
  const users = await UserModel.find({ uid: { $in: order } })
    .select("uid todaysStepCount")
    .lean();
  const stepsByUid = new Map(users.map((u) => [u.uid, Number(u.todaysStepCount || 0)]));
  const now = new Date();
  const groups = [];

  for (let i = 0; i < order.length; i += kothMaxGroup) {
    const chunk = order.slice(i, i + kothMaxGroup);
    const members = chunk.map((uid) =>
      makeMember(uid, { baselineSteps: stepsByUid.get(uid) || 0 }),
    );
    // Fill up to the minimum group size with bots so no one competes alone.
    let botIndex = 0;
    while (members.length < kothMinGroup) {
      members.push(makeMember(botUid(botIndex), { isBot: true }));
      botIndex += 1;
    }
    groups.push({
      eventKey: event.key,
      dayKey: forDayKey,
      members,
      currentLeaderUid: null,
      leaderSince: now,
      lastCheckpoint: now,
      status: "active",
    });
  }
  if (groups.length) {
    await StronKingOfHillGroup.insertMany(groups);
  }
};

// Real-time step-sync hook: update the caller's steps and re-evaluate the king.
export const onStepsSynced = async ({
  uid,
  todaysStepCount,
  eventKey,
}: ServiceParams & { uid?: string; todaysStepCount?: number; eventKey?: string } = {}) => {
  const today = dayKey();
  const filter: MongoFilter = {
    dayKey: today,
    status: "active",
    "members.uid": uid,
  };
  if (eventKey) {
    filter.eventKey = eventKey;
  }
  const group = await StronKingOfHillGroup.findOne(filter);
  if (!group) {
    return;
  }

  const now = new Date();
  const member = group.members.find((m) => m.uid === uid);
  if (member) {
    member.steps = memberGainedSteps(member as ServiceParams, todaysStepCount);
  }
  creditElapsed(group, now);
  refreshLeader(group, now);
  await group.save();

  const partUpdate: MongoFilter = { lastSyncedAt: now };
  if (member) {
    partUpdate.leaderboardSteps = Math.max(0, Number(member.steps || 0));
  }
  await StronParticipation.updateOne(
    { uid, eventKey: group.eventKey, status: "active" },
    { $set: partUpdate },
  );
};

// Reconciliation cron: top up king time for all active groups (covers idle gaps and lets
// bot-driven leadership changes register even without human syncs).
export const reconcile = async () => {
  const groups = await StronKingOfHillGroup.find({ status: "active" });
  const now = new Date();
  for (const group of groups) {
    creditElapsed(group, now);
    refreshLeader(group, now);
    await group.save();
  }
  return groups.length;
};

// Finalize the settled day's groups: credit king time up to day end, pick the day's winner,
// and accumulate king time onto each participant. Idempotent (only touches active groups).
export const settleDay = async ({
  settleDayKey,
  stepsByUid,
}: ServiceParams & { settleDayKey: string; stepsByUid: Map<string, number> }) => {
  const groups = await StronKingOfHillGroup.find({
    dayKey: settleDayKey,
    status: "active",
  });
  const endOfDay = addIstDays(istDayStartFromKey(settleDayKey), 1);

  for (const group of groups) {
    // Snap human step counts to their archived totals for the day.
    for (const member of group.members) {
      if (!member.isBot) {
        member.steps = memberGainedSteps(
          member as ServiceParams,
          stepsByUid.get(member.uid) || 0,
        );
      }
    }
    // Ensure the final leg of leadership is credited using end-of-day counts.
    refreshLeader(group, endOfDay);
    creditElapsed(group, endOfDay);

    // Day winner: most king seconds, tie-break by steps.
    let winner = null;
    let best = { seconds: -1, steps: -1 };
    for (const member of group.members) {
      const seconds = member.kingSeconds || 0;
      const steps = memberSteps(member, endOfDay, settleDayKey);
      if (seconds > best.seconds || (seconds === best.seconds && steps > best.steps)) {
        best = { seconds, steps };
        winner = member.uid;
      }
    }
    group.winnerUid = winner;
    group.status = "completed";
    group.completedAt = new Date();
    await group.save();

    // Accumulate king time onto real participants for the event-wide ranking.
    for (const member of group.members) {
      if (member.isBot || !(member.kingSeconds > 0)) continue;
      await StronParticipation.updateOne(
        { uid: member.uid, eventKey: group.eventKey },
        { $inc: { totalKingSeconds: member.kingSeconds } },
      );
    }
  }
};

/** Preview king-time credit without mutating DB (cron still persists). */
const previewLiveMembers = (group: ServiceParams, at: Date = new Date()) => {
  const members = (group.members || []).map((m: ServiceParams) => ({
    uid: m.uid,
    isBot: m.isBot,
    steps: m.isBot ? simulateBotSteps(m.botTargetSteps, at, group.dayKey) : m.steps,
    kingSeconds: Number(m.kingSeconds || 0),
  }));

  if (group.status === "active" && group.currentLeaderUid) {
    const checkpoint = group.lastCheckpoint
      ? new Date(group.lastCheckpoint)
      : group.createdAt
        ? new Date(group.createdAt)
        : at;
    const elapsed = Math.max(
      0,
      Math.floor((at.getTime() - checkpoint.getTime()) / 1000),
    );
    if (elapsed > 0) {
      const king = members.find((m: ServiceParams) => m.uid === group.currentLeaderUid);
      if (king) king.kingSeconds += elapsed;
    }
  }

  // Re-evaluate leader from live steps for UI (preview only).
  let leaderUid = group.currentLeaderUid || null;
  let best = -1;
  for (const m of members) {
    if (m.steps > best) {
      best = m.steps;
      leaderUid = m.uid;
    }
  }
  if (best <= 0) leaderUid = group.currentLeaderUid || null;

  return {
    currentLeaderUid: leaderUid,
    members: members.sort((a: ServiceParams, b: ServiceParams) => b.steps - a.steps),
  };
};

// Participant progress: today's group standings plus cumulative king time.
export const getProgress = async (participation: ServiceParams) => {
  const today = dayKey();
  const group = await StronKingOfHillGroup.findOne({
    eventKey: participation.eventKey,
    dayKey: today,
    "members.uid": participation.uid,
  }).lean();

  let todayGroup = null;
  let todayKingSeconds = 0;
  if (group) {
    const live = previewLiveMembers(group);
    todayGroup = {
      status: group.status,
      currentLeaderUid: live.currentLeaderUid,
      standings: live.members.map((m: ServiceParams) => ({
        uid: m.uid,
        isBot: m.isBot,
        steps: m.steps,
        kingSeconds: m.kingSeconds,
      })),
    };
    const mine = live.members.find((m: ServiceParams) => m.uid === participation.uid);
    todayKingSeconds = mine?.kingSeconds || 0;
  }

  return {
    format: "king_of_the_hill",
    status: participation.status,
    /** Settled cumulative only (days already finalized). */
    totalKingSeconds: participation.totalKingSeconds || 0,
    /** Live total = settled + today's accrued king time. */
    liveKingSeconds: (participation.totalKingSeconds || 0) + todayKingSeconds,
    todayKingSeconds,
    todayGroup,
    lastSyncedAt: participation.lastSyncedAt || null,
  };
};

// Recent groups a participant belonged to (past matches screen).
export const getMatches = async ({
  uid,
  eventKey,
  limit = 30,
}: ServiceParams & { uid: string; eventKey: string; limit?: number }) =>
  StronKingOfHillGroup.find({ eventKey, "members.uid": uid })
    .sort({ dayKey: -1 })
    .limit(limit)
    .lean();

// Leaderboard: most live king time first (settled + today's accrued).
export const buildLeaderboard = async (event: ServiceParams) => {
  const rows = await StronParticipation.find({
    eventKey: event.key,
    status: { $in: ["registered", "active", "completed", "expired"] },
  }).lean();

  const today = dayKey();
  const groups = await StronKingOfHillGroup.find({
    eventKey: event.key,
    dayKey: today,
  }).lean();

  const todayByUid = new Map();
  for (const group of groups) {
    const live = previewLiveMembers(group);
    for (const m of live.members as ServiceParams[]) {
      if (m.isBot) continue;
      todayByUid.set(m.uid, {
        todayKingSeconds: m.kingSeconds || 0,
        steps: m.steps || 0,
      });
    }
  }

  const enriched = rows.map((row) => {
    const todayStats = todayByUid.get(row.uid) || {
      todayKingSeconds: 0,
      steps: 0,
    };
    const settled = row.totalKingSeconds || 0;
    const liveKingSeconds = settled + todayStats.todayKingSeconds;
    return {
      uid: row.uid,
      status: row.status,
      totalKingSeconds: settled,
      todayKingSeconds: todayStats.todayKingSeconds,
      liveKingSeconds,
      score: liveKingSeconds,
      steps: todayStats.steps || row.leaderboardSteps || row.accumulatedSteps || 0,
      label: "king_time",
      ticketLabel: row.ticketLabel,
    };
  });

  enriched.sort(
    (a, b) =>
      b.liveKingSeconds - a.liveKingSeconds ||
      b.steps - a.steps,
  );

  return enriched.map((row, index) => ({
    ...row,
    rank: index + 1,
  }));
};

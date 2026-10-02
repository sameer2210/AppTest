// Marathon mechanics: steps accrue on live sync (leaderboard) and again at settle
// (accumulatedSteps). First to target gets the lowest completionOrder. No bots.

import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { dayKey } from "../../../utils/stronTime.util.js";
import { gainedForDay, liveCovered } from "../../../utils/stronSteps.util.js";
import type { ServiceParams } from "../../../types/service.util.js";

const tryComplete = async ({ participation, event, covered }: ServiceParams) => {
  const target = Number(participation.targetSteps || 0);
  if (target <= 0 || covered < target || participation.completionOrder != null) {
    return;
  }
  const updated = await StronEvent.findOneAndUpdate(
    { key: event.key },
    { $inc: { marathonCompletionCounter: 1 } },
    { new: true },
  );
  participation.completionOrder = updated?.marathonCompletionCounter ?? null;
  participation.status = "completed";
  participation.completedAt = new Date();
};

/** Real-time sync: cache live covered steps and complete if target hit. */
export const applyLive = async ({ participation, event, todaysStepCount }: ServiceParams) => {
  if (participation.status !== "active") {
    return;
  }
  const today = dayKey();
  const target = Math.max(0, Number(participation.targetSteps || 0));

  if (
    (!participation.baselineSteps || participation.baselineSteps === 0) &&
    !participation.accumulatedSteps &&
    (!participation.leaderboardSteps || participation.leaderboardSteps === 0) &&
    todaysStepCount > 0
  ) {
    participation.baselineSteps = Number(todaysStepCount || 0);
    participation.baselineDayKey = today;
  }

  let covered = liveCovered(participation, todaysStepCount, today);
  // Never store or show steps past the ticket target.
  if (target > 0) {
    covered = Math.min(covered, target);
  }
  participation.leaderboardSteps = covered;
  participation.lastSyncedAt = new Date();
  await tryComplete({ participation, event, covered });
  await participation.save();
};

/** Accrue one settle day. Idempotent per day. */
export const settleParticipationDay = async ({
  participation,
  event,
  rawSteps,
  settleDayKey,
}: ServiceParams) => {
  if (participation.status !== "active") {
    return;
  }
  if (participation.lastSettledDayKey === settleDayKey) {
    return;
  }

  const gained = gainedForDay(participation, rawSteps, settleDayKey);
  participation.accumulatedSteps += gained;
  participation.leaderboardSteps = participation.accumulatedSteps;
  participation.lastSettledDayKey = settleDayKey;

  if (participation.accumulatedSteps >= Number(participation.targetSteps || 0)) {
    await tryComplete({
      participation,
      event,
      covered: participation.accumulatedSteps,
    });
  } else if (
    participation.deadlineDayKey &&
    settleDayKey >= participation.deadlineDayKey
  ) {
    participation.status = "expired";
    participation.expiredAt = new Date();
  }

  await participation.save();
};

export const getProgress = (participation: ServiceParams, todaySteps = 0) => {
  const today = dayKey();
  const target = Math.max(0, Number(participation.targetSteps || 0));
  let covered = liveCovered(participation, todaySteps, today);
  if (target > 0) {
    covered = Math.min(covered, target);
  }
  return {
    format: "marathon",
    status: participation.status,
    coveredSteps: covered,
    targetSteps: target,
    distanceKm: participation.distanceKm,
    percent: target > 0 ? Math.min(100, Math.round((covered / target) * 100)) : 0,
    completionOrder: participation.completionOrder,
    deadlineDayKey: participation.deadlineDayKey,
    lastSyncedAt: participation.lastSyncedAt || null,
  };
};

export const buildLeaderboard = async (event: ServiceParams) => {
  const rows = await StronParticipation.find({
    eventKey: event.key,
    status: { $in: ["registered", "active", "completed", "expired"] },
  }).lean();

  const uids = [...new Set(rows.map((r) => r.uid).filter(Boolean))];
  const users = uids.length
    ? await UserModel.find({ uid: { $in: uids } })
        .select("uid todaysStepCount")
        .lean()
    : [];
  const phoneByUid = new Map(
    users.map((u) => [u.uid, Math.max(0, Number(u.todaysStepCount || 0))]),
  );
  const today = dayKey();

  const enriched = rows.map((row) => {
    const target = Math.max(0, Number(row.targetSteps || 0));
    const isOpen =
      (row.status === "active" || row.status === "registered") &&
      row.completionOrder == null;
    let coveredSteps = isOpen
      ? liveCovered(row as Parameters<typeof liveCovered>[0], phoneByUid.get(row.uid) || 0, today)
      : Number(row.leaderboardSteps || row.accumulatedSteps || 0);
    if (target > 0) {
      coveredSteps = Math.min(coveredSteps, target);
    }
    return { row, coveredSteps, targetSteps: target };
  });

  enriched.sort((a, b) => {
    const aDone = a.row.completionOrder != null;
    const bDone = b.row.completionOrder != null;
    if (aDone && bDone) {
      return Number(a.row.completionOrder) - Number(b.row.completionOrder);
    }
    if (aDone) return -1;
    if (bDone) return 1;
    return b.coveredSteps - a.coveredSteps;
  });

  const eventStartMs = new Date(
    event.liveAt || event.startDate || 0,
  ).getTime();

  return enriched.map((item, index) => {
    const { row, coveredSteps } = item;
    const startMs = new Date(
      row.activatedAt || row.enrolledAt || event.liveAt || event.startDate || 0,
    ).getTime();
    const completedMs = row.completedAt
      ? new Date(row.completedAt).getTime()
      : null;
    const endMs =
      completedMs != null && Number.isFinite(completedMs) && completedMs > 0
        ? completedMs
        : Date.now();
    const durationSeconds =
      Number.isFinite(startMs) && startMs > 0
        ? Math.max(0, Math.floor((endMs - startMs) / 1000))
        : Number.isFinite(eventStartMs) && eventStartMs > 0
          ? Math.max(0, Math.floor((endMs - eventStartMs) / 1000))
          : null;

    return {
      rank: index + 1,
      uid: row.uid,
      status: row.status,
      coveredSteps,
      score: coveredSteps,
      steps: coveredSteps,
      label: "steps",
      distanceKm: row.distanceKm,
      targetSteps: item.targetSteps || row.targetSteps || null,
      completionOrder: row.completionOrder,
      ticketLabel: row.ticketLabel,
      completedAt: row.completedAt || null,
      activatedAt: row.activatedAt || null,
      enrolledAt: row.enrolledAt || null,
      lastSyncedAt: row.lastSyncedAt || null,
      finishDurationSeconds: durationSeconds,
      isFinished: row.completionOrder != null || row.status === "completed",
    };
  });
};

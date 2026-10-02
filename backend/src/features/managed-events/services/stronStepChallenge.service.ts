// Virtual Step Challenge: per-event, per-day step ledger.
// Phone User.todaysStepCount is only an INPUT. Each participation keeps its own
// day-anchor + credited steps so events never share / dump the full phone total.

import StronParticipation from "../models/stronParticipation.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { dayKey } from "../../../utils/stronTime.util.js";
import {
  eventDayStepsMap,
  eventDayAnchorsMap,
  eventDayGain,
  sumEventDaySteps,
  writeEventDaySteps,
} from "../../../utils/stronSteps.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { StepParticipation, ParticipationLike } from "../types/index.js";


const asParticipationLike = (participation: StepParticipation): ParticipationLike =>
  participation;

/** Daily goal from participation, with ticket fallback when older rows lack it. */
const resolveDailyStepTarget = (
  participation: StepParticipation,
  event: ServiceParams | null = null,
) => {
  const fromP = Number(participation?.dailyStepTarget || 0);
  if (fromP > 0) return fromP;
  const tickets = Array.isArray(event?.ticketTypes) ? event.ticketTypes : [];
  const matched =
    tickets.find(
      (t) =>
        t &&
        participation?.ticketTypeId &&
        String(t.id) === String(participation.ticketTypeId),
    ) || tickets[0];
  return Math.max(0, Number(matched?.dailyStepTarget || 0));
};

const asDayMap = (raw: unknown): Map<string, number> => {
  if (!raw) return new Map();
  if (raw instanceof Map) return raw;
  if (typeof raw === "object") {
    return new Map(
      Object.entries(raw).map(([k, v]) => [String(k), Math.max(0, Number(v) || 0)]),
    );
  }
  return new Map();
};

/**
 * Per-event phone anchor for an IST day.
 * Steps credited today for THIS event = max(0, phoneToday − anchor).
 *
 * - Join day: prefer enrollment baselineSteps when > 0.
 * - First sync of any later day: anchor = phone total at first sight so we never
 *   dump an entire pre-existing phone day (the 16.2k bug) as "event progress".
 * - Further walks the same day increase gain as phone total rises.
 */
const getOrCreateDayAnchor = (
  participation: StepParticipation,
  today: string,
  rawToday: unknown,
) => {
  const raw = Math.max(0, Math.floor(Number(rawToday) || 0));
  if (!(participation.eventDayAnchors instanceof Map)) {
    participation.eventDayAnchors = asDayMap(participation.eventDayAnchors);
  }
  const anchors = participation.eventDayAnchors as Map<string, number>;

  if (anchors.has(today)) {
    return Math.max(0, Number(anchors.get(today)) || 0);
  }

  let anchor = raw;
  if (
    participation.baselineDayKey === today &&
    Number(participation.baselineSteps || 0) > 0
  ) {
    // Joined earlier today — only steps after enroll count.
    anchor = Math.min(raw, Math.max(0, Number(participation.baselineSteps) || 0));
  } else if (
    participation.baselineDayKey === today &&
    Number(participation.baselineSteps || 0) === 0
  ) {
    // Bad 0 baseline on join day — re-anchor to current phone total.
    anchor = raw;
    participation.baselineSteps = raw;
  } else {
    // New calendar day (or missing baseline): first-sight anchor.
    anchor = raw;
  }

  anchors.set(today, anchor);
  participation.markModified?.("eventDayAnchors");
  return anchor;
};

/** Event-only steps for one IST day — re-export util for callers that import the service. */
export { eventDayGain };

const successfulKeySet = (participation: StepParticipation) => {
  const list = Array.isArray(participation.successfulDayKeys)
    ? participation.successfulDayKeys
    : [];
  return new Set(list.map(String));
};

/**
 * Award a successful day once when event-day gain meets the daily target.
 * Live path — does not wait for midnight settle.
 */
const maybeAwardSuccessfulDay = (
  participation: StepParticipation,
  day: string,
  gain: number,
) => {
  const target = Number(participation.dailyStepTarget || 0);
  if (target <= 0 || gain < target) return false;
  const keys = successfulKeySet(participation);
  if (keys.has(day)) return false;
  keys.add(day);
  participation.successfulDayKeys = [...keys];
  participation.successfulDays = keys.size;
  return true;
};

const rollForwardPriorDay = (participation: StepParticipation, priorDay: string) => {
  if (!priorDay || participation.lastSettledDayKey === priorDay) return;
  const map = eventDayStepsMap(asParticipationLike(participation));
  const gain = Math.max(0, Number(map.get(priorDay) || 0));
  participation.accumulatedSteps = Number(participation.accumulatedSteps || 0) + gain;
  participation.lastSettledDayKey = priorDay;
  maybeAwardSuccessfulDay(participation, priorDay, gain);

  const required = Number(participation.requiredDays || 0);
  if (required > 0 && Number(participation.successfulDays || 0) >= required) {
    participation.status = "completed";
    participation.completedAt = participation.completedAt || new Date();
  }
};

/** Real-time sync: write today into this event's day ledger only. */
export const applyLive = async ({
  participation,
  todaysStepCount,
  event = null,
}: ServiceParams & {
  participation: StepParticipation;
  todaysStepCount?: number;
  event?: ServiceParams | null;
}) => {
  if (participation.status !== "active" && participation.status !== "registered") {
    return;
  }
  if (!Number(participation.dailyStepTarget || 0)) {
    const target = resolveDailyStepTarget(participation, event);
    if (target > 0) participation.dailyStepTarget = target;
  }

  const today = dayKey();
  const rawToday = Math.max(0, Math.floor(Number(todaysStepCount) || 0));

  const prior = participation.trackingDayKey;
  if (prior && prior !== today) {
    rollForwardPriorDay(participation, prior);
  }

  // Establishes this event’s day anchor (idempotent).
  const anchor = getOrCreateDayAnchor(participation, today, rawToday);
  const gain = Math.max(0, rawToday - anchor);

  const mapBefore = eventDayStepsMap(asParticipationLike(participation));
  const prevGain = mapBefore.has(today)
    ? Math.max(0, Number(mapBefore.get(today)) || 0)
    : null;

  const wouldAward =
    Number(participation.dailyStepTarget || 0) > 0 &&
    gain >= Number(participation.dailyStepTarget || 0) &&
    !successfulKeySet(participation).has(today);

  // Throttle tiny noise; always write when awarding.
  if (
    prevGain != null &&
    Math.abs(gain - prevGain) < 5 &&
    participation.trackingDayKey === today &&
    !wouldAward
  ) {
    return;
  }

  writeEventDaySteps(asParticipationLike(participation), today, gain);
  participation.trackingDayKey = today;
  maybeAwardSuccessfulDay(participation, today, gain);
  participation.leaderboardSteps = sumEventDaySteps(asParticipationLike(participation));
  participation.lastSyncedAt = new Date();

  // Complete the challenge as soon as required successful days are hit (live).
  const required = Number(participation.requiredDays || 0);
  if (
    required > 0 &&
    Number(participation.successfulDays || 0) >= required &&
    String(participation.status) !== "completed"
  ) {
    participation.status = "completed";
    participation.completedAt = participation.completedAt || new Date();
  }

  await participation.save?.();
};

export const settleParticipationDay = async ({
  participation,
  rawSteps,
  settleDayKey,
}: ServiceParams & {
  participation: ServiceParams;
  rawSteps?: number;
  settleDayKey: string;
}) => {
  const p = participation as StepParticipation;
  if (p.status !== "active") {
    return;
  }
  if (p.lastSettledDayKey === settleDayKey) {
    return;
  }

  const map = eventDayStepsMap(asParticipationLike(p));
  let gained;
  if (map.has(settleDayKey)) {
    gained = Math.max(0, Number(map.get(settleDayKey)) || 0);
  } else {
    const anchor = getOrCreateDayAnchor(p, settleDayKey, rawSteps);
    gained = Math.max(0, Math.floor(Number(rawSteps) || 0) - anchor);
    writeEventDaySteps(asParticipationLike(p), settleDayKey, gained);
  }

  p.accumulatedSteps = Number(p.accumulatedSteps || 0) + gained;
  p.leaderboardSteps = sumEventDaySteps(asParticipationLike(p));
  p.lastSettledDayKey = settleDayKey;
  p.trackingDayKey = settleDayKey;
  maybeAwardSuccessfulDay(p, settleDayKey, gained);

  const required = Number(p.requiredDays || 0);
  if (required > 0 && Number(p.successfulDays || 0) >= required) {
    p.status = "completed";
    p.completedAt = new Date();
  }

  await p.save?.();
};

export const getProgress = (
  participation: StepParticipation,
  todaySteps = 0,
  event: ServiceParams | null = null,
) => {
  const todayKey = dayKey();
  const target = resolveDailyStepTarget(participation, event);
  const rawToday = Math.max(0, Math.floor(Number(todaySteps) || 0));

  // Prefer ledger written by applyLive; fall back to live recompute from anchor.
  const map = eventDayStepsMap(asParticipationLike(participation));
  let todayGained;
  if (map.has(todayKey)) {
    todayGained = Math.max(0, Number(map.get(todayKey)) || 0);
  } else {
    todayGained = eventDayGain(asParticipationLike(participation), rawToday, todayKey);
  }

  const successful = Number(participation.successfulDays || 0);
  const hasKey =
    Array.isArray(participation.successfulDayKeys) &&
    participation.successfulDayKeys.includes(todayKey);
  const effectiveSuccessful =
    target > 0 && todayGained >= target && !hasKey
      ? Math.max(successful, successful + 1)
      : successful;

  const eventTotal = Math.max(sumEventDaySteps(asParticipationLike(participation)), todayGained);

  return {
    format: "virtual_step_challenge",
    status: participation.status,
    successfulDays: effectiveSuccessful,
    requiredDays: (participation.requiredDays as number | undefined) ?? null,
    dailyStepTarget: target || null,
    todaySteps: todayGained,
    todayGained,
    coveredSteps: todayGained,
    totalEventSteps: eventTotal,
    todayTargetMet: target > 0 && todayGained >= target,
    percent:
      participation.requiredDays != null &&
      Number(participation.requiredDays) > 0
        ? Math.min(
            100,
            Math.round(
              (effectiveSuccessful / Number(participation.requiredDays)) * 100,
            ),
          )
        : target > 0
          ? Math.min(100, Math.round((todayGained / target) * 100))
          : 0,
    lastSyncedAt: participation.lastSyncedAt || null,
  };
};

export const buildLeaderboard = async (event: ServiceParams) => {
  // Include every enrolled participant so the board is never empty when people joined.
  const rows = await StronParticipation.find({
    eventKey: event.key,
    status: { $nin: ["cancelled", "refunded"] },
  }).lean();

  const uids = [...new Set(rows.map((r) => r.uid).filter(Boolean).map(String))];
  const users = uids.length
    ? await UserModel.find({ uid: { $in: uids } })
        .select("uid todaysStepCount")
        .lean()
    : [];
  const phoneByUid = new Map(
    users.map((u) => [String(u.uid), Math.max(0, Number(u.todaysStepCount || 0))]),
  );
  const today = dayKey();
  const dayTargetDefault = resolveDailyStepTarget(
    { dailyStepTarget: null, ticketTypeId: null },
    event,
  );

  const enriched = rows.map((row) => {
    const stepRow = row as unknown as StepParticipation;
    const uid = String(row.uid);
    const rawToday = phoneByUid.get(uid) || 0;
    const dayTarget = resolveDailyStepTarget(stepRow, event) || dayTargetDefault || 0;
    const map = eventDayStepsMap(asParticipationLike(stepRow));
    // Fix: pass full participation (not the map alone) so anchors resolve correctly.
    const anchors = eventDayAnchorsMap(asParticipationLike(stepRow));

    let todayGain = 0;
    if (map.has(today)) {
      todayGain = Math.max(0, Number(map.get(today)) || 0);
      if (
        !anchors.has(today) &&
        rawToday > 0 &&
        todayGain >= rawToday * 0.9
      ) {
        // Ignore pre-track phone dumps, but still list the user.
        todayGain = 0;
      }
    } else if (anchors.has(today)) {
      todayGain = eventDayGain(asParticipationLike(stepRow), rawToday, today);
    } else if (
      row.baselineDayKey === today &&
      Number(row.baselineSteps || 0) > 0
    ) {
      todayGain = Math.max(0, rawToday - Number(row.baselineSteps));
    } else {
      // No ledger yet: show 0 today (not full phone). Row still listed.
      todayGain = 0;
    }

    // Cap daily line under the name at the daily target.
    if (dayTarget > 0) {
      todayGain = Math.min(todayGain, dayTarget);
    }

    const ledgerWithoutToday = [...map.entries()].reduce((acc, [k, v]) => {
      if (k === today) return acc;
      return acc + Math.max(0, Number(v) || 0);
    }, 0);
    const totalSteps = ledgerWithoutToday + todayGain;

    let successfulDays = Number(row.successfulDays || 0);
    const keys = Array.isArray(row.successfulDayKeys)
      ? row.successfulDayKeys.map(String)
      : [];
    if (dayTarget > 0 && todayGain >= dayTarget && !keys.includes(today)) {
      successfulDays += 1;
    }

    return {
      row,
      uid,
      todayGain,
      totalSteps: Math.max(0, totalSteps),
      successfulDays: Math.max(0, successfulDays),
    };
  });

  enriched.sort((a, b) => {
    if (b.successfulDays !== a.successfulDays) {
      return b.successfulDays - a.successfulDays;
    }
    if (b.todayGain !== a.todayGain) {
      return b.todayGain - a.todayGain;
    }
    return b.totalSteps - a.totalSteps;
  });

  return enriched.map((item, index) => {
    const { row, todayGain, totalSteps, successfulDays } = item;
    return {
      rank: index + 1,
      uid: row.uid,
      status: row.status || "registered",
      successfulDays,
      requiredDays: row.requiredDays || null,
      dailyStepTarget: resolveDailyStepTarget(row as unknown as StepParticipation, event) || dayTargetDefault || null,
      todaySteps: todayGain,
      steps: todayGain,
      totalSteps,
      totalEventSteps: totalSteps,
      leaderboardSteps: totalSteps,
      accumulatedSteps: Number(row.accumulatedSteps || 0),
      lastSyncedAt: row.lastSyncedAt || null,
      score: successfulDays,
      label: successfulDays > 0 ? `${successfulDays} days` : "steps",
      ticketLabel: row.ticketLabel || null,
    };
  });
};

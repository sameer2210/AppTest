// Shared event-scoped step math for STRON managed formats.
// Global User.todaysStepCount stays separate; every format routes through these helpers.

import type { ServiceParams } from "../types/service.util.js";

type ParticipationLike = ServiceParams & {
  baselineDayKey?: string | null;
  baselineSteps?: number | null;
  accumulatedSteps?: number | null;
  lastSettledDayKey?: string | null;
  eventDaySteps?: Map<string, number> | Record<string, unknown> | null;
  eventDayAnchors?: Map<string, number> | Record<string, unknown> | null;
  markModified?: (path: string) => void;
};

/** Steps credited for an IST day after subtracting join/activation baseline once. */
export const gainedForDay = (
  p: ParticipationLike,
  rawToday: number | string | null | undefined,
  forDayKey: string | null | undefined,
) => {
  const raw = Math.max(0, Number(rawToday) || 0);
  if (forDayKey && forDayKey === p.baselineDayKey) {
    return Math.max(0, raw - Number(p.baselineSteps || 0));
  }
  return raw;
};

/**
 * Settled accumulated steps plus today's unsettled gain (marathon / step totals).
 * If today was already settled, do not double-count.
 */
export const liveCovered = (
  p: ParticipationLike,
  rawToday: number | string | null | undefined,
  forDayKey: string | null | undefined,
) => {
  const settled = Number(p.accumulatedSteps || 0);
  if (p.lastSettledDayKey && p.lastSettledDayKey === forDayKey) {
    return settled;
  }
  return settled + gainedForDay(p, rawToday, forDayKey);
};

/** Same gain math for KOTH / Face Off member sides that store baselineSteps on the member. */
export const memberGainedSteps = (
  member: ServiceParams | null | undefined,
  rawToday: number | string | null | undefined,
) => Math.max(0, Number(rawToday || 0) - Number(member?.baselineSteps || 0));

/** Normalize Map / plain object / lean snapshot of per-day event steps. */
export const eventDayStepsMap = (p: ParticipationLike | null | undefined) => {
  const raw = p?.eventDaySteps;
  if (!raw) return new Map<string, number>();
  if (raw instanceof Map) return raw as Map<string, number>;
  if (typeof raw === "object") {
    return new Map(
      Object.entries(raw).map(([k, v]) => [String(k), Math.max(0, Number(v) || 0)]),
    );
  }
  return new Map<string, number>();
};

/** Normalize eventDayAnchors Map / plain object. */
export const eventDayAnchorsMap = (p: ParticipationLike | null | undefined) => {
  const raw = p?.eventDayAnchors;
  if (!raw) return new Map<string, number>();
  if (raw instanceof Map) return raw as Map<string, number>;
  if (typeof raw === "object") {
    return new Map(
      Object.entries(raw).map(([k, v]) => [String(k), Math.max(0, Number(v) || 0)]),
    );
  }
  return new Map<string, number>();
};

/**
 * Event-only steps for one IST day from phone total + that participation's day anchor.
 * Does not create anchors (read-only). Missing anchor → 0 until applyLive runs
 * (or join-day baseline applies).
 */
export const eventDayGain = (
  participation: ParticipationLike,
  rawToday: number | string | null | undefined,
  today: string,
) => {
  const raw = Math.max(0, Math.floor(Number(rawToday) || 0));
  const anchors = eventDayAnchorsMap(participation);
  if (anchors.has(today)) {
    return Math.max(0, raw - Math.max(0, Number(anchors.get(today)) || 0));
  }
  if (
    participation?.baselineDayKey === today &&
    Number(participation?.baselineSteps || 0) > 0
  ) {
    return Math.max(0, raw - Number(participation.baselineSteps));
  }
  return 0;
};

/** Event-only steps credited for a specific IST day (from ledger or live gain). */
export const eventStepsForDay = (
  p: ParticipationLike,
  rawToday: number | string | null | undefined,
  forDayKey: string,
) => {
  const map = eventDayStepsMap(p);
  if (map.has(forDayKey)) {
    return Math.max(0, Number(map.get(forDayKey)) || 0);
  }
  if (p?.lastSettledDayKey === forDayKey) {
    return 0;
  }
  return gainedForDay(p, rawToday, forDayKey);
};

/** Sum of all event-day ledger entries (true per-event total, not phone total). */
export const sumEventDaySteps = (p: ParticipationLike) => {
  let total = 0;
  for (const v of eventDayStepsMap(p).values()) {
    total += Math.max(0, Number(v) || 0);
  }
  return total;
};

/**
 * Write today's event-credited steps into the per-event day ledger.
 * Mutates participation (caller saves). Returns the day gain.
 */
export const writeEventDaySteps = (
  p: ParticipationLike,
  dayKey: string,
  steps: number | string | null | undefined,
) => {
  const gain = Math.max(0, Math.floor(Number(steps) || 0));
  if (!p.eventDaySteps || !(p.eventDaySteps instanceof Map)) {
    p.eventDaySteps = eventDayStepsMap(p);
  }
  (p.eventDaySteps as Map<string, number>).set(dayKey, gain);
  p.markModified?.("eventDaySteps");
  return gain;
};

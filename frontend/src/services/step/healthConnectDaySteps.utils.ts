import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";
import { DEFAULT_MAX_HEALTH_JUMP_ABOVE_PEDOMETER } from "./stepHealthMerge.utils";

/** ~brisk walk/run upper bound — matches server sync guard. */
const MAX_STEPS_PER_MINUTE = 200;
const MIDNIGHT_GRACE_STEPS = 500;

export type StepsIntervalRecord = {
  count?: number;
  startTime?: string;
  endTime?: string;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Max steps physically plausible since local midnight. */
export const maxPlausibleStepsSinceMidnight = (now: Date = new Date()): number => {
  const dayStart = startOfDay(now);
  const elapsedMinutes = Math.max(1, (now.getTime() - dayStart.getTime()) / 60_000);
  return Math.min(
    MAX_DAILY_STEPS,
    Math.floor(elapsedMinutes * MAX_STEPS_PER_MINUTE + MIDNIGHT_GRACE_STEPS),
  );
};

/**
 * Clip a multi-day Health Connect Steps record to a calendar window.
 * Google Fit batches often span several days — proportional clip fixes inflation.
 */
export const clipStepsRecordToWindow = (
  record: StepsIntervalRecord,
  windowStart: Date,
  windowEnd: Date,
): number => {
  const count = Math.max(0, Math.floor(Number(record.count) || 0));
  if (count <= 0 || !record.startTime || !record.endTime) return 0;

  const recordStart = new Date(record.startTime);
  const recordEnd = new Date(record.endTime);
  if (Number.isNaN(recordStart.getTime()) || Number.isNaN(recordEnd.getTime())) return 0;

  const overlapStart = new Date(Math.max(recordStart.getTime(), windowStart.getTime()));
  const overlapEnd = new Date(Math.min(recordEnd.getTime(), windowEnd.getTime()));
  if (overlapStart >= overlapEnd) return 0;

  const recordMs = recordEnd.getTime() - recordStart.getTime();
  if (recordMs <= 0) return count;

  const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
  return Math.max(0, Math.round(count * (overlapMs / recordMs)));
};

/**
 * Pick the trustworthy Health Connect total when aggregate vs clipped records disagree.
 * Aggregate inflates when Google Fit stores multi-day batches.
 */
export const pickTrustworthyHealthDaySteps = (
  aggregateSteps: number,
  clippedSteps: number,
): number => {
  const aggregate = sanitizeDailySteps(aggregateSteps);
  const clipped = sanitizeDailySteps(clippedSteps);

  if (clipped <= 0) return aggregate;
  if (aggregate <= 0) return clipped;

  // Classic multi-day dump: aggregate much higher than time-clipped record sum.
  if (aggregate > clipped + 50 && aggregate > clipped * 1.12) {
    return clipped;
  }

  // Both agree — take the higher (sources may register slightly differently).
  return Math.max(aggregate, clipped);
};

/**
 * Final guard before merging HC/Google Fit into STRON's live pedometer count.
 * Only blocks clear multi-day dumps — does NOT force pedometer when Fit is
 * merely ahead by > 50 (production rule: divergence > 50 → adopt Fit).
 */
export const sanitizeHealthConnectTodaySteps = (
  rawHealthSteps: number,
  pedometerSteps: number,
  options?: { now?: Date; isToday?: boolean },
): number => {
  const hc = sanitizeDailySteps(rawHealthSteps);
  const ped = sanitizeDailySteps(pedometerSteps);
  if (hc <= 0) return 0;

  const isToday = options?.isToday !== false;
  const now = options?.now ?? new Date();

  if (isToday) {
    const timeCap = maxPlausibleStepsSinceMidnight(now);

    // Morning multi-day batch dump: pedometer still near-zero but HC shows thousands.
    if (ped < 300 && hc > 2_500 && hc > timeCap) {
      return 0;
    }

    // HC far beyond walkable time since midnight AND pedometer never corroborated.
    if (hc > timeCap * 1.5 && ped < 300 && hc > ped + DEFAULT_MAX_HEALTH_JUMP_ABOVE_PEDOMETER) {
      return ped > 0 ? ped : 0;
    }
  }

  return hc;
};

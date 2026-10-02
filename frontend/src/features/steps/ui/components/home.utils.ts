import type { EventEnrollment } from "@/models/event";
import { getLiveEventSteps, resolveTargetDistanceKm } from "@/utils/stepHelpers";

const DISTANCE_KM_PER_STEP = 0.00075;
const RECENT_COMPLETION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;


export const formatCompactNumber = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return abs.toLocaleString();
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const stepsToKm = (steps: number) => steps * DISTANCE_KM_PER_STEP;

const isCompletedStatus = (status?: string) => {
  const normalized = status?.trim().toLowerCase() ?? "";
  return normalized === "completed" || normalized === "finished";
};

const sortDate = (event: EventEnrollment) =>
  parseDate(event.updatedAt) ??
  parseDate(event.completedAt) ??
  parseDate(event.expiresAt) ??
  parseDate(event.enrolledAt) ??
  new Date(0);

const isActiveEvent = (event: EventEnrollment, now: Date, currentSteps: number) => {
  if (event.status?.trim().toLowerCase() !== "active") return false;
  const targetKm = resolveTargetDistanceKm(event);
  const coveredKm = stepsToKm(getLiveEventSteps(event, currentSteps));
  if (coveredKm >= targetKm) return false;
  const expiresAt = parseDate(event.expiresAt);
  if (!expiresAt) return true;
  return expiresAt.getTime() > now.getTime();
};

const completionReferenceDate = (event: EventEnrollment, currentSteps?: number) => {
  const completedAt = parseDate(event.completedAt);
  if (completedAt) return completedAt;
  if (isCompletedStatus(event.status)) {
    return parseDate(event.updatedAt) ?? parseDate(event.expiresAt) ?? parseDate(event.enrolledAt);
  }
  if (currentSteps != null) {
    const targetKm = resolveTargetDistanceKm(event);
    const coveredKm = stepsToKm(getLiveEventSteps(event, currentSteps));
    if (coveredKm >= targetKm) {
      return parseDate(event.updatedAt) ?? parseDate(event.enrolledAt);
    }
  }
  return null;
};

export type HomeEventCardState =
  | { kind: "active"; event: EventEnrollment }
  | { kind: "completed"; event: EventEnrollment; isPaid: boolean }
  | { kind: "comeback" }
  | { kind: "new-user" };

export const isEnrollmentPaid = (event: EventEnrollment) => (event.paymentAmount ?? 0) > 0;

export const resolveHomeEventCardState = (
  enrollments: EventEnrollment[],
  currentSteps: number,
): HomeEventCardState => {
  const marathonEvents = enrollments.filter((event) => event.eventKey === "marathon");
  const now = new Date();

  const activeEvents = marathonEvents
    .filter((event) => isActiveEvent(event, now, currentSteps))
    .sort((a, b) => sortDate(b).getTime() - sortDate(a).getTime());
  if (activeEvents[0]) {
    return { kind: "active", event: activeEvents[0] };
  }

  const recentCompleted = marathonEvents
    .filter((event) => {
      if (isActiveEvent(event, now, currentSteps)) return false;
      const hasCompletedSignal =
        !!event.completedAt ||
        isCompletedStatus(event.status) ||
        stepsToKm(getLiveEventSteps(event, currentSteps)) >= resolveTargetDistanceKm(event);
      if (!hasCompletedSignal) return false;
      const completedAt = completionReferenceDate(event, currentSteps);
      if (!completedAt) return false;
      const elapsed = now.getTime() - completedAt.getTime();
      return elapsed >= 0 && elapsed < RECENT_COMPLETION_WINDOW_MS;
    })
    .sort((a, b) => {
      const aTime = parseDate(a.completedAt) ?? sortDate(a);
      const bTime = parseDate(b.completedAt) ?? sortDate(b);
      return (bTime?.getTime() ?? 0) - (aTime?.getTime() ?? 0);
    });

  if (recentCompleted[0]) {
    const event = recentCompleted[0];
    return { kind: "completed", event, isPaid: isEnrollmentPaid(event) };
  }

  if (marathonEvents.length > 0) {
    let latestEndedAt: Date | null = null;
    for (const event of marathonEvents) {
      const endedAt =
        completionReferenceDate(event) ??
        parseDate(event.expiresAt) ??
        parseDate(event.eliminatedAt) ??
        parseDate(event.cancelledAt);
      if (!endedAt || endedAt.getTime() > now.getTime()) continue;
      if (!latestEndedAt || endedAt.getTime() > latestEndedAt.getTime()) {
        latestEndedAt = endedAt;
      }
    }
    if (latestEndedAt && now.getTime() - latestEndedAt.getTime() >= RECENT_COMPLETION_WINDOW_MS) {
      return { kind: "comeback" };
    }
  }

  return { kind: "new-user" };
};

export const formatEventTitle = (eventKey: string) => {
  if (!eventKey.trim()) return "Event";
  return eventKey
    .split("_")
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join(" ");
};

export const formatDistanceProgress = (coveredKm: number, targetKm: number) => {
  const normalizedTarget = targetKm > 0 ? targetKm : 1;
  const useMeters = normalizedTarget < 1;
  const formatDistance = (km: number) =>
    useMeters ? `${Math.round(km * 1000)} m` : `${km % 1 === 0 ? km.toFixed(0) : km.toFixed(1)} km`;
  return `${formatDistance(Math.max(0, coveredKm))}/${formatDistance(normalizedTarget)}`;
};

export const formatEventEndText = (expiresAt?: string) => {
  const date = parseDate(expiresAt);
  if (!date) return "Active Event";
  return `Ends ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
};

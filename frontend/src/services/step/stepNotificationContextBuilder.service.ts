import type { EventEnrollment } from "@/models/event";
import { getLiveEventSteps, resolveTargetDistanceKm } from "@/utils/stepHelpers";
import { DISTANCE_KM_PER_STEP } from "./stepNotificationFormatter.service";
import type { StepNotificationContext } from "@/models/stepNotification.types";

/** Parity: lib/services/step_notification_context_builder.dart (clan/squad battle cases removed). */
const RECENT_COMPLETION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const parseDate = (value?: string) => {
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

const isActiveMarathon = (event: EventEnrollment, now: Date, currentSteps: number) => {
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

const remainingKm = (event: EventEnrollment, currentSteps: number) => {
  const targetKm = resolveTargetDistanceKm(event);
  const coveredKm = stepsToKm(getLiveEventSteps(event, currentSteps));
  return Math.max(0, Math.min(targetKm, targetKm - coveredKm));
};

export const buildStepNotificationContext = ({
  enrolledEvents,
  liveSteps,
}: {
  enrolledEvents: EventEnrollment[];
  liveSteps: number;
}): StepNotificationContext => {
  const marathonEvents = enrolledEvents.filter((event) => event.eventKey === "marathon");
  const now = new Date();

  const activeMarathons = marathonEvents
    .filter((event) => isActiveMarathon(event, now, liveSteps))
    .sort((a, b) => sortDate(b).getTime() - sortDate(a).getTime());
  if (activeMarathons.length > 0) {
    return {
      notificationCase: "marathonLive",
      marathonRemainingKm: remainingKm(activeMarathons[0], liveSteps),
    };
  }

  const recentCompleted = marathonEvents
    .filter((event) => {
      if (isActiveMarathon(event, now, liveSteps)) return false;
      const hasCompletedSignal =
        event.completedAt != null ||
        isCompletedStatus(event.status) ||
        stepsToKm(getLiveEventSteps(event, liveSteps)) >= resolveTargetDistanceKm(event);
      if (!hasCompletedSignal) return false;
      const completedAt = completionReferenceDate(event, liveSteps);
      if (!completedAt) return false;
      const elapsed = now.getTime() - completedAt.getTime();
      return elapsed >= 0 && elapsed < RECENT_COMPLETION_WINDOW_MS;
    })
    .sort((a, b) => {
      const aTime = parseDate(a.completedAt) ?? sortDate(a);
      const bTime = parseDate(b.completedAt) ?? sortDate(b);
      return bTime.getTime() - aTime.getTime();
    });

  if (recentCompleted.length > 0) {
    return { notificationCase: "marathonFinished" };
  }

  return { notificationCase: "idle" };
};

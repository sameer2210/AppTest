import type { EventEnrollment } from "@/models/event";

export const getLiveEventSteps = (event: EventEnrollment, currentSteps: number): number => {
  const recordedSteps = event.leaderboardSteps ?? 0;
  const baselineSteps = event.enrollmentStartTodaySteps ?? 0;

  if (event.status === "completed") {
    return recordedSteps > 0 ? recordedSteps : currentSteps;
  }

  if (baselineSteps <= 0) {
    return currentSteps > recordedSteps ? currentSteps : recordedSteps;
  }

  const liveContribution = currentSteps >= baselineSteps ? currentSteps - baselineSteps : 0;
  return liveContribution > recordedSteps ? liveContribution : recordedSteps;
};

export const resolveTargetDistanceKm = (event: EventEnrollment): number => {
  const modelDistance = event.distanceKm ?? 0;
  if (modelDistance > 0) return modelDistance;

  const planLabel = event.planLabel?.trim().toLowerCase() ?? "";
  const parsedValue = Number.parseFloat(planLabel.replace(/[^0-9.]/g, ""));
  if (!parsedValue || parsedValue <= 0) return 1;

  const isMeters = planLabel.includes("m") && !planLabel.includes("km");
  return isMeters ? parsedValue / 1000 : parsedValue;
};

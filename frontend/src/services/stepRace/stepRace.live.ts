import type { StepRace } from "@/models/stepRace";

export type LiveStepRaceStatus = {
  userSteps: number;
  opponentSteps: number;
  isLeading: boolean;
  leadDiff: number;
  targetSteps: number;
  opponentName: string;
  elapsedSeconds: number;
};

/** Same target resolution as Ongoing-Step-Race. */
export const resolveRaceTargetSteps = (race: Pick<StepRace, "targetSteps">): number => {
  if (race.targetSteps && race.targetSteps !== 200) return race.targetSteps;
  return 1000;
};

/**
 * Live race math shared by Home + step notification (mirrors Ongoing-Step-Race).
 * `baselineSteps` is today's steps at race start (race.startSteps), when known.
 */
export const computeLiveStepRaceStatus = (
  race: StepRace,
  todaySteps: number,
  nowMs: number = Date.now(),
): LiveStepRaceStatus => {
  const targetSteps = resolveRaceTargetSteps(race);
  const baseline =
    race.startSteps !== undefined && race.startSteps > 0
      ? race.startSteps
      : Math.max(0, todaySteps - (race.userSteps || 0));

  const stepsWalkedInRace = Math.max(0, todaySteps - baseline);
  const userSteps = Math.min(
    targetSteps,
    Math.max(0, Math.max(race.userSteps || 0, stepsWalkedInRace)),
  );

  const startMs = race.startTime ? new Date(race.startTime).getTime() : nowMs;
  const elapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));

  const opponentPaceSeconds =
    race.opponentPaceSeconds || race.opponent?.shadowData?.bestPaceSeconds || 600;
  const opponentSteps = Math.min(
    targetSteps,
    Math.round((elapsedSeconds / opponentPaceSeconds) * targetSteps),
  );

  const leadDiff = userSteps - opponentSteps;
  const isLeading = userSteps >= opponentSteps;
  const opponentName = race.opponent?.username?.trim() || "Opponent";

  return {
    userSteps,
    opponentSteps,
    isLeading,
    leadDiff,
    targetSteps,
    opponentName,
    elapsedSeconds,
  };
};

export const formatLiveRaceLeadLabel = (status: LiveStepRaceStatus): string => {
  const abs = Math.abs(status.leadDiff).toLocaleString("en-US");
  if (status.isLeading) {
    return status.leadDiff === 0
      ? `Tied with ${status.opponentName}`
      : `Leading by ${abs} vs ${status.opponentName}`;
  }
  return `Trailing by ${abs} vs ${status.opponentName}`;
};

/** Compact subtitle for the ongoing step notification event layout. */
export const formatLiveRaceNotificationSubtitle = (status: LiveStepRaceStatus): string => {
  const you = status.userSteps.toLocaleString("en-US");
  const target = status.targetSteps.toLocaleString("en-US");
  const lead = formatLiveRaceLeadLabel(status);
  return `${lead} · ${you}/${target}`;
};

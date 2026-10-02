import { StyleSheet, View } from "react-native";
import type { StronLeaderboardEntry, StronProgress } from "@/models/stronManaged/participation";
import { formatTimeLeftLabel } from "../shared/formatters";
import { LiveLeaderboardTable, LiveTrackingCard, mapLeaderboardRows } from "./liveLeaderboard";

type Props = {
  entries: StronLeaderboardEntry[];
  myUid?: string | null;
  progress?: StronProgress | null;
  myRank?: number | null;
  endDate?: string | null;
};

const formatStepsShort = (steps: number) => {
  const n = Math.max(0, Number(steps) || 0);
  if (n >= 1000) {
    const k = n / 1000;
    const label = k % 1 === 0 ? String(k.toFixed(0)) : String(k.toFixed(1));
    return `${label}k steps`;
  }
  return `${n.toLocaleString("en-IN")} steps`;
};

/**
 * Virtual Step Challenge leaderboard — Live Tracking (today’s steps) + Successful Days board.
 */
const StepChallengeLeaderboardTab = ({ entries, myUid, progress, myRank, endDate }: Props) => {
  const dailyTarget = Number(progress?.dailyStepTarget) || 0;
  // Prefer todayGained (event-only). never fall back to coveredSteps multi-day dumps.
  const todaySteps = Math.max(
    0,
    Number(
      progress?.todayGained != null
        ? progress.todayGained
        : progress?.todaySteps != null
          ? (progress as { todaySteps?: number }).todaySteps
          : 0,
    ) || 0,
  );
  const successfulDays = Number(progress?.successfulDays) || 0;
  const requiredDays = Number(progress?.requiredDays) || 0;
  const percent =
    dailyTarget > 0 ? Math.min(100, Math.max(0, (todaySteps / dailyTarget) * 100)) : 0;

  const timeLeft = formatTimeLeftLabel(endDate);
  const daysLeftLabel =
    !timeLeft || timeLeft === "Ended"
      ? timeLeft
      : `${timeLeft}${/left/i.test(timeLeft) ? "" : " Left"}`;

  const subtitle = [
    requiredDays > 0
      ? `Successful Days ${successfulDays}/${requiredDays}`
      : `Successful Days ${successfulDays}`,
    myRank != null && myRank > 0 ? `Rank #${myRank}` : null,
    daysLeftLabel,
  ]
    .filter(Boolean)
    .join(" • ");

  const rows = mapLeaderboardRows(entries, {
    formatMetric: (e) =>
      String(e.successfulDays != null ? Number(e.successfulDays) : Number(e.score) || 0),
    formatSubtitle: (e) => {
      // Prefer today's event-credited steps when present (not multi-day phone dump).
      const steps = Number((e as { todaySteps?: number }).todaySteps ?? e.steps ?? 0);
      return `${steps.toLocaleString("en-IN")} steps today`;
    },
  });

  return (
    <View style={styles.container}>
      <LiveTrackingCard
        subtitle={subtitle || "Syncing your steps…"}
        currentLabel={formatStepsShort(todaySteps)}
        targetLabel={dailyTarget > 0 ? formatStepsShort(dailyTarget) : "— steps"}
        progressPercent={percent}
        currentTone="muted"
      />
      <LiveLeaderboardTable
        title="Overall Leaderboard"
        metricHeader="Successful Days"
        rows={rows}
        myUid={myUid}
        emptyText="No rankings yet. Hit your daily target to climb."
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 14,
  },
});

export default StepChallengeLeaderboardTab;

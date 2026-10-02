import { StyleSheet, View } from "react-native";
import type { StronLeaderboardEntry, StronProgress } from "@/models/stronManaged/participation";
import { formatCleanKm, formatFinishDuration, formatTimeLeftLabel } from "../shared/formatters";
import { LiveLeaderboardTable, LiveTrackingCard, mapLeaderboardRows } from "./liveLeaderboard";

type Props = {
  entries: StronLeaderboardEntry[];
  myUid?: string | null;
  progress?: StronProgress | null;
  myRank?: number | null;
  endDate?: string | null;
  targetDistanceKm?: number | null;
};

const MarathonLeaderboardTab = ({
  entries,
  myUid,
  progress,
  myRank,
  endDate,
  targetDistanceKm,
}: Props) => {
  const rawTarget = Number(progress?.targetSteps) || 0;
  const coveredSteps = Math.min(
    Number(progress?.coveredSteps) || 0,
    rawTarget > 0 ? rawTarget : Number.POSITIVE_INFINITY,
  );
  const targetSteps = rawTarget;
  const percent = Math.min(
    100,
    Math.max(
      0,
      Number(progress?.percent) || (targetSteps > 0 ? (coveredSteps / targetSteps) * 100 : 0),
    ),
  );

  const coveredKmLabel = `${formatCleanKm(coveredSteps, false)} KM`;
  const targetKmFromSteps = targetSteps > 0 ? formatCleanKm(targetSteps, true) : null;
  const targetKmLabel = `${
    targetDistanceKm && targetDistanceKm > 0
      ? String(targetDistanceKm % 1 === 0 ? targetDistanceKm : targetDistanceKm.toFixed(1))
      : targetKmFromSteps || "—"
  } KM`;

  const timeLeft = formatTimeLeftLabel(endDate);
  const rank = myRank && myRank > 0 ? myRank : null;
  const subtitle = [
    timeLeft ? `Time Left ${timeLeft}` : null,
    rank != null ? `Rank #${rank}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");

  const rows = mapLeaderboardRows(entries, {
    formatMetric: (e) =>
      e.finishDurationSeconds != null
        ? formatFinishDuration(e.finishDurationSeconds)
        : e.isFinished
          ? "Finished"
          : "In Progress",
    formatSubtitle: (e) => {
      const target = Number(e.targetSteps) || 0;
      let steps = Number(e.steps ?? e.score) || 0;
      if (target > 0) steps = Math.min(steps, target);
      return `${steps.toLocaleString("en-IN")} Steps`;
    },
  });

  return (
    <View style={styles.container}>
      <LiveTrackingCard
        subtitle={subtitle || "Syncing your steps…"}
        currentLabel={coveredKmLabel}
        targetLabel={targetKmLabel}
        progressPercent={percent}
        currentTone="accent"
      />
      <LiveLeaderboardTable
        title="Overall Leaderboard"
        metricHeader="Time to Finish"
        rows={rows}
        myUid={myUid}
        emptyText="No rankings yet. Keep moving!"
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

export default MarathonLeaderboardTab;

import { StyleSheet, View } from "react-native";
import type { StronLeaderboardEntry, StronProgress } from "@/models/stronManaged/participation";
import {
  formatKingClock,
  LiveHighlightPersonCard,
  LiveLeaderboardTable,
  LiveYourScoreCard,
  mapLeaderboardRows,
} from "./liveLeaderboard";
import { pickTodayKing } from "../shared/duelHelpers";

type Props = {
  entries: StronLeaderboardEntry[];
  progress?: StronProgress | null;
  myUid?: string | null;
  username?: string | null;
  avatarUri?: string | null;
  myRank?: number | null;
};

/**
 * King of the Hill leaderboard tab — matches Figma live screen:
 * Your Score → Current King → Overall Leaderboard (King Time).
 */
const KotHLeaderboardTab = ({ entries, progress, myUid, username, avatarUri, myRank }: Props) => {
  const todayKing = pickTodayKing(progress || null);

  const myTodaySeconds =
    progress?.todayKingSeconds ??
    progress?.todayGroup?.standings?.find((s) => s.uid === myUid)?.kingSeconds ??
    0;
  const kingSeconds =
    progress?.liveKingSeconds != null
      ? Number(progress.liveKingSeconds)
      : Number(progress?.totalKingSeconds || 0) + Number(myTodaySeconds || 0);

  const scoreSubtitle = `King Time ${formatKingClock(kingSeconds)}${
    myRank != null ? ` with Rank ${myRank}` : ""
  }`;

  const rows = mapLeaderboardRows(entries, {
    formatMetric: (e) => formatKingClock(e.score),
    formatSubtitle: (e) => {
      const steps = Number(e.steps ?? 0);
      if (steps > 0) return `${steps.toLocaleString("en-IN")} Steps`;
      return e.label ? String(e.label) : null;
    },
  });

  return (
    <View style={styles.container}>
      <LiveYourScoreCard username={username} avatarUri={avatarUri} subtitle={scoreSubtitle} />

      <LiveHighlightPersonCard
        name={
          todayKing.standing?.username ||
          (todayKing.standing?.isBot ? "Opponent" : todayKing.standing ? "Athlete" : null)
        }
        avatarUri={todayKing.standing?.profileImageUrl}
        badgeText={
          todayKing.standing ? `King for ${formatKingClock(todayKing.standing.kingSeconds)}` : ""
        }
        primaryLabel="Steps"
        primaryValue={
          todayKing.standing && todayKing.standing.steps > 0
            ? todayKing.standing.steps.toLocaleString("en-IN")
            : null
        }
        secondaryLabel="Rank"
        secondaryValue={todayKing.standing ? todayKing.rank : null}
        emptyText="Today’s group hasn’t formed yet. Check back after the daily matchup."
      />

      <LiveLeaderboardTable
        title="Leaderboard"
        metricHeader="King Time"
        rows={rows}
        myUid={myUid}
        emptyText="No rankings yet. Stay #1 in your group to earn King Time."
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

export default KotHLeaderboardTab;

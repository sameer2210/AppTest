import { Image, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import type { StronKotHMatch, StronLeaderboardEntry } from "@/models/stronManaged/participation";
import { LiveLeaderboardTable, LiveYourScoreCard, mapLeaderboardRows } from "./liveLeaderboard";

export type FaceOffMatchCard = {
  id: string;
  label: string;
  opponent: string;
  winnerSteps: number;
  didWin?: boolean;
};

type Props = {
  entries: StronLeaderboardEntry[];
  myUid?: string;
  userName?: string;
  userAvatar?: string | null;
  userRank?: number | null;
  /** Cumulative steps / wins line under Your Score. */
  userTotalSteps?: number;
  userTotalWins?: number;
  opponentName?: string | null;
  opponentAvatar?: string | null;
  opponentSteps?: number;
  userMatchSteps?: number;
  timeLeftFormatted?: string | null;
  stepDifference?: number;
  matchCards?: FaceOffMatchCard[];
  /** @deprecated prefer matchCards — kept for call sites that still pass raw matches */
  matches?: StronKotHMatch[];
};

const buildMatchCardsFromRaw = (matches: StronKotHMatch[], myUid?: string): FaceOffMatchCard[] => {
  const completed = matches
    .filter((m) => m.status === "completed" || m.winnerUid)
    .slice()
    .reverse();
  return completed.map((match, idx) => {
    const opponent =
      match.members.find((m) => m.uid !== myUid && !m.isBot) ||
      match.members.find((m) => m.uid !== myUid);
    const winner = match.members.find((m) => m.uid === match.winnerUid);
    return {
      id: match.id,
      label: `Face-off ${idx + 1}`,
      opponent: opponent?.username || (opponent?.isBot ? "Opponent" : "Athlete"),
      winnerSteps: winner?.steps ?? 0,
      didWin: Boolean(myUid && match.winnerUid === myUid),
    };
  });
};

/** Face Off leaderboard — Your Score, live 1v1 VS, Overall Leaderboard, past matchups. */
export const EventLeaderboardTab = ({
  entries,
  myUid,
  userName = "You",
  userAvatar,
  userRank,
  userTotalSteps = 0,
  userTotalWins = 0,
  opponentName,
  opponentAvatar,
  opponentSteps = 0,
  userMatchSteps = 0,
  timeLeftFormatted,
  stepDifference = 0,
  matchCards,
  matches = [],
}: Props) => {
  const userAvatarSource = getProfileImageSource(userAvatar, userName);
  const oppName = opponentName || "Waiting…";
  const oppAvatarSource = getProfileImageSource(opponentAvatar, oppName);

  const clampedDiff = Math.max(-3000, Math.min(3000, stepDifference));
  const dotPercent = Math.min(100, Math.max(0, ((clampedDiff + 3000) / 6000) * 100));

  const absK = Math.abs(stepDifference / 1000);
  const leadText =
    stepDifference === 0
      ? "You’re even — keep pushing"
      : stepDifference > 0
        ? `You are leading by ${absK >= 1 ? `${absK.toFixed(1)}k` : Math.abs(stepDifference)} Steps`
        : `You are losing by ${absK >= 1 ? `${absK.toFixed(1)}k` : Math.abs(stepDifference)} Steps`;

  const cards =
    matchCards && matchCards.length > 0 ? matchCards : buildMatchCardsFromRaw(matches, myUid);

  const rows = mapLeaderboardRows(entries, {
    formatMetric: (e) => String(Number(e.score) || 0),
    formatSubtitle: (e) => {
      const steps = Number(e.steps) || 0;
      return `${steps.toLocaleString("en-IN")} Steps`;
    },
  });

  const scoreSubtitle =
    userRank != null
      ? `Rank #${userRank} with Total wins ${userTotalWins.toLocaleString("en-IN")}${
          userTotalSteps > 0 ? ` · ${userTotalSteps.toLocaleString("en-IN")} steps` : ""
        }`
      : `Total wins ${userTotalWins.toLocaleString("en-IN")}`;

  const hasLiveMatch = Boolean(opponentName || userMatchSteps > 0 || opponentSteps > 0);

  return (
    <View style={styles.container}>
      <LiveYourScoreCard
        title="Your Score"
        username={userName}
        avatarUri={userAvatar}
        subtitle={scoreSubtitle}
      />

      <View style={styles.matchCard}>
        <CustomText style={styles.matchTimeText}>
          {timeLeftFormatted ? `Time Left ${timeLeftFormatted}` : "Today’s Face-Off"}
        </CustomText>

        {hasLiveMatch ? (
          <>
            <View style={styles.versusRow}>
              <View style={styles.playerColumn}>
                <View style={styles.userAvatarWrap}>
                  <Image source={userAvatarSource} style={styles.avatarImg} resizeMode="cover" />
                </View>
                <CustomText style={styles.stepsLabel}>Steps</CustomText>
                <CustomText style={styles.stepsValue}>
                  {userMatchSteps.toLocaleString("en-IN")}
                </CustomText>
                <CustomText style={styles.playerName} numberOfLines={1}>
                  {userName}
                </CustomText>
              </View>

              <View style={styles.vsBadge}>
                <CustomText style={styles.vsText}>VS</CustomText>
              </View>

              <View style={styles.playerColumn}>
                <View style={styles.oppAvatarWrap}>
                  <Image source={oppAvatarSource} style={styles.avatarImg} resizeMode="cover" />
                </View>
                <CustomText style={styles.stepsLabel}>Steps</CustomText>
                <CustomText style={styles.stepsValue}>
                  {opponentSteps.toLocaleString("en-IN")}
                </CustomText>
                <CustomText style={styles.playerName} numberOfLines={1}>
                  {oppName}
                </CustomText>
              </View>
            </View>

            <View style={styles.outcomeRow}>
              <CustomText style={styles.winLabel}>Win</CustomText>
              <CustomText style={styles.leadText}>{leadText}</CustomText>
              <CustomText style={styles.loseLabel}>Lose</CustomText>
            </View>

            <View style={styles.barTrack}>
              <View style={styles.barBase}>
                <View style={styles.barLeft} />
                <View style={styles.barRight} />
              </View>
              <View
                style={[
                  styles.barFill,
                  {
                    left: `${Math.min(50, dotPercent)}%`,
                    width: `${Math.abs(50 - dotPercent)}%`,
                  },
                ]}
              />
              <View
                style={[
                  styles.barDot,
                  {
                    left: `${dotPercent}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.diffLabelsRow}>
              {["3k", "2k", "1k", "-1k", "-2k", "-3k"].map((label) => (
                <CustomText key={label} style={styles.diffLabelText}>
                  {label}
                </CustomText>
              ))}
            </View>
          </>
        ) : (
          <CustomText style={styles.noMatchText}>
            Today’s matchup isn’t ready yet. Check back after pairings go live.
          </CustomText>
        )}
      </View>

      <LiveLeaderboardTable
        title="Overall Leaderboard"
        metricHeader="Total Wins"
        rows={rows}
        myUid={myUid}
        emptyText="No rankings yet. Win today’s Face-Off to climb."
      />

      {cards.length > 0 ? (
        <View style={styles.cardsList}>
          {cards.map((match) => (
            <View
              key={match.id}
              style={styles.historyCard}
            >
              <View style={styles.historyLeft}>
                <CustomText style={styles.historyTitle}>{match.label}</CustomText>
                <CustomText style={styles.historySubtitle}>
                  with {match.opponent}
                </CustomText>
              </View>
              <View style={styles.historyRight}>
                <CustomText style={styles.historyResultLabel}>
                  {match.didWin ? "You won" : "Winner"}
                </CustomText>
                <CustomText style={styles.historySteps}>
                  {match.winnerSteps.toLocaleString("en-IN")} Steps
                </CustomText>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 16,
  },
  matchCard: {
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
  },
  matchTimeText: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(0, 0, 0, 0.8)",
  },
  versusRow: {
    marginBottom: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  playerColumn: {
    flex: 1,
    alignItems: "center",
  },
  userAvatarWrap: {
    width: 64,
    height: 64,
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "#0070FF",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  oppAvatarWrap: {
    width: 64,
    height: 64,
    overflow: "hidden",
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(0, 0, 0, 0.2)",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  stepsLabel: {
    marginTop: 6,
    fontSize: 12,
    color: "rgba(0, 0, 0, 0.6)",
  },
  stepsValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000000",
  },
  playerName: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },
  vsBadge: {
    marginHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  vsText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000000",
  },
  outcomeRow: {
    marginBottom: 8,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  winLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0070FF",
  },
  leadText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(0, 0, 0, 0.8)",
  },
  loseLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FF5C5C",
  },
  barTrack: {
    position: "relative",
    marginVertical: 4,
    height: 32,
    width: "100%",
    justifyContent: "center",
  },
  barBase: {
    height: 6,
    width: "100%",
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  barLeft: {
    flex: 1,
    backgroundColor: "rgba(0, 112, 255, 0.3)",
  },
  barRight: {
    flex: 1,
    backgroundColor: "#FF5C5C",
  },
  barFill: {
    position: "absolute",
    height: 6,
    borderRadius: 999,
    backgroundColor: "#FF5C5C",
  },
  barDot: {
    position: "absolute",
    zIndex: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#FF5C5C",
    marginLeft: -8,
    top: "50%",
    marginTop: -8,
  },
  diffLabelsRow: {
    marginTop: 4,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  diffLabelText: {
    fontSize: 11,
    color: "rgba(0, 0, 0, 0.6)",
  },
  noMatchText: {
    paddingVertical: 24,
    textAlign: "center",
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.5)",
  },
  cardsList: {
    gap: 10,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181A",
    padding: 16,
  },
  historyLeft: {
    flex: 1,
    paddingRight: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  historySubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
  },
  historyRight: {
    alignItems: "flex-end",
  },
  historyResultLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  historySteps: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default EventLeaderboardTab;

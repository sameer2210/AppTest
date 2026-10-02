import { View, StatusBar, StyleSheet, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fontTextStyles } from "@/utils/typography";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { SCREEN_CONTENT_PADDING_BOTTOM, screenContentContainerStyle } from "@/utils/screen-layout";
import { useRouter } from "expo-router";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronLeaderboardEntry } from "@/models/stronManaged/participation";
import { formatTimeLeftLabel } from "../../../shared/formatters";
import {
  formatKingClock,
  LiveHighlightPersonCard,
  LiveLeaderboardTable,
  mapLeaderboardRows,
} from "../../liveLeaderboard";

type Props = {
  event: StronEvent;
  leaderboard: StronLeaderboardEntry[];
};

const KotHLeaderboard = ({ event, leaderboard }: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const topPlayer = leaderboard.length > 0 ? leaderboard[0] : null;
  const timeLeft = formatTimeLeftLabel(event.endDate);

  const rows = mapLeaderboardRows(leaderboard, {
    formatMetric: (e) => formatKingClock(e.score),
    formatSubtitle: (e) => {
      const steps = Number(e.steps ?? 0);
      return steps > 0 ? `${steps.toLocaleString("en-IN")} Steps` : null;
    },
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <PressableScale onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#D9D9D9" />
        </PressableScale>
        <CustomText style={styles.headerTitle}>Leaderboard</CustomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 40,
            gap: 14,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <CustomText style={styles.eventTitle}>{event.title || "King of the Hill"}</CustomText>
          <CustomText style={styles.eventDate}>
            {event.startDate
              ? new Date(event.startDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                })
              : "TBD"}
            {event.endDate
              ? ` - ${new Date(event.endDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                })}`
              : ""}
          </CustomText>
        </View>

        {topPlayer ? (
          <LiveHighlightPersonCard
            name={topPlayer.username || "Athlete"}
            avatarUri={topPlayer.profileImageUrl}
            badgeText={`King for ${formatKingClock(topPlayer.score)}`}
            primaryLabel="Steps"
            primaryValue={
              Number(topPlayer.steps) > 0 ? Number(topPlayer.steps).toLocaleString("en-IN") : null
            }
            secondaryLabel="Rank"
            secondaryValue={topPlayer.rank || 1}
          />
        ) : null}

        {timeLeft ? <CustomText style={styles.timeLeft}>Time Left {timeLeft}</CustomText> : null}

        <LiveLeaderboardTable
          title="Leaderboard"
          metricHeader="King Time"
          rows={rows}
          emptyText="No participants yet."
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090909" },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTitle: {
    ...fontTextStyles.twentyTwoNormalBlack,
    color: "#FFFFFF",
  },
  eventTitle: {
    ...fontTextStyles.twentyEightBoldBlack,
    color: "#FFFFFF",
  },
  eventDate: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
    marginTop: 4,
  },
  timeLeft: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});

export default KotHLeaderboard;

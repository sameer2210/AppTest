import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, View, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING_WIDE,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { useAppDispatch } from "@/store/hooks";
import { fetchEvent, fetchLeaderboard } from "../../model/managedEvents.thunks";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronLeaderboardEntry } from "@/models/stronManaged/participation";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { LeaderboardScreenSkeleton } from "@/components/skeletons";
import { formatFinishDuration } from "../shared/formatters";
import { LIVE_LEADERBOARD_POLL_MS } from "../components/liveLeaderboard";
import { href } from "@/navigation/href";
import KotHLeaderboard from "../components/organize/components/KotHLeaderboard";
import FaceOffLeaderboard from "../components/organize/components/FaceOffLeaderboard";

type LeaderboardRow = {
  rank: number;
  username: string;
  stepsText: string;
  timeToFinish: string;
  successfulDays: string;
  profileImageUrl?: string;
  uid: string;
};

const timeAgo = (iso?: string | Date | null) => {
  if (!iso) return "Just now";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Just now";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const OrganizeLeaderboardScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const { key } = useLocalSearchParams<{ key: string }>();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<StronEvent | null>(null);
  const [leaderboard, setLeaderboard] = useState<StronLeaderboardEntry[]>([]);

  const load = useCallback(async () => {
    if (!key) {
      setLoading(false);
      return;
    }
    try {
      const [ev, board] = await Promise.all([
        dispatch(fetchEvent(key)).unwrap().catch(() => null),
        dispatch(fetchLeaderboard(key)).unwrap().catch(() => []),
      ]);
      setEvent(ev);
      setLeaderboard(board);
    } catch {
      // error handled gracefully
    } finally {
      setLoading(false);
    }
  }, [dispatch, key]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    // Stop live polling once the event is no longer running.
    if (event?.status !== "live") return;
    const timer = setInterval(() => {
      void load();
    }, LIVE_LEADERBOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [event?.status, load]);

  const isStepChallenge = event?.format === "virtual_step_challenge";

  const displayLeaderboard: LeaderboardRow[] = useMemo(() => {
    return leaderboard.map((item, idx) => {
      const stepCount = Number(
        (item as { todaySteps?: number }).todaySteps ??
          item.steps ??
          (item as any).totalSteps ??
          (item as any).leaderboardSteps ??
          0,
      );
      const days =
        (item as any).successfulDays != null ? String((item as any).successfulDays) : undefined;
      const timeToFinish =
        item.finishDurationSeconds != null
          ? formatFinishDuration(item.finishDurationSeconds)
          : item.isFinished
            ? "Finished"
            : item.lastSyncedAt
              ? `Synced ${timeAgo(item.lastSyncedAt)}`
              : "In Progress";
      const successfulDaysMetric =
        item.successfulDays != null
          ? String(item.successfulDays)
          : days || (isStepChallenge ? String(item.score ?? 0) : "0");

      return {
        rank: item.rank || idx + 1,
        username: item.username || `Athlete ${idx + 1}`,
        stepsText: isStepChallenge
          ? `${stepCount.toLocaleString("en-IN")} steps today`
          : `${stepCount.toLocaleString("en-IN")} Steps`,
        timeToFinish,
        successfulDays: successfulDaysMetric,
        profileImageUrl: item.profileImageUrl ?? undefined,
        uid: item.uid || `user-${idx}`,
      };
    });
  }, [leaderboard, isStepChallenge]);

  if (loading) {
    return (
      <View style={styles.root}>
        <LeaderboardScreenSkeleton />
      </View>
    );
  }

  if (event?.format === "face_off") {
    return <FaceOffLeaderboard event={event} leaderboard={leaderboard} />;
  }

  if (event?.format === "king_of_the_hill") {
    return <KotHLeaderboard event={event} leaderboard={leaderboard} />;
  }

  return (
    <View style={styles.root}>
      {/* Glass Top Back Button */}
      <View style={[styles.backButtonContainer, { paddingTop: topInset + 8 }]}>
        <PressableScale
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </PressableScale>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingTop: 0,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Main Dark Card */}
        <View style={styles.mainCard}>
          {/* Title */}
          <CustomText style={[headingTextStyles.twentyEightBoldBlack, styles.cardTitle]}>
            Leaderboard
          </CustomText>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.colRank]}>
              Rank
            </CustomText>
            <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.colName]}>
              Name
            </CustomText>
            <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.colMetric]}>
              {event?.format === "marathon" ? "Time to Finish" : "Successful Days"}
            </CustomText>
          </View>

          {/* Leaderboard List */}
          {displayLeaderboard.length === 0 ? (
            <CustomText style={[fontTextStyles.sixteenNormalBlack, styles.emptyText]}>
              No participants yet.
            </CustomText>
          ) : (
            displayLeaderboard.map((row, index) => (
              <Animated.View
                key={`${row.uid}-${index}`}
                entering={FadeInDown.duration(280).delay(index * 20)}
              >
                <PressableScale
                  onPress={() => {
                    router.push({
                      pathname: href.app.participantDetail,
                      params: {
                        eventKey: event?.key || key || "",
                        name: row.username,
                        registrationId: row.uid,
                        avatarUid: row.uid,
                        avatarUri: row.profileImageUrl,
                      },
                    });
                  }}
                  style={styles.tableRow}
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${row.username}`}
                >
                  <CustomText style={[fontTextStyles.eighteenSemiBoldBlack, styles.rankNumber]}>
                    #{row.rank}
                  </CustomText>
                  <View style={styles.participantCell}>
                    <View style={styles.avatarWrap}>
                      <Image
                        source={getProfileImageSource(row.profileImageUrl, row.uid)}
                        style={styles.avatarImg}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={styles.flex1}>
                      <CustomText
                        style={[fontTextStyles.fifteenMediumBlack, styles.usernameText]}
                        numberOfLines={1}
                      >
                        {row.username}
                      </CustomText>
                      <CustomText style={[fontTextStyles.thirteenNormalBlack, styles.stepsText]}>
                        {row.stepsText}
                      </CustomText>
                    </View>
                  </View>
                  <CustomText style={[fontTextStyles.fifteenMediumBlack, styles.metricText]}>
                    {event?.format === "marathon"
                      ? row.timeToFinish
                      : row.successfulDays || row.timeToFinish}
                  </CustomText>
                </PressableScale>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090909" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButtonContainer: {
    paddingTop: SCREEN_CONTENT_PADDING_TOP,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 16,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  mainCard: {
    backgroundColor: "#191919",
    borderRadius: 24,
    padding: 20,
  },
  cardTitle: {
    color: "#FFFFFF",
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  colRank: {
    color: "rgba(255, 255, 255, 0.6)",
    width: 48,
  },
  colName: {
    color: "rgba(255, 255, 255, 0.6)",
    flex: 1,
  },
  colMetric: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.4)",
    marginVertical: 32,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  rankNumber: {
    color: "#086CFF",
    width: 48,
  },
  participantCell: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  flex1: {
    flex: 1,
  },
  usernameText: {
    color: "#FFFFFF",
  },
  stepsText: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  metricText: {
    color: "#086CFF",
    textAlign: "right",
  },
});

export default OrganizeLeaderboardScreen;

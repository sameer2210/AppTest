import React, { useMemo } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, Image, ScrollView, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_CONTENT_PADDING_BOTTOM, screenContentContainerStyle } from "@/utils/screen-layout";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronLeaderboardEntry } from "@/models/stronManaged/participation";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { formatCount, formatLabelForEvent } from "../../../shared/formatters";
import { images } from "@/utils/images";
import { shareEvent } from "@/utils/shareEvent";
import { useAppSelector } from "@/store/hooks";

type Props = {
  event: StronEvent;
  leaderboard: StronLeaderboardEntry[];
};

const formatHeroDate = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long" });
};

/**
 * Figma — Face Off organizer / contest Overall Leaderboard.
 */
const FaceOffLeaderboard = ({ event, leaderboard }: Props) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const user = useAppSelector((s) => s.auth.user);

  const organizerName = user?.username?.trim() || user?.email?.split("@")[0] || "Organizer";
  const organizerAvatar = user?.profileImageUrl || null;
  const formatLabel = formatLabelForEvent(event.format);
  const registrationCount = event.registrationCount ?? leaderboard.length;

  const statusBadge = event.soldOut
    ? "Sold Out"
    : event.status === "live"
      ? "Started"
      : event.status === "published"
        ? "Open"
        : event.status === "completed"
          ? "Ended"
          : "Started";

  const dateLabel = [
    formatHeroDate(event.startDate),
    event.endDate ? formatHeroDate(event.endDate) : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const rows = useMemo(() => leaderboard, [leaderboard]);

  const onShare = async () => {
    await shareEvent({
      title: event.title,
      eventKey: event.key,
      intro: `Check the leaderboard for ${event.title} on STRON!`,
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingTop: topInset + 12,
            paddingBottom: Math.max(insets.bottom, SCREEN_CONTENT_PADDING_BOTTOM) + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </PressableScale>
          <PressableScale onPress={onShare} style={styles.shareBtn}>
            <CustomText style={styles.shareText}>Share</CustomText>
          </PressableScale>
        </View>

        <LinearGradient
          colors={["#4BA3FF", "#086CFF", "#0450C8"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.heroCard}
        >
          <Image
            source={images.MANAGED_EVENTS.FACE_OFF}
            style={styles.heroArt}
            resizeMode="contain"
          />

          <View style={styles.statusBadge}>
            <CustomText style={styles.statusBadgeText}>{statusBadge}</CustomText>
          </View>

          <View style={styles.heroContent}>
            <CustomText style={styles.heroTitle} numberOfLines={3}>
              {event.title || "Face-Off"}
            </CustomText>
            <CustomText style={styles.heroDate}>{dateLabel}</CustomText>

            <View style={styles.heroFooter}>
              <View style={styles.organizerBlock}>
                <View style={styles.organizerAvatar}>
                  {organizerAvatar ? (
                    <Image source={{ uri: organizerAvatar }} style={styles.avatarFill} />
                  ) : (
                    <Ionicons name="person" size={16} color="#333" />
                  )}
                </View>
                <View style={styles.organizerTextCol}>
                  <CustomText style={styles.organizerEyebrow}>{formatLabel} Organized By</CustomText>
                  <CustomText style={styles.organizerName} numberOfLines={1}>
                    {organizerName}
                  </CustomText>
                </View>
              </View>
              <View style={styles.countBlock}>
                <Ionicons name="people" size={16} color="#FFFFFF" />
                <CustomText style={styles.countText}>
                  {formatCount(registrationCount).replace("k", "K")}
                </CustomText>
              </View>
            </View>
          </View>
        </LinearGradient>

        <CustomText style={styles.sectionTitle}>Overall Leaderboard</CustomText>

        <View style={styles.tableHeader}>
          <CustomText style={[styles.colLabel, styles.rankCol]}>Rank</CustomText>
          <CustomText style={[styles.colLabel, styles.nameCol]}>Name</CustomText>
          <CustomText style={[styles.colLabel, styles.winsCol]}>Total Wins</CustomText>
        </View>

        {rows.length === 0 ? (
          <CustomText style={styles.emptyText}>No participants yet.</CustomText>
        ) : (
          rows.map((row, index) => {
            const isYou = Boolean(user?.uid && row.uid === user.uid);
            const displayName = isYou ? "You" : row.username || "Athlete";
            const stepsLabel =
              typeof row.steps === "number" ? `${row.steps.toLocaleString("en-IN")} Steps` : null;

            return (
              <Animated.View
                key={row.uid}
                entering={FadeInDown.duration(280).delay(index * 35)}
                style={styles.row}
              >
                <CustomText style={[styles.rankText, styles.rankCol]}>#{row.rank}</CustomText>
                <View style={[styles.nameBlock, styles.nameCol]}>
                  <View style={styles.avatar}>
                    <Image
                      source={getProfileImageSource(row.profileImageUrl, row.uid)}
                      style={styles.avatarFill}
                    />
                  </View>
                  <View style={styles.nameTextCol}>
                    <CustomText style={styles.username} numberOfLines={1}>
                      {displayName}
                    </CustomText>
                    {stepsLabel ? <CustomText style={styles.stepsSub}>{stepsLabel}</CustomText> : null}
                  </View>
                </View>
                <CustomText style={[styles.winsText, styles.winsCol]}>{row.score}</CustomText>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    height: 36,
    paddingHorizontal: 22,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  heroCard: {
    borderRadius: 28,
    minHeight: 220,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    marginBottom: 28,
  },
  heroArt: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.28,
    transform: [{ scale: 1.15 }],
  },
  statusBadge: {
    position: "absolute",
    top: 22,
    right: 18,
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#000",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 1,
    paddingRight: 72,
  },
  heroTitle: {
    ...fontTextStyles.thirtySixSemiBoldBlack,
    color: "#FFFFFF",
  },
  heroDate: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255,255,255,0.92)",
    marginTop: 6,
  },
  heroFooter: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingRight: 0,
  },
  organizerBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarFill: { width: "100%", height: "100%" },
  organizerTextCol: { flex: 1 },
  organizerEyebrow: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.85)",
  },
  organizerName: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    marginTop: 2,
  },
  countBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  sectionTitle: {
    ...fontTextStyles.size24SemiBoldBlack,
    color: "#FFFFFF",
    marginBottom: 18,
  },
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  colLabel: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255,255,255,0.45)",
  },
  rankCol: { width: 52 },
  nameCol: { flex: 1 },
  winsCol: { width: 78, textAlign: "right" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  rankText: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#2A80FF",
  },
  nameBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#333",
    overflow: "hidden",
  },
  nameTextCol: { flex: 1, paddingRight: 8 },
  username: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  stepsSub: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  winsText: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#2A80FF",
  },
  emptyText: {
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginTop: 40,
  },
});

export default FaceOffLeaderboard;

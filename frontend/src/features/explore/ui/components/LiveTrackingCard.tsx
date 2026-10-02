import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";

interface LiveTrackingCardProps {
  avgPace?: string;
  timeLeft?: string;
  rank?: number;
  currentDistance?: string;
  totalDistance?: string;
  progressPercentage?: number;
  subtitle?: string;
}

const LiveTrackingCard = ({
  avgPace,
  timeLeft,
  rank = 0,
  currentDistance = "0 steps",
  totalDistance = "—",
  progressPercentage = 0,
  subtitle,
}: LiveTrackingCardProps) => {
  const clamped = Math.max(0, Math.min(100, Number(progressPercentage) || 0));
  const meta =
    subtitle ||
    [
      avgPace ? `Avg Pace ${avgPace}` : null,
      timeLeft ? `Time Left ${timeLeft}` : null,
      rank > 0 ? `Rank #${rank}` : null,
    ]
      .filter(Boolean)
      .join("  •  ");

  return (
    <View style={styles.cardSection}>
      <CustomText style={styles.liveTrackingTitle}>Live Tracking</CustomText>
      {meta ? <CustomText style={styles.liveTrackingSub}>{meta}</CustomText> : null}

      <View style={styles.progressRow}>
        <CustomText style={styles.progressLeft}>{currentDistance}</CustomText>
        <CustomText style={styles.progressRight}>{totalDistance}</CustomText>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${clamped}%` }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  liveTrackingTitle: {
    ...fontTextStyles.size24NormalBlack,
    color: "#000000",
    marginBottom: 2,
  },
  liveTrackingSub: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#666666",
    marginBottom: 20,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressLeft: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#888888",
  },
  progressRight: {
    ...fontTextStyles.size24NormalBlack,
    color: "#000000",
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#086CFF",
    borderRadius: 4,
  },
});

export default LiveTrackingCard;

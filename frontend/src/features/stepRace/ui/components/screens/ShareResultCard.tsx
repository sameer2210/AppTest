import React, { forwardRef } from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";

export type ShareResultCardProps = {
  isWon?: boolean;
  leadDiff?: number;
  finalPace?: string;
  paceDiff?: string;
  opponentName?: string;
  opponentAvatar?: any;
  userAvatar?: any;
  wins?: number;
  losses?: number;
  rivalryHistory?: ("win" | "loss")[];
};

export const ShareResultCard = forwardRef<View, ShareResultCardProps>(
  (
    {
      isWon = true,
      leadDiff = 50,
      finalPace = "04:28",
      paceDiff = "12% Faster",
      opponentName = "Harshit",
      opponentAvatar,
      userAvatar,
      wins = 4,
      losses = 3,
      rivalryHistory,
    },
    ref,
  ) => {
    // Generate 7 dynamic rivalry bars matching actual win/loss history
    const totalRivalryBars = 7;
    const bars: string[] = [];

    if (rivalryHistory && rivalryHistory.length > 0) {
      for (let i = 0; i < totalRivalryBars; i++) {
        if (i < rivalryHistory.length) {
          bars.push(rivalryHistory[i] === "win" ? "#2DE441" : "#FF5C5C");
        } else {
          bars.push("rgba(255, 255, 255, 0.15)");
        }
      }
    } else {
      const safeWins = Math.max(0, wins || 0);
      const safeLosses = Math.max(0, losses || 0);
      for (let i = 0; i < totalRivalryBars; i++) {
        if (i < safeWins) {
          bars.push("#2DE441"); // Green for Win
        } else if (i < safeWins + safeLosses) {
          bars.push("#FF5C5C"); // Red for Loss
        } else {
          bars.push("rgba(255, 255, 255, 0.15)"); // Neutral for unused slots
        }
      }
    }

    const formattedDiff = leadDiff >= 0 ? `+${leadDiff}` : `${leadDiff}`;

    return (
      <View
        ref={ref}
        collapsable={false}
        style={styles.container}
      >
        <LinearGradient
          colors={["#1E6DF5", "#0B3C9E", "#030E26", "#010512"]}
          locations={[0, 0.35, 0.75, 1]}
          style={styles.gradient}
        >
          {/* Header Row: Title & WIN/LOSS Badge */}
          <View style={styles.headerRow}>
            <CustomText
              text="1K STEPS RACE"
              style={[fontTextStyles.bold, styles.headerTitle]}
            />

            <View style={styles.badge}>
              <CustomText
                text={isWon ? "WIN" : "LOSS"}
                style={[
                  fontTextStyles.bold,
                  styles.badgeText,
                  { color: isWon ? "#2DE441" : "#FF5C5C" },
                ]}
              />
            </View>
          </View>

          {/* Lead Section */}
          <View style={styles.leadSection}>
            <CustomText
              text={isWon ? "YOUR LEAD" : "OPPONENT LEAD"}
              style={[
                fontTextStyles.bold,
                styles.leadBadge,
                { color: isWon ? "#2DE441" : "#FF5C5C" },
              ]}
            />

            <View style={styles.leadStepsRow}>
              <CustomText
                text={formattedDiff}
                adjustsFontSizeToFit
                numberOfLines={1}
                style={[
                  fontTextStyles.bold,
                  styles.diffText,
                  formattedDiff.length > 4 ? styles.diffTextSmall : styles.diffTextLarge,
                  { color: isWon ? "#2DE441" : "#FF5C5C" },
                ]}
              />
              <CustomText
                text="steps"
                style={[fontTextStyles.bold, styles.stepsUnit]}
              />
            </View>
          </View>

          {/* Final Pace Card */}
          <View style={styles.paceCard}>
            <View>
              <CustomText text="Final Pace" style={[fontTextStyles.medium, styles.paceLabel]} />
              <CustomText text={finalPace} style={[fontTextStyles.bold, styles.paceValue]} />
            </View>

            <View style={styles.paceBadge}>
              <CustomText text={paceDiff} style={[fontTextStyles.medium, styles.paceDiffText]} />
            </View>
          </View>

          {/* Versus & Rivalry Card */}
          <View style={styles.versusCard}>
            <View style={styles.versusRow}>
              {/* You */}
              <View style={styles.avatarColumn}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={userAvatar || images.HOME_V2.AVATAR_SAMPLE}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
                <CustomText text="You" style={[fontTextStyles.bold, styles.youText]} />
              </View>

              {/* VS */}
              <CustomText text="VS" style={[fontTextStyles.bold, styles.vsText]} />

              {/* Opponent */}
              <View style={styles.avatarColumn}>
                <View style={styles.avatarWrapper}>
                  <Image
                    source={opponentAvatar || images.HOME_V2.AVATAR_SAMPLE}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>
                <CustomText
                  text={opponentName}
                  numberOfLines={1}
                  style={[fontTextStyles.bold, styles.opponentText]}
                />
              </View>
            </View>

            {/* Rivalry Track */}
            <View style={styles.rivalrySection}>
              <View style={styles.rivalryHeader}>
                <CustomText text="Rivalry" style={[fontTextStyles.regular, styles.rivalryLabel]} />
                <CustomText
                  text={`${wins}W • ${losses}L`}
                  style={[fontTextStyles.bold, styles.rivalryScore]}
                />
              </View>

              <View style={styles.rivalryBarsRow}>
                {bars.map((color, idx) => (
                  <View
                    key={idx}
                    style={[styles.rivalryBar, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

ShareResultCard.displayName = "ShareResultCard";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  gradient: {
    padding: 24,
    paddingTop: 28,
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    ...headingTextStyles.twentyFourBoldWhite,
    color: "#FFFFFF",
  },
  badge: {
    borderRadius: 9999,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    borderWidth: 1,
    borderColor: "#000000",
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  badgeText: {
    ...fontTextStyles.fourteenMediumBlack,
  },
  leadSection: {
    marginTop: 12,
  },
  leadBadge: {
    ...fontTextStyles.fourteenBoldBlack,
    textTransform: "uppercase",
  },
  leadStepsRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginTop: 4,
  },
  diffText: {},
  diffTextSmall: {
    ...headingTextStyles.sixtyFourBoldWhite,
  },
  diffTextLarge: {
    ...headingTextStyles.sixtyFourBoldWhite,
  },
  stepsUnit: {
    ...headingTextStyles.twentyEightBoldWhite,
    color: "#FFFFFF",
    marginLeft: 10,
  },
  paceCard: {
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(2, 11, 32, 0.8)",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paceLabel: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  paceValue: {
    ...headingTextStyles.twentyTwoBoldWhite,
    color: "#FFFFFF",
    marginTop: 2,
  },
  paceBadge: {
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  paceDiffText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255, 255, 255, 0.9)",
  },
  versusCard: {
    marginTop: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(2, 11, 32, 0.8)",
    padding: 20,
  },
  versusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarColumn: {
    alignItems: "center",
    flex: 1,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    overflow: "hidden",
    borderRadius: 48,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#0D244F",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  youText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#397EFF",
    marginTop: 8,
  },
  vsText: {
    ...headingTextStyles.thirtyTwoBoldWhite,
    color: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 24,
  },
  opponentText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FF5C5C",
    marginTop: 8,
  },
  rivalrySection: {
    marginTop: 20,
  },
  rivalryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rivalryLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  rivalryScore: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "rgba(255, 255, 255, 0.8)",
  },
  rivalryBarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  rivalryBar: {
    height: 6,
    flex: 1,
    borderRadius: 9999,
  },
});

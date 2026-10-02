import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import type { LiveStepRaceStatus } from "@/features/stepRace";
import LivePulseDot from "./LivePulseDot";
import LiveLeadBadge from "./LiveLeadBadge";
import LiveVsMeter from "./LiveVsMeter";

type Props = {
  liveRace: LiveStepRaceStatus;
  onPress: () => void;
  userAvatar?: any;
  opponentAvatarUrl?: string | null;
};

/** Full live race status card for Home — matches Ongoing Step Race lead + VS style. */
const HomeLiveRaceCard = ({ liveRace, onPress, userAvatar, opponentAvatarUrl }: Props) => {
  const accent = liveRace.isLeading ? "#2DE441" : "#FF5C5C";
  const leadLabel =
    liveRace.leadDiff === 0 ? "TIED" : liveRace.isLeading ? "YOUR LEAD" : "OPPONENT LEAD";
  const leadDiff =
    liveRace.leadDiff === 0
      ? "0"
      : liveRace.isLeading
        ? `+${Math.abs(liveRace.leadDiff).toLocaleString("en-US")}`
        : `-${Math.abs(liveRace.leadDiff).toLocaleString("en-US")}`;
  const raceTitle =
    liveRace.targetSteps === 1000
      ? "1K STEPS RACE"
      : `${liveRace.targetSteps.toLocaleString("en-US")} STEPS RACE`;
  const statusLine = liveRace.isLeading
    ? liveRace.leadDiff === 0
      ? "It's neck and neck!"
      : "You're ahead right now!"
    : "You're trailing right now!";

  return (
    <PressableScale style={styles.pressable} onPress={onPress}>
      <LinearGradient
        colors={["#041538", "#071428", "#050B16"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.glow} pointerEvents="none" />

        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <LivePulseDot />
            <CustomText style={styles.raceTitle}>
              {raceTitle}
            </CustomText>
          </View>
          <LiveLeadBadge isLeading={liveRace.isLeading} label="LIVE" />
        </View>

        <CustomText style={[styles.leadLabel, { color: accent }]}>
          {leadLabel}
        </CustomText>
        <View style={styles.diffRow}>
          <CustomText style={[styles.diffNumber, { color: accent }]}>
            {leadDiff}
          </CustomText>
          <CustomText style={styles.diffUnit}>steps</CustomText>
        </View>
        <CustomText style={styles.statusLine}>{statusLine}</CustomText>

        <LiveVsMeter
          userSteps={liveRace.userSteps}
          opponentSteps={liveRace.opponentSteps}
          targetSteps={liveRace.targetSteps}
          opponentName={liveRace.opponentName}
          isLeading={liveRace.isLeading}
          userAvatar={userAvatar}
          opponentAvatarUrl={opponentAvatarUrl}
        />

        <View style={styles.footerRow}>
          <CustomText style={styles.footerText}>Tap to open live race</CustomText>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(8, 108, 255, 0.18)",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  raceTitle: {
    ...headingTextStyles.twentyMediumWhite,
    marginLeft: 8,
    color: "#FFFFFF",
  },
  leadLabel: {
    ...fontTextStyles.twelveBoldBlack,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  diffRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "baseline",
  },
  diffNumber: {
    ...headingTextStyles.thirtyTwoBoldWhite,
    fontSize: 42,
    lineHeight: 46,
  },
  diffUnit: {
    ...fontTextStyles.sixteenBoldBlack,
    marginLeft: 8,
    color: "#FFFFFF",
  },
  statusLine: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 4,
  },
  footerRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
  chevronWrap: {
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});

export default memo(HomeLiveRaceCard);


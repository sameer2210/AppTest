import { memo } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { getProfileImageSource } from "@/utils/profileImage.utils";

type Props = {
  userSteps: number;
  opponentSteps: number;
  targetSteps: number;
  opponentName: string;
  isLeading: boolean;
  userAvatar?: any;
  opponentAvatarUrl?: string | null;
};

/** Dual you-vs-opponent faces + continuous dashed track (Ongoing race language). */
const LiveVsMeter = ({
  userSteps,
  opponentSteps,
  targetSteps,
  opponentName,
  userAvatar,
  opponentAvatarUrl,
}: Props) => {
  const safeTarget = Math.max(1, targetSteps);
  const youPct = Math.max(0, Math.min(100, (userSteps / safeTarget) * 100));
  const oppPct = Math.max(0, Math.min(100, (opponentSteps / safeTarget) * 100));
  const oppAvatarSource = getProfileImageSource(opponentAvatarUrl, opponentName);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.participantCol}>
          <View style={styles.avatarBorder}>
            <Image
              source={userAvatar || images.HOME_V2.AVATAR_SAMPLE}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <CustomText style={styles.userLabel}>You</CustomText>
          <CustomText style={styles.stepsText}>
            {userSteps.toLocaleString("en-US")}
          </CustomText>
        </View>

        <CustomText style={styles.vsText}>VS</CustomText>

        <View style={styles.participantCol}>
          <View style={styles.avatarBorder}>
            <Image source={oppAvatarSource} style={styles.avatarImage} resizeMode="cover" />
          </View>
          <CustomText style={styles.opponentLabel} numberOfLines={1}>
            {opponentName}
          </CustomText>
          <CustomText style={styles.stepsText}>
            {opponentSteps.toLocaleString("en-US")}
          </CustomText>
        </View>
      </View>

      <View style={styles.trackRow}>
        <View style={styles.trackContainer}>
          <View style={styles.trackBackground}>
            <Svg height="7" width="100%">
              <Line
                x1="3"
                y1="3.5"
                x2="100%"
                y2="3.5"
                stroke="#FFFFFF"
                strokeWidth="4"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
            </Svg>
          </View>
          <View
            style={[
              styles.oppMarker,
              {
                left: `${oppPct}%`,
                marginLeft: -8,
                top: "50%",
                marginTop: -8,
              },
            ]}
          />
          <View
            style={[
              styles.userMarker,
              {
                left: `${youPct}%`,
                marginLeft: -8,
                top: "50%",
                marginTop: -8,
              },
            ]}
          />
        </View>
        <View style={styles.flagWrap}>
          <Ionicons name="flag-outline" size={18} color="#FFFFFF" />
        </View>
      </View>

      <CustomText style={styles.goalText}>
        {targetSteps.toLocaleString("en-US")} step goal
      </CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  row: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantCol: {
    flex: 1,
    alignItems: "center",
  },
  avatarBorder: {
    width: 56,
    height: 56,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#0D244F",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userLabel: {
    marginTop: 6,
    ...fontTextStyles.twelveBoldBlack,
    color: "#397EFF",
  },
  stepsText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  vsText: {
    marginHorizontal: 8,
    marginBottom: 16,
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FFFFFF",
  },
  opponentLabel: {
    marginTop: 6,
    ...fontTextStyles.twelveBoldBlack,
    color: "#FF5C5C",
  },
  trackRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  trackContainer: {
    position: "relative",
    height: 32,
    flex: 1,
    justifyContent: "center",
  },
  trackBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 7,
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  oppMarker: {
    position: "absolute",
    zIndex: 10,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#FF5C5C",
  },
  userMarker: {
    position: "absolute",
    zIndex: 20,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#397EFF",
  },
  flagWrap: {
    marginLeft: 8,
  },
  goalText: {
    marginTop: 6,
    textAlign: "center",
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.4)",
  },
});

export default memo(LiveVsMeter);


import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Line } from "react-native-svg";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { resolveStepRaceOpponentAvatarSource } from "@/features/stepRace";

type Props = {
  userSteps: number;
  userAvatar?: any;
  userTimeSeconds?: number;
  opponentSteps?: number;
  opponentName: string;
  opponentUid?: string;
  opponentAvatar?: string;
  opponentPaceSeconds?: number;
  targetSteps?: number;
};

export const ActiveRaceVersusCard = ({
  userSteps,
  userAvatar,
  userTimeSeconds = 0,
  opponentSteps,
  opponentName,
  opponentUid,
  opponentAvatar,
  opponentPaceSeconds = 600,
  targetSteps = 1000,
}: Props) => {
  // Use passed opponentSteps if provided, otherwise compute simulated steps based on targetSteps
  const opponentSimulatedSteps =
    opponentSteps !== undefined
      ? Math.min(targetSteps, opponentSteps)
      : Math.min(
        targetSteps,
        Math.round((userTimeSeconds / (opponentPaceSeconds || 600)) * targetSteps),
      );

  const userPercent = Math.min(100, Math.max(0, (userSteps / targetSteps) * 100));
  const oppPercent = Math.min(100, Math.max(0, (opponentSimulatedSteps / targetSteps) * 100));

  const oppAvatarSource = resolveStepRaceOpponentAvatarSource(opponentUid, opponentAvatar);

  return (
    <View style={styles.cardContainer}>
      {/* Avatars & Step Counts */}
      <View style={styles.avatarsRow}>
        {/* You */}
        <View style={styles.column}>
          <View style={styles.avatarWrapper}>
            <Image
              source={userAvatar || images.HOME_V2.AVATAR_SAMPLE}
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>
          <CustomText
            text="You"
            style={[fontTextStyles.bodyBold, styles.userLabel]}
          />
          <CustomText
            text={userSteps.toLocaleString()}
            style={[fontTextStyles.h2, styles.stepsCount]}
            numberOfLines={1}
          />
          <CustomText
            text="steps"
            style={[fontTextStyles.subtext, styles.stepsUnit]}
            numberOfLines={1}
          />
        </View>

        {/* VS */}
        <CustomText
          text="VS"
          style={[fontTextStyles.h1, styles.vsLabel]}
        />

        {/* Opponent — steps only; pace hidden until race ends */}
        <View style={styles.column}>
          <View style={styles.avatarWrapper}>
            <Image source={oppAvatarSource} style={styles.avatarImage} resizeMode="cover" />
          </View>
          <CustomText
            text={opponentName}
            style={[fontTextStyles.bodyBold, styles.oppLabel]}
            numberOfLines={2}
          />
          <CustomText
            text={opponentSimulatedSteps.toLocaleString()}
            style={[fontTextStyles.h2, styles.stepsCount]}
            numberOfLines={1}
          />
          <CustomText
            text="steps"
            style={[fontTextStyles.subtext, styles.stepsUnit]}
            numberOfLines={1}
          />
        </View>
      </View>

      {/* Progress Track Line with Dual Dots & Flag */}
      <View style={styles.progressRow}>
        <View style={styles.trackContainer}>
          {/* Rounded Track Container Pill */}
          <View style={styles.trackPill}>
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

          {/* Opponent Dot (Coral Red) */}
          <View
            style={[
              styles.oppDot,
              {
                left: `${oppPercent}%`,
              },
            ]}
          />

          {/* User Dot (Blue) */}
          <View
            style={[
              styles.userDot,
              {
                left: `${userPercent}%`,
              },
            ]}
          />
        </View>

        {/* Finish Flag Icon */}
        <View style={styles.flagWrapper}>
          <Ionicons name="flag-outline" size={24} color="#FFFFFF" />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#041538",
    padding: 24,
    paddingBottom: 24,
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  avatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  column: {
    alignItems: "center",
    flex: 1,
  },
  avatarWrapper: {
    width: 100,
    height: 100,
    overflow: "hidden",
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#0D244F",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  userLabel: {
    color: "#397EFF",
    marginTop: 10,
  },
  stepsCount: {
    color: "#FFFFFF",
    marginTop: 2,
  },
  stepsUnit: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  vsLabel: {
    color: "#FFFFFF",
    marginHorizontal: 12,
    marginBottom: 8,
  },
  oppLabel: {
    color: "#FF5C5C",
    marginTop: 10,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  progressRow: {
    marginTop: 32,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  trackContainer: {
    flex: 1,
    height: 32,
    justifyContent: "center",
    position: "relative",
  },
  trackPill: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
    justifyContent: "center",
  },
  oppDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FF5C5C",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 10,
    marginLeft: -10,
    top: "50%",
    marginTop: -10,
  },
  userDot: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#397EFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    zIndex: 20,
    marginLeft: -10,
    top: "50%",
    marginTop: -10,
  },
  flagWrapper: {
    marginLeft: 12,
  },
});


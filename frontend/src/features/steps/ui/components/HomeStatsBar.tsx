import { BlurView } from "expo-blur";
import { Image, Platform, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";

type Props = {
  stepsLabel: string;
  distanceLabel: string;
  streakLabel?: string;
};

/** Home top stats — today steps, distance, streak days. */
const HomeStatsBar = ({ stepsLabel, distanceLabel, streakLabel = "0 Days" }: Props) => (
  <View style={styles.shell}>
    <View pointerEvents="none" style={styles.track}>
      <BlurView
        intensity={Platform.OS === "ios" ? 36 : 56}
        tint="dark"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} />
    </View>

    <View style={styles.row}>
      <View style={styles.statGroup}>
        <Image source={images.HOME_V2.ICON_STEPS} style={styles.iconSteps} resizeMode="contain" />
        <CustomText
          numberOfLines={1}
          style={styles.statText}
        >
          {stepsLabel}
        </CustomText>
      </View>

      <View style={styles.statGroup}>
        <Image
          source={images.HOME_V2.ICON_DISTANCE}
          style={styles.iconDistance}
          resizeMode="contain"
        />
        <CustomText
          numberOfLines={1}
          style={styles.statText}
        >
          {distanceLabel}
        </CustomText>
      </View>

      <View style={styles.statGroup}>
        <Image source={images.HOME_V2.ICON_STREAK} style={styles.iconStreak} resizeMode="contain" />
        <CustomText
          numberOfLines={1}
          style={styles.statText}
        >
          {streakLabel}
        </CustomText>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    minHeight: 52,
    width: "100%",
    alignSelf: "center",
    position: "relative",
    justifyContent: "center",
  },
  track: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 58,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(45, 45, 45, 0.35)",
    borderRadius: 58,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 2,
    gap: 4,
  },
  statGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 0,
  },
  iconSteps: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  iconDistance: {
    width: 28,
    height: 28,
    flexShrink: 0,
  },
  iconStreak: {
    width: 26,
    height: 26,
    flexShrink: 0,
  },
  statText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 13,
    flexShrink: 1,
    color: "#FFFFFF",
  },
});

export default HomeStatsBar;

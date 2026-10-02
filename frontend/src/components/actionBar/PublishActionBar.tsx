import { Platform, StyleSheet, View } from "react-native";
import { fontTextStyles } from "@/utils/typography";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Publish uses down arrow; Save / Preview use right. */
  arrow?: "down" | "right";
  /** `transparent` = no glass/blur pill (label + arrow only). */
  variant?: "glass" | "solid" | "blue-black" | "blue" | "transparent";
  circleVariant?: "blue" | "white";
  style?: any;
};

const ArrowCircle = ({
  arrow,
  circleVariant,
}: {
  arrow: "down" | "right";
  circleVariant: "blue" | "white";
}) =>
  circleVariant === "white" ? (
    <View style={styles.whiteCircleIcon}>
      <Ionicons
        name={arrow === "down" ? "arrow-down" : "arrow-forward"}
        size={26}
        color="#0A0A0A"
      />
    </View>
  ) : (
    <LinearGradient
      colors={["#4A92FF", "#1D6EFF", "#0857E4", "#0047D0"]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.blueCircleIcon}
    >
      <Ionicons
        name={arrow === "down" ? "arrow-down" : "arrow-forward"}
        size={26}
        color="#FFFFFF"
      />
    </LinearGradient>
  );

/** Leaderboard-style frosted action bar with glowing blue circle arrow. */
const PublishActionBar = ({
  label,
  onPress,
  disabled,
  loading,
  arrow = "right",
  variant = "glass",
  circleVariant = "blue",
  style,
}: Props) => {
  if (variant === "transparent") {
    return (
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.plainRow, (disabled || loading) && styles.disabled, style]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <CustomText style={styles.btnText}>{loading ? "Please wait…" : label}</CustomText>
        <ArrowCircle arrow={arrow} circleVariant={circleVariant} />
      </PressableScale>
    );
  }

  return (
    <LinearGradient
      colors={["rgba(255,255,255,0.4)", "rgba(255,255,255,0.08)", "rgba(255,255,255,0.2)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.glassBorder, style]}
    >
      <PressableScale
        onPress={onPress}
        disabled={disabled || loading}
        style={[styles.pillInner, (disabled || loading) && styles.disabled]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 60}
          tint="dark"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.glassOverlayDark} />
        <CustomText style={styles.btnText}>{loading ? "Please wait…" : label}</CustomText>
        <ArrowCircle arrow={arrow} circleVariant={circleVariant} />
      </PressableScale>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  glassBorder: {
    width: "100%",
    borderRadius: 999,
    padding: 1,
  },
  pillInner: {
    height: 60,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 22,
    paddingRight: 6,
  },
  plainRow: {
    width: "100%",
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 8,
    paddingRight: 0,
  },
  disabled: {
    opacity: 0.55,
  },
  glassOverlayDark: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 22, 0.82)",
    borderRadius: 999,
  },
  btnText: {
    ...fontTextStyles.twentyTwoBoldBlack,
    zIndex: 2,
    color: "#FFFFFF",
  },
  blueCircleIcon: {
    zIndex: 2,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.65,
    shadowRadius: 10,
    elevation: 6,
  },
  whiteCircleIcon: {
    zIndex: 2,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PublishActionBar;

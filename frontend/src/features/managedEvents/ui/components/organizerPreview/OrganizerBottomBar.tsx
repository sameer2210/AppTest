import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";

interface OrganizerBottomBarProps {
  showEdit: boolean;
  onEditPress: () => void;
  onLeaderboardPress: () => void;
}

export const OrganizerBottomBar = React.memo(
  ({ showEdit, onEditPress, onLeaderboardPress }: OrganizerBottomBarProps) => {
    return (
      <View
        pointerEvents="box-none"
        style={styles.container}
      >
        {showEdit ? (
          <LinearGradient
            colors={[
              "rgba(255, 255, 255, 0.45)",
              "rgba(255, 255, 255, 0.08)",
              "rgba(255, 255, 255, 0.3)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editGradient}
          >
            <PressableScale
              onPress={onEditPress}
              style={styles.editBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit Event"
            >
              <BlurView
                intensity={Platform.OS === "ios" ? 40 : 60}
                tint="dark"
                pointerEvents="none"
                style={StyleSheet.absoluteFill}
              />
              <View pointerEvents="none" style={styles.bgFill} />
              <CustomText style={styles.editText}>
                Edit Event
              </CustomText>
            </PressableScale>
          </LinearGradient>
        ) : null}

        <LinearGradient
          colors={[
            "rgba(255, 255, 255, 0.55)",
            "rgba(255, 255, 255, 0.12)",
            "rgba(255, 255, 255, 0.4)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={showEdit ? styles.lbGradientExpanded : styles.lbGradientFull}
        >
          <PressableScale
            onPress={onLeaderboardPress}
            style={styles.lbBtn}
            accessibilityRole="button"
            accessibilityLabel="Leaderboard"
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 40 : 60}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.bgFill} />
            <CustomText style={styles.lbText}>
              Leaderboard
            </CustomText>

            <LinearGradient
              colors={["#4A92FF", "#1D6EFF", "#0857E4", "#0047D0"]}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={styles.arrowCircle}
            >
              <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
        </LinearGradient>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  editGradient: {
    flex: 1,
    borderRadius: 30,
    padding: 1.5,
  },
  editBtn: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 16,
  },
  bgFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(22, 22, 22, 0.75)",
  },
  editText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lbGradientExpanded: {
    flex: 1.4,
    borderRadius: 30,
    padding: 1.5,
  },
  lbGradientFull: {
    flex: 1,
    borderRadius: 30,
    padding: 1.5,
  },
  lbBtn: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingLeft: 24,
    paddingRight: 6,
  },
  lbText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  arrowCircle: {
    height: 46,
    width: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 23,
  },
});

export default OrganizerBottomBar;

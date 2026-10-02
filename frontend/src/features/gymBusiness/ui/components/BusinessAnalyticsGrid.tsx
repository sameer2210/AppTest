import React from "react";
import { View, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import {
  AnalyticsAttendanceIcon,
  AnalyticsEarningsIcon,
  AnalyticsPayingUsersIcon,
  AnalyticsPeakHoursIcon,
} from "./BusinessFigmaIcons";

interface BusinessAnalyticsGridProps {
  isPro?: boolean;
  onAnalyticsPress?: (metric: "earnings" | "paying_users" | "peak_hours" | "attendance") => void;
  onProPress?: () => void;
}

const PREVIEW_BAR_HEIGHTS = [35, 60, 45, 80, 55, 95, 70, 85, 40, 75, 90, 65, 50, 80];

const ANALYTICS_TILES: {
  key: "earnings" | "paying_users" | "peak_hours" | "attendance";
  label: string;
  renderIcon: () => React.ReactNode;
}[] = [
  { key: "earnings", label: "Earnings", renderIcon: () => <AnalyticsEarningsIcon size={30} /> },
  {
    key: "paying_users",
    label: "Paying Users",
    renderIcon: () => <AnalyticsPayingUsersIcon size={30} />,
  },
  { key: "peak_hours", label: "Peak Hours", renderIcon: () => <AnalyticsPeakHoursIcon size={30} /> },
  {
    key: "attendance",
    label: "Attendance",
    renderIcon: () => <AnalyticsAttendanceIcon size={30} />,
  },
];

export const BusinessAnalyticsGrid: React.FC<BusinessAnalyticsGridProps> = ({
  isPro = false,
  onAnalyticsPress,
  onProPress,
}) => {
  if (!isPro) {
    return (
      <View style={styles.lockedCard}>
        <CustomText style={styles.lockedTitle}>Analytics</CustomText>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onProPress || (() => onAnalyticsPress?.("earnings"))}
          style={styles.lockedTouchArea}
        >
          <View style={styles.graphContainer} pointerEvents="none">
            <View style={[styles.gridLine, { top: 25 }]} />
            <View style={[styles.gridLine, { top: 60 }]} />
            <View style={[styles.gridLine, { top: 95 }]} />
            <View style={styles.previewBarsRow}>
              {PREVIEW_BAR_HEIGHTS.map((height, idx) => (
                <View key={idx} style={[styles.previewBar, { height: `${height}%` }]}>
                  <LinearGradient
                    colors={["#2A80FF", "#0B357B"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                </View>
              ))}
            </View>
          </View>

          <View style={styles.lockScrim} pointerEvents="none" />
          <BlurView
            intensity={Platform.OS === "ios" ? 28 : 50}
            tint="dark"
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor:
                  Platform.OS === "android" ? "rgba(10, 15, 28, 0.78)" : "rgba(10, 15, 28, 0.45)",
              },
            ]}
          />

          <View style={styles.lockCalloutRow} pointerEvents="none">
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.lockTextCol}>
              <CustomText style={styles.lockTitle}>Unlock detailed business insights</CustomText>
              <CustomText style={styles.lockSubtitle}>
                Upgrade to Pro to access analytics and grow your gym.
              </CustomText>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.proCard}>
      <View style={styles.proHeader}>
        <CustomText style={styles.headerTitle}>Analytics</CustomText>
      </View>

      <View style={styles.proTilesRow}>
        {ANALYTICS_TILES.map((tile) => (
          <TouchableOpacity
            key={tile.key}
            activeOpacity={0.7}
            onPress={() => onAnalyticsPress?.(tile.key)}
            style={styles.proTile}
          >
            <View style={styles.proTileTop}>
              <View style={styles.proTileIcon}>{tile.renderIcon()}</View>
              <Ionicons name="chevron-forward" size={13} color="rgba(255,255,255,0.85)" />
            </View>
            <CustomText
              style={styles.proTileLabel}
              numberOfLines={tile.key === "attendance" || tile.key === "earnings" ? 1 : 2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {tile.label}
            </CustomText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  lockedCard: {
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 12,
  },
  lockedTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    marginBottom: 12,
  },
  lockedTouchArea: {
    borderRadius: 12,
    overflow: "hidden",
    height: 120,
    backgroundColor: "rgba(0,0,0,0.31)",
    position: "relative",
  },
  graphContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: "flex-end",
  },
  gridLine: {
    position: "absolute",
    left: 12,
    right: 12,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  previewBarsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    height: 85,
    paddingHorizontal: 4,
  },
  previewBar: {
    width: 14,
    borderRadius: 4,
    overflow: "hidden",
  },
  lockScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.31)",
  },
  lockCalloutRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  lockBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  lockTextCol: {
    flex: 1,
  },
  lockTitle: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  lockSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  proCard: {
    backgroundColor: "#191919",
    borderRadius: 12,
    width: "100%",
    marginBottom: 16,
    paddingHorizontal: 6,
    paddingTop: 16,
    paddingBottom: 14,
  },
  proHeader: {
    paddingHorizontal: 3,
    marginBottom: 12,
    minHeight: 24,
    justifyContent: "center",
  },
  headerTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFFFFF",
  },
  proTilesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  proTile: {
    flex: 1,
    height: 96,
    borderRadius: 6,
    backgroundColor: "#086CFF",
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 10,
  },
  proTileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  proTileIcon: {
    width: 30,
    height: 30,
  },
  proTileLabel: {
    ...fontTextStyles.thirteenMediumBlack,
    marginTop: "auto",
    color: "#FFFFFF",
  },
});

export default BusinessAnalyticsGrid;

import React, { useState, useEffect } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import type { AnalyticsSummaryPayload, GymAnalyticsTab } from "@/types/gym/analytics.types";
import { AttendanceAnalyticsView } from "./AttendanceAnalyticsView";
import { EarningsAnalyticsView } from "./EarningsAnalyticsView";
import { ActiveMembersAnalyticsView } from "./ActiveMembersAnalyticsView";
import { AvgPeakHoursAnalyticsView } from "./AvgPeakHoursAnalyticsView";
import { BusinessProStatusBadge } from "../BusinessProStatusBadge";

interface GymAnalyticsScreenContentProps {
  data: AnalyticsSummaryPayload;
  initialTab?: GymAnalyticsTab;
  isLoading: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  isPro?: boolean;
  onBack: () => void;
}

const TABS: { key: GymAnalyticsTab; label: string }[] = [
  { key: "earnings", label: "Earnings" },
  { key: "active_members", label: "Paying Users" },
  { key: "peak_hours", label: "Peak Hours" },
  { key: "attendance", label: "Attendance" },
];

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.45)",
  "rgba(8, 55, 140, 0.25)",
  "rgba(4, 12, 26, 0.9)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.2, 0.65, 1] as const;

export const GymAnalyticsScreenContent: React.FC<GymAnalyticsScreenContentProps> = ({
  data,
  initialTab = "earnings",
  isLoading,
  isRefreshing = false,
  onRefresh,
  isPro = false,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<GymAnalyticsTab>(initialTab);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const floatingHeaderHeight = headerTopPadding + 48 + 12 + 48 + 12;

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} />

      {/* Ambient Gradient Overlay */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.9 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: "transparent",
          paddingTop: headerTopPadding,
        }}
      >
        {/* Header: Back Button on Left + Right-aligned Title */}
        <View style={styles.header}>
          <GlassBackButton onPress={onBack} size={48} iconSize={24} />

          <View style={styles.headerRight}>
            <BusinessProStatusBadge isPro={isPro} showPartnerFallback={false} />
            <CustomText style={styles.headerTitle}>
              Analytics
            </CustomText>
          </View>
        </View>

        <View style={styles.tabBarContainer}>
          <View style={styles.tabBar}>
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.key)}
                  style={[styles.tabButton, isActive && styles.activeTabButton]}
                >
                  <CustomText
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                  >
                    {tab.label}
                  </CustomText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={Boolean(isRefreshing)}
              onRefresh={onRefresh}
              tintColor="#086CFF"
              colors={["#086CFF"]}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: floatingHeaderHeight,
            paddingBottom: 30,
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#086CFF" />
            <CustomText style={styles.loadingText}>Loading Analytics...</CustomText>
          </View>
        ) : (
          <>
            {activeTab === "earnings" && (
              <EarningsAnalyticsView
                year={data.earningsYear.year}
                totalEarnings={data.earningsYear.totalEarnings}
                formattedTotal={data.earningsYear.formattedTotal}
                months={data.earningsYear.months}
                financialHighlights={data.earningsYear.financialHighlights}
              />
            )}

            {activeTab === "active_members" && (
              <ActiveMembersAnalyticsView
                year={data.activeMembersYear.year}
                totalActive={data.activeMembersYear.totalActive}
                months={data.activeMembersYear.months}
                memberHealth={data.activeMembersYear.memberHealth}
              />
            )}

            {activeTab === "peak_hours" && (
              <AvgPeakHoursAnalyticsView
                rangeText={data.peakHoursWeek.rangeText}
                morningPeak={data.peakHoursWeek.morningPeak}
                eveningPeak={data.peakHoursWeek.eveningPeak}
                offPeak={data.peakHoursWeek.offPeak}
                hourlySlots={data.peakHoursWeek.hourlySlots}
              />
            )}

            {activeTab === "attendance" && (
              <AttendanceAnalyticsView
                rangeText={data.attendanceWeek.rangeText}
                days={data.attendanceWeek.days}
                recentRoster={data.recentRoster}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  header: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...fontTextStyles.thirtyBoldBlack,
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 48,
  },
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  scroll: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 999,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: "#086CFF",
    borderRadius: 999,
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 4,
  },
  tabLabel: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.65)",
    textAlign: "center",
  },
  activeTabLabel: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  scrollContent: screenContentContainerWideStyle,
  loadingContainer: {
    paddingVertical: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
});

export default GymAnalyticsScreenContent;

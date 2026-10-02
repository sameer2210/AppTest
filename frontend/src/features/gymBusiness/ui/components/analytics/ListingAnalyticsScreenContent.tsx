import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import type { ListingAnalyticsPayload } from "@/types/gym/analytics.types";
import { ListingConversionRateView } from "./ListingConversionRateView";
import { ListingRepeatRateView } from "./ListingRepeatRateView";

export type ListingAnalyticsTab = "conversion_rate" | "repeat_rate";

interface ListingAnalyticsScreenContentProps {
  data: ListingAnalyticsPayload;
  initialTab?: ListingAnalyticsTab;
  isLoading: boolean;
  onBack: () => void;
}

const TABS: { key: ListingAnalyticsTab; label: string }[] = [
  { key: "conversion_rate", label: "Conversion Rate" },
  { key: "repeat_rate", label: "Repeat User Rate" },
];

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.45)",
  "rgba(8, 55, 140, 0.25)",
  "rgba(4, 12, 26, 0.9)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.2, 0.65, 1] as const;

export const ListingAnalyticsScreenContent: React.FC<ListingAnalyticsScreenContentProps> = ({
  data,
  initialTab = "conversion_rate",
  isLoading,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<ListingAnalyticsTab>(initialTab);
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const floatingHeaderHeight = headerTopPadding + 48 + 12 + 48 + 12;

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

          <CustomText style={styles.headerTitle}>
            Analytics
          </CustomText>
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
            {activeTab === "conversion_rate" && (
              <ListingConversionRateView
                listings={data.conversionRate.listings}
                overallRate={data.conversionRate.overallRate}
                totalViews={data.conversionRate.totalViews}
                totalTicketsSold={data.conversionRate.totalTicketsSold}
                totalRevenue={data.conversionRate.totalRevenue}
              />
            )}

            {activeTab === "repeat_rate" && (
              <ListingRepeatRateView
                listings={data.repeatUserRate.listings}
                overallRate={data.repeatUserRate.overallRate}
                totalParticipants={data.repeatUserRate.totalParticipants}
                repeatParticipants={data.repeatUserRate.repeatParticipants}
                newParticipants={data.repeatUserRate.newParticipants}
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
    paddingHorizontal: 6,
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

export default ListingAnalyticsScreenContent;

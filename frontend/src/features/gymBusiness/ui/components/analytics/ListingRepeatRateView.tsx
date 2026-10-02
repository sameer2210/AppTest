import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import CustomText from "@/components/CustomText";
import type { ListingRepeatItem } from "@/types/gym/analytics.types";

interface ListingRepeatRateViewProps {
  listings: ListingRepeatItem[];
  overallRate: number;
  totalParticipants: number;
  repeatParticipants: number;
  newParticipants: number;
}

const AnimatedRepeatBar: React.FC<{
  item: ListingRepeatItem;
  index: number;
  maxVal: number;
  isSelected: boolean;
  onPress: () => void;
}> = ({ item, index, maxVal, isSelected, onPress }) => {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      index * 70,
      withTiming(1, {
        duration: 750,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [item.totalParticipants, item.repeatParticipants, index, progress]);

  const maxBarHeight = 110;
  const totalHeight = Math.max(30, (item.totalParticipants / Math.max(maxVal, 1)) * maxBarHeight);
  const repeatPercent = Math.min(
    100,
    Math.max(10, (item.repeatParticipants / Math.max(item.totalParticipants, 1)) * 100),
  );

  const totalBarStyle = useAnimatedStyle(() => ({
    height: totalHeight * progress.value,
  }));

  const repeatBarStyle = useAnimatedStyle(() => ({
    height: `${repeatPercent * progress.value}%`,
  }));

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.barColumn}>
      {/* Selected Rate Badge */}
      {isSelected && (
        <View style={styles.selectedBadge}>
          <CustomText style={styles.selectedBadgeText}>{item.repeatRate}%</CustomText>
        </View>
      )}

      {/* Overlaid Double Bar */}
      <View style={styles.barStackContainer}>
        {/* Outer Bar: Total Participants */}
        <Animated.View
          style={[styles.outerTotalBar, totalBarStyle, isSelected && styles.selectedOuterBar]}
        >
          {/* Inner Overlapping Bar: Repeat Participants */}
          <Animated.View
            style={[styles.innerRepeatBar, repeatBarStyle, isSelected && styles.selectedInnerBar]}
          />
        </Animated.View>
      </View>

      {/* Listing Title */}
      <CustomText
        style={[styles.listingTitle, isSelected && styles.selectedListingTitle]}
        numberOfLines={2}
      >
        {item.title}
      </CustomText>
    </TouchableOpacity>
  );
};

export const ListingRepeatRateView: React.FC<ListingRepeatRateViewProps> = ({
  listings = [],
  overallRate,
  totalParticipants,
  repeatParticipants,
  newParticipants,
}) => {
  const [page, setPage] = useState<number>(0);
  const PAGE_SIZE = 3;

  const totalPages = Math.ceil(Math.max(listings.length, 1) / PAGE_SIZE);
  const currentPageListings = listings.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const selectedItem = currentPageListings[selectedIndex] || currentPageListings[0] || listings[0];

  const maxVal = Math.max(...currentPageListings.map((l) => l.totalParticipants), 100);

  const handlePrev = () => {
    if (page > 0) {
      setPage(page - 1);
      setSelectedIndex(0);
    }
  };

  const handleNext = () => {
    if (page < totalPages - 1) {
      setPage(page + 1);
      setSelectedIndex(0);
    }
  };

  return (
    <View style={styles.container}>
      {/* 1. Main Repeat User Rate Card */}
      <View style={styles.chartCard}>
        {/* Header: Title + Legend */}
        <View style={styles.headerRow}>
          <CustomText style={styles.cardTitle}>Repeat User Rate</CustomText>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {/* Total Participant */}
            <View style={styles.legendItem}>
              <View style={styles.totalLegendDot} />
              <CustomText style={styles.legendLabel}>Total Participant </CustomText>
              <CustomText style={styles.legendValue}>
                {selectedItem ? selectedItem.totalParticipants : totalParticipants}
              </CustomText>
            </View>

            {/* Repeat Participant */}
            <View style={styles.legendItem}>
              <View style={styles.repeatLegendDot} />
              <CustomText style={styles.legendLabel}>Repeat Participant </CustomText>
              <CustomText style={styles.legendValue}>
                {selectedItem ? selectedItem.repeatParticipants : repeatParticipants}
              </CustomText>
            </View>
          </View>
        </View>

        {/* 3 Listing Comparison Bars */}
        <View style={styles.barsContainer}>
          {currentPageListings.map((item, idx) => (
            <AnimatedRepeatBar
              key={item.id || `repeat-${idx}`}
              item={item}
              index={idx}
              maxVal={maxVal}
              isSelected={idx === selectedIndex}
              onPress={() => setSelectedIndex(idx)}
            />
          ))}
        </View>

        {/* Bottom Pagination Chevrons */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrev}
            disabled={page === 0}
            style={[styles.whiteCircleBtn, page === 0 && styles.disabledBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#000000" />
          </TouchableOpacity>

          <CustomText style={styles.pageNumberText}>
            {page + 1} / {totalPages}
          </CustomText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNext}
            disabled={page >= totalPages - 1}
            style={[styles.whiteCircleBtn, page >= totalPages - 1 && styles.disabledBtn]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Key Repeat User Highlights */}
      <CustomText style={styles.sectionHeading}>Retention Breakdown</CustomText>

      <View style={styles.metricsRow}>
        {/* Overall Repeat Rate */}
        <View style={styles.metricCard}>
          <Feather name="refresh-cw" size={20} color="#2A80FF" style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>{overallRate}%</CustomText>
          <CustomText style={styles.metricLabel}>Loyalty Retention Rate</CustomText>
        </View>

        {/* Total Repeat Entries */}
        <View style={styles.metricCard}>
          <Feather name="users" size={20} color="#2A80FF" style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>{repeatParticipants}</CustomText>
          <CustomText style={styles.metricLabel}>Total Repeat Entries</CustomText>
        </View>
      </View>

      {/* Selected Event Details */}
      {selectedItem && (
        <View style={styles.selectedDetailCard}>
          <View style={styles.selectedDetailLeft}>
            <CustomText style={styles.detailCardLabel}>Selected Listing</CustomText>
            <CustomText style={styles.detailCardTitle}>{selectedItem.title}</CustomText>
            <CustomText style={styles.detailCardSubtitle}>
              {selectedItem.repeatParticipants} repeat entries · {selectedItem.newParticipants}{" "}
              first-time users
            </CustomText>
          </View>
          <View style={styles.rateBadge}>
            <CustomText style={styles.rateBadgeText}>{selectedItem.repeatRate}%</CustomText>
            <CustomText style={styles.rateBadgeLabel}>Repeat Rate</CustomText>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  chartCard: {
    backgroundColor: "#1C1C1C",
    borderRadius: 30,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    maxWidth: 130,
  },
  legendContainer: {
    alignItems: "flex-start",
    gap: 6,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  totalLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#497EEF",
  },
  repeatLegendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#214798",
  },
  legendLabel: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.7)",
  },
  legendValue: {
    ...fontTextStyles.tenBoldBlack,
    color: "#FFFFFF",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    height: 180,
    marginBottom: 16,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  selectedBadge: {
    backgroundColor: "#086CFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 6,
  },
  selectedBadgeText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#FFFFFF",
  },
  barStackContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    height: 115,
    marginBottom: 8,
  },
  outerTotalBar: {
    width: "92%",
    backgroundColor: "#497EEF",
    borderRadius: 9,
    justifyContent: "flex-end",
    alignItems: "center",
    overflow: "hidden",
  },
  selectedOuterBar: {
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  innerRepeatBar: {
    width: "100%",
    backgroundColor: "#214798",
    borderRadius: 9,
  },
  selectedInnerBar: {
    backgroundColor: "#1E3A8A",
  },
  listingTitle: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    minHeight: 26,
  },
  selectedListingTitle: {
    color: "#60A5FA",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 40,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  whiteCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.35,
  },
  pageNumberText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  sectionHeading: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FFFFFF",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 18,
    padding: 16,
  },
  metricIcon: {
    marginBottom: 8,
  },
  metricValue: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  metricLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  selectedDetailCard: {
    backgroundColor: "rgba(25, 25, 25, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedDetailLeft: {
    flex: 1,
    marginRight: 12,
  },
  detailCardLabel: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
  detailCardTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  detailCardSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 2,
  },
  rateBadge: {
    backgroundColor: "rgba(8, 108, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
  },
  rateBadgeText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#2A80FF",
  },
  rateBadgeLabel: {
    ...fontTextStyles.eightNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
});

export default ListingRepeatRateView;

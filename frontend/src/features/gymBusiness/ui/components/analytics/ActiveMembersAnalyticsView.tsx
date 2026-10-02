import React, { useEffect, useState } from "react";
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
import type { ActiveMemberMonthData, MemberHealthMetrics } from "@/types/gym/analytics.types";

interface ActiveMembersAnalyticsViewProps {
  year: string;
  totalActive: number;
  months?: ActiveMemberMonthData[];
  memberHealth?: MemberHealthMetrics;
}

import { createStaticActiveMemberMonths } from "@/constants/gymAnalytics.constants";

const EMPTY_MONTHS: ActiveMemberMonthData[] = createStaticActiveMemberMonths();

const AnimatedActiveMemberBar: React.FC<{
  month: ActiveMemberMonthData;
  index: number;
  maxVal: number;
  isSelected: boolean;
  onPress: () => void;
}> = ({ month, index, maxVal, isSelected, onPress }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      index * 40,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [month.count, index, progress]);

  const targetHeight = Math.max(18, (month.count / Math.max(maxVal, 1)) * 105);

  const barStyle = useAnimatedStyle(() => ({
    height: targetHeight * progress.value,
    opacity: Math.max(0.3, progress.value),
  }));

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.barColumn}>
      <View style={styles.barContainer}>
        <Animated.View style={[barStyle, styles.barShape, isSelected && styles.selectedBarShape]} />
      </View>
      <CustomText style={[styles.monthLabel, isSelected && styles.selectedMonthLabel]}>
        {month.month}
      </CustomText>
      <CustomText style={[styles.countLabel, isSelected && styles.selectedCountLabel]}>
        {month.count}
      </CustomText>
    </TouchableOpacity>
  );
};

export const ActiveMembersAnalyticsView: React.FC<ActiveMembersAnalyticsViewProps> = ({
  year,
  totalActive,
  months,
  memberHealth,
}) => {
  const dataMonths =
    months && months.length > 0 ? months : EMPTY_MONTHS;
  const currentMonthIdx = new Date().getMonth();
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(currentMonthIdx);

  const maxVal = Math.max(...dataMonths.map((m) => m.count), 1);
  const selectedMonth = dataMonths[selectedMonthIdx] || dataMonths[dataMonths.length - 1];

  const health = memberHealth || {
    monthlyRetentionPercent: 0,
    newJoinersThisMonth: 0,
  };

  const handlePrevMonth = () => {
    setSelectedMonthIdx((prev) => Math.max(0, prev - 1));
  };

  const handleNextMonth = () => {
    setSelectedMonthIdx((prev) => Math.min(dataMonths.length - 1, prev + 1));
  };

  return (
    <View style={styles.container}>
      {/* 1. Main Active Membership Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <CustomText style={styles.cardTitle}>Active Membership</CustomText>
            <CustomText style={styles.cardSubtitle}>Monthly active subscriber counts in {year}</CustomText>
          </View>
          <CustomText style={styles.totalActiveText}>{totalActive} Members</CustomText>
        </View>

        {/* Selected Month Tooltip HUD */}
        {selectedMonth && (
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipDot} />
              <CustomText style={styles.tooltipMonthText}>
                {selectedMonth.monthFull || selectedMonth.month} {year}
              </CustomText>
            </View>
            <View style={styles.tooltipValueRow}>
              <CustomText style={styles.tooltipValueText}>{selectedMonth.count} Active</CustomText>
              {selectedMonth.newJoiners !== undefined && (
                <CustomText style={styles.tooltipSubText}>
                  +{selectedMonth.newJoiners} new · {selectedMonth.renewals || 0} renewed
                </CustomText>
              )}
            </View>
          </View>
        )}

        {/* 12-Month Growing Bars */}
        <View style={styles.barsRow}>
          {dataMonths.map((m, idx) => (
            <AnimatedActiveMemberBar
              key={m.month}
              month={m}
              index={idx}
              maxVal={maxVal}
              isSelected={idx === selectedMonthIdx}
              onPress={() => setSelectedMonthIdx(idx)}
            />
          ))}
        </View>

        {/* Year Selector */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrevMonth}
            style={styles.pageButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <CustomText style={styles.yearText}>{year}</CustomText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNextMonth}
            style={styles.pageButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Key Metrics Grid */}
      <CustomText style={styles.sectionHeading}>Membership Health</CustomText>

      <View style={styles.metricsRow}>
        {/* Retention Rate */}
        <View style={styles.metricCard}>
          <Feather name="user-check" size={20} color="#2A80FF" style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>{health.monthlyRetentionPercent}%</CustomText>
          <CustomText style={styles.metricLabel}>Monthly Retention</CustomText>
        </View>

        {/* New Joiners This Month */}
        <View style={styles.metricCard}>
          <Feather name="user-plus" size={20} color="#2A80FF" style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>+{health.newJoinersThisMonth}</CustomText>
          <CustomText style={styles.metricLabel}>New Joiners This Month</CustomText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  chartCard: {
    backgroundColor: "rgba(28, 28, 28, 0.85)",
    borderRadius: 26,
    paddingHorizontal: 12,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  chartHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
  },
  cardSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 2,
  },
  totalActiveText: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#2A80FF",
    flexShrink: 0,
    marginTop: 2,
  },
  tooltipCard: {
    backgroundColor: "rgba(8, 20, 40, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tooltipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2A80FF",
  },
  tooltipMonthText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  tooltipValueRow: {
    alignItems: "flex-end",
  },
  tooltipValueText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#60A5FA",
  },
  tooltipSubText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 1,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 2,
    marginBottom: 16,
    height: 155,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  barContainer: {
    height: 110,
    justifyContent: "flex-end",
    alignItems: "center",
    width: "100%",
    marginBottom: 6,
  },
  barShape: {
    width: "74%",
    backgroundColor: "#2A80FF",
    borderRadius: 5,
  },
  selectedBarShape: {
    backgroundColor: "#60A5FA",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  monthLabel: {
    ...fontTextStyles.eightSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
  selectedMonthLabel: {
    ...fontTextStyles.eightBoldBlack,
    color: "#60A5FA",
  },
  countLabel: {
    ...fontTextStyles.eightMediumBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
  selectedCountLabel: {
    ...fontTextStyles.eightBoldBlack,
    color: "#FFFFFF",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  yearText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
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
    backgroundColor: "rgba(25, 25, 25, 0.75)",
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
});

export default ActiveMembersAnalyticsView;

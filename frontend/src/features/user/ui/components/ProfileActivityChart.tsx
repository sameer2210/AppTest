import { useEffect, useMemo, useState } from "react";
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { ShimmerBox } from "@/components/ShimmerPlaceholder";
import CustomText from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  ActivityChartTab,
  ActivityDayEntry,
  YearMonthGrid,
  canGoNextPeriod,
  formatMonthLabel,
  formatWeekRangeLabel,
  formatYearLabel,
  localTodayKey,
} from "../profile.utils";
import { sanitizeDailySteps } from "@/constants/steps";

type Props = {
  tab: ActivityChartTab;
  anchorDate: Date;
  stepGoal?: number | null;
  loading: boolean;
  liveTodaySteps: number;
  weekData: ActivityDayEntry[];
  monthData: ActivityDayEntry[];
  yearData?: YearMonthGrid[];
  onTabChange: (tab: ActivityChartTab) => void;
  onPrev: () => void;
  onNext: () => void;
  onEditGoal?: () => void;
};

const resolveChartSteps = (entry: ActivityDayEntry, liveTodaySteps: number) => {
  const todayKey = localTodayKey();
  const live = sanitizeDailySteps(liveTodaySteps);

  if (entry.dateKey === todayKey) {
    return Math.max(entry.steps, live);
  }
  if (entry.isFuture) {
    return 0;
  }
  return entry.steps;
};

const formatHeaderSteps = (steps: number) => {
  if (steps >= 1_000_000) {
    return `${(steps / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (steps >= 1_000) {
    return `${(steps / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  }
  return steps.toString();
};

const formatTileSteps = (steps: number) => {
  if (steps <= 0) return "0";
  if (steps >= 1_000_000) {
    return `${(steps / 1_000_000).toFixed(1).replace(/\.0$/, "")}m`;
  }
  if (steps >= 1_000) {
    return `${(steps / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${(steps / 1000).toFixed(1)}k`;
};

const formatSelectedDate = (dateKey?: string) => {
  if (!dateKey) return "Selected day";
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return "Selected day";
  const date = new Date(y, m - 1, d);
  const monthName = date.toLocaleDateString("en-US", { month: "long" });
  return `${d} ${monthName}`;
};

const SHIMMER_WEEK_HEIGHTS = [110, 75, 120, 50, 100, 135, 80];

const ProfileActivityChart = ({
  tab,
  anchorDate,
  stepGoal,
  loading,
  liveTodaySteps,
  weekData,
  monthData,
  onTabChange,
  onPrev,
  onNext,
}: Props) => {
  const hasGoal = (stepGoal ?? 0) > 0;
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);

  // Reset selected item when switching tab or navigating period
  useEffect(() => {
    setSelectedEntryKey(null);
  }, [tab, anchorDate]);

  const rangeLabel =
    tab === "WEEK"
      ? formatWeekRangeLabel(anchorDate)
      : tab === "MONTH"
        ? formatMonthLabel(anchorDate)
        : formatYearLabel(anchorDate);

  const rawChartEntries = tab === "WEEK" ? weekData : monthData;
  const chartEntries = useMemo(
    () =>
      rawChartEntries.map((entry) => ({
        ...entry,
        steps: resolveChartSteps(entry, liveTodaySteps),
      })),
    [rawChartEntries, liveTodaySteps],
  );

  const maxInData = chartEntries.reduce((max, entry) => Math.max(max, entry.steps), 0);
  const referenceMax = hasGoal ? stepGoal! : 10000;
  const maxSteps = Math.max(maxInData, referenceMax);
  const canNext = canGoNextPeriod(tab, anchorDate);
  const { width: screenWidth } = useWindowDimensions();

  // Grid sizing for monthly view (7 columns per row)
  // Screen padding = 16 * 2 = 32px; Card padding = 20 * 2 = 40px; Total = 72px
  // 7 columns = 6 gaps of 7px = 42px
  const monthGap = 7;
  const monthCellWidth = useMemo(() => {
    const availableWidth = screenWidth - 72;
    return Math.max(30, Math.floor((availableWidth - 6 * monthGap) / 7));
  }, [screenWidth]);

  // Average steps calculation
  const totalSteps = chartEntries.reduce((sum, entry) => sum + entry.steps, 0);
  const averageSteps = chartEntries.length > 0 ? Math.round(totalSteps / chartEntries.length) : 0;
  const avgStepsDisplay = formatHeaderSteps(averageSteps);

  // Selected entry lookup
  const selectedEntry = selectedEntryKey
    ? chartEntries.find((e) => (e.dateKey || e.key) === selectedEntryKey)
    : null;

  const topValueDisplay = selectedEntry ? formatHeaderSteps(selectedEntry.steps) : avgStepsDisplay;
  const topLabelDisplay = selectedEntry
    ? formatSelectedDate(selectedEntry.dateKey)
    : "Average steps";

  const handleTilePress = (entryKey: string) => {
    setSelectedEntryKey((prev) => (prev === entryKey ? null : entryKey));
  };

  return (
    <View style={styles.container}>
      {/* Top Header Row */}
      <View style={styles.topHeaderRow}>
        {loading ? (
          <View>
            <ShimmerBox width={80} height={28} borderRadius={6} />
            <ShimmerBox width={100} height={14} borderRadius={4} style={{ marginTop: 6 }} />
          </View>
        ) : (
          <View>
            <CustomText
              text={topValueDisplay}
              style={[headingTextStyles.h2, styles.topValueText]}
            />
            <CustomText
              text={topLabelDisplay}
              style={[fontTextStyles.body, styles.topLabelText]}
            />
          </View>
        )}

        {/* White Pill Segmented Toggle with Black Active Tab */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleTab,
              tab === "WEEK" ? styles.toggleTabActive : styles.toggleTabInactive,
            ]}
            onPress={() => onTabChange("WEEK")}
            activeOpacity={0.7}
          >
            <CustomText
              text="Weekly"
              style={[
                fontTextStyles.body,
                styles.toggleTabText,
                tab === "WEEK" ? styles.toggleTabTextActive : styles.toggleTabTextInactive,
              ]}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleTab,
              tab === "MONTH" ? styles.toggleTabActive : styles.toggleTabInactive,
            ]}
            onPress={() => onTabChange("MONTH")}
            activeOpacity={0.7}
          >
            <CustomText
              text="Monthly"
              style={[
                fontTextStyles.body,
                styles.toggleTabText,
                tab === "MONTH" ? styles.toggleTabTextActive : styles.toggleTabTextInactive,
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Chart Body Area */}
      {loading ? (
        tab === "MONTH" ? (
          <View style={styles.monthLoadingContainer}>
            <View style={[styles.monthGrid, { gap: monthGap }]}>
              {Array.from({ length: 28 }).map((_, index) => (
                <ShimmerBox
                  key={`shimmer-month-${index}`}
                  width={monthCellWidth}
                  height={monthCellWidth}
                  borderRadius={9}
                />
              ))}
            </View>
          </View>
        ) : (
          <View
            style={[styles.weekLoadingContainer, { gap: 10 }]}
          >
            {SHIMMER_WEEK_HEIGHTS.map((h, index) => (
              <View
                key={`shimmer-week-${index}`}
                style={styles.weekShimmerColumn}
              >
                <ShimmerBox width="100%" height={h} borderRadius={12} />
                <ShimmerBox width={24} height={12} borderRadius={4} style={{ marginTop: 8 }} />
              </View>
            ))}
          </View>
        )
      ) : tab === "MONTH" ? (
        <View style={styles.monthContainer}>
          <View style={[styles.monthGrid, { gap: monthGap }]}>
            {chartEntries.map((entry, index) => {
              const entryKey = entry.dateKey || entry.key;
              const isSelected = selectedEntryKey === entryKey;
              const bg = "#4080FF";

              return (
                <TouchableOpacity
                  key={`${entry.key}-${index}`}
                  activeOpacity={0.7}
                  onPress={() => handleTilePress(entryKey)}
                  style={{
                    width: monthCellWidth,
                    height: monthCellWidth,
                    backgroundColor: bg,
                    borderRadius: 9,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: isSelected ? "#FFFFFF" : "transparent",
                  }}
                >
                  <CustomText
                    text={formatTileSteps(entry.steps)}
                    style={[fontTextStyles.bodyMedium, styles.monthTileText]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <View
          style={[styles.weekContainer, { gap: 10 }]}
        >
          {chartEntries.map((entry, index) => {
            const entryKey = entry.dateKey || entry.key;
            const isSelected = selectedEntryKey === entryKey;
            const relMax = maxSteps > 0 ? maxSteps : 10000;
            const pct = entry.steps / relMax;
            const calculatedHeight =
              entry.steps > 0 ? Math.max(34, Math.min(145, Math.round(pct * 145))) : 20;
            const barColor = "#4080FF";

            return (
              <TouchableOpacity
                key={`${entry.key}-${index}`}
                activeOpacity={0.7}
                onPress={() => handleTilePress(entryKey)}
                style={styles.weekBarColumn}
              >
                <View
                  style={{
                    width: "100%",
                    height: calculatedHeight,
                    backgroundColor: barColor,
                    borderRadius: 12,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: isSelected ? "#FFFFFF" : "transparent",
                  }}
                />
                <CustomText
                  text={formatTileSteps(entry.steps)}
                  style={[fontTextStyles.bodyMedium, styles.weekBarLabel]}
                  numberOfLines={1}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Navigation Footer */}
      <View style={styles.navFooter}>
        <TouchableOpacity
          onPress={onPrev}
          style={styles.navButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#000000" />
        </TouchableOpacity>
        <CustomText
          text={rangeLabel}
          style={[fontTextStyles.body, styles.rangeLabelText]}
        />
        <TouchableOpacity
          onPress={onNext}
          disabled={!canNext}
          style={[styles.navButton, !canNext && styles.disabledNavButton]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={20} color="#000000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  topValueText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "bold",
    letterSpacing: -0.5,
  },
  topLabelText: {
    color: "rgba(255, 255, 255, 0.65)",
    fontSize: 14,
    marginTop: 2,
  },
  toggleContainer: {
    backgroundColor: "#FFFFFF",
    height: 38,
    borderRadius: 999,
    flexDirection: "row",
    padding: 3,
    alignItems: "center",
    width: 176,
  },
  toggleTab: {
    flex: 1,
    height: "100%",
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleTabActive: {
    backgroundColor: "#000000",
  },
  toggleTabInactive: {
    backgroundColor: "transparent",
  },
  toggleTabText: {
    fontSize: 13,
  },
  toggleTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toggleTabTextInactive: {
    color: "#000000",
    fontWeight: "500",
  },
  monthLoadingContainer: {
    width: "100%",
    minHeight: 180,
    justifyContent: "center",
    paddingVertical: 4,
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  weekLoadingContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 8,
    height: 180,
  },
  weekShimmerColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  monthContainer: {
    width: "100%",
    minHeight: 180,
    justifyContent: "center",
    paddingVertical: 4,
  },
  monthTileText: {
    color: "#FFFFFF",
    fontSize: 11,
    textAlign: "center",
  },
  weekContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    width: "100%",
    paddingTop: 8,
    height: 180,
  },
  weekBarColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  weekBarLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  navFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 4,
  },
  navButton: {
    backgroundColor: "#FFFFFF",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  disabledNavButton: {
    opacity: 0.4,
  },
  rangeLabelText: {
    color: "#FFFFFF",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});

export default ProfileActivityChart;


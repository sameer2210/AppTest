import React, { useState, useMemo } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  Line,
  Circle,
  Text as SvgText,
} from "react-native-svg";

import CustomText from "@/components/CustomText";
import type { MonthlyMetricData, FinancialHighlights } from "@/types/gym/analytics.types";

interface EarningsAnalyticsViewProps {
  year: string;
  totalEarnings: number;
  formattedTotal: string;
  months: MonthlyMetricData[];
  financialHighlights?: FinancialHighlights;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_CARD_WIDTH = Math.max(SCREEN_WIDTH - 32 - 16, 280);
const CHART_PADDING_LEFT = 46;
const CHART_PADDING_RIGHT = 12;
const CHART_PADDING_TOP = 22;
const CHART_PADDING_BOTTOM = 28;
const CHART_HEIGHT = 175;

const formatYAxisAmount = (amount: number) => {
  if (amount === 0) return "₹0";
  if (amount >= 100000) {
    const val = amount / 100000;
    return `₹${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}k`;
  }
  return `₹${amount}`;
};

import {
  ANALYTICS_MONTH_NAMES,
  ANALYTICS_FULL_MONTHS,
} from "@/constants/gymAnalytics.constants";

export const EarningsAnalyticsView: React.FC<EarningsAnalyticsViewProps> = ({
  year,
  formattedTotal,
  months = [],
  financialHighlights,
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_CARD_WIDTH);
  const currentMonth = new Date().getMonth();

  const normalizedMonths: MonthlyMetricData[] = useMemo(() => {
    if (months && months.length === 12) {
      return months;
    }
    const map = new Map<string, MonthlyMetricData>();
    (months || []).forEach((m) => {
      if (m.month) map.set(m.month.toUpperCase(), m);
      if (typeof m.monthIndex === "number") map.set(String(m.monthIndex), m);
    });

    return ANALYTICS_MONTH_NAMES.map((name, index) => {
      const existing = map.get(name) || map.get(String(index));
      return {
        month: name,
        monthIndex: index,
        monthFull: existing?.monthFull || ANALYTICS_FULL_MONTHS[index],
        year: existing?.year || year || "2026",
        value: Number(existing?.value) || 0,
        formattedValue:
          existing?.formattedValue ||
          (existing?.value ? `₹${Number(existing.value).toLocaleString("en-IN")}` : "₹0"),
        transactions: existing?.transactions || 0,
        manualTransactions: existing?.manualTransactions || 0,
        onlineTransactions: existing?.onlineTransactions || 0,
      };
    });
  }, [months, year]);

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(currentMonth);

  const chartWidth = Math.max(containerWidth, 260);
  const plotWidth = Math.max(chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT, 100);
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const maxRevenue = useMemo(() => {
    const vals = normalizedMonths.map((m) => m.value);
    const max = vals.length > 0 ? Math.max(...vals, 10000) : 10000;
    if (max >= 100000) {
      return Math.ceil(max / 100000) * 100000;
    }
    return Math.ceil(max / 10000) * 10000;
  }, [normalizedMonths]);

  const yTicks = useMemo(() => {
    return [0, maxRevenue * 0.33, maxRevenue * 0.66, maxRevenue];
  }, [maxRevenue]);

  // Compute exact (x, y) coordinates for all 12 months
  const points = useMemo(() => {
    return normalizedMonths.map((m, index) => {
      const x =
        CHART_PADDING_LEFT +
        (index / Math.max(normalizedMonths.length - 1, 1)) * plotWidth;
      const y =
        CHART_PADDING_TOP +
        plotHeight -
        (m.value / Math.max(maxRevenue, 1)) * plotHeight;
      return { x, y, month: m, index };
    });
  }, [normalizedMonths, maxRevenue, plotWidth, plotHeight]);

  // Generate smooth SVG Catmull-Rom Bezier Path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) return { linePath: "", areaPath: "" };

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = CHART_PADDING_TOP + plotHeight;

    const aPath = `${d} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
    return { linePath: d, areaPath: aPath };
  }, [points, plotHeight]);

  const selectedPoint = points[selectedMonthIdx] || points[points.length - 1];
  const selectedMonthData = selectedPoint?.month || normalizedMonths[normalizedMonths.length - 1];

  const highlights: FinancialHighlights = financialHighlights || {
    yoyGrowthPercent: 0,
    formattedYoYGrowth: "0%",
    avgMonthlyRevenue: 0,
    formattedAvgMonthly: "₹0",
    topPerformingMonth: {
      month: null,
      revenue: 0,
      formattedRevenue: "₹0",
    },
  };

  const yoyDisplay = useMemo(() => {
    if (highlights.formattedYoYGrowth) {
      return highlights.formattedYoYGrowth;
    }
    if (highlights.yoyGrowthPercent == null) {
      return "New";
    }
    if (highlights.yoyGrowthPercent > 0) {
      return `+${highlights.yoyGrowthPercent}%`;
    }
    if (highlights.yoyGrowthPercent < 0) {
      return `${highlights.yoyGrowthPercent}%`;
    }
    return "0%";
  }, [highlights.formattedYoYGrowth, highlights.yoyGrowthPercent]);

  const yoyIcon = useMemo(() => {
    if (highlights.yoyGrowthPercent != null && highlights.yoyGrowthPercent < 0) {
      return { name: "trending-down" as const, color: "#FF5252" };
    }
    if (highlights.yoyGrowthPercent != null && highlights.yoyGrowthPercent > 0) {
      return { name: "trending-up" as const, color: "#61DC60" };
    }
    return { name: "trending-up" as const, color: "#2A80FF" };
  }, [highlights.yoyGrowthPercent]);

  return (
    <View style={styles.container}>
      {/* 1. Main Earnings Card */}
      <View style={styles.chartCard}>
        {/* Card Header: Title + Formatted Total */}
        <View style={styles.chartHeaderRow}>
          <View>
            <CustomText style={styles.cardTitle}>Earnings</CustomText>
            <CustomText style={styles.cardSubtitle}>Total Annual Revenue</CustomText>
          </View>
          <CustomText style={styles.totalEarningsText}>{formattedTotal}</CustomText>
        </View>

        {/* Selected Data Point Tooltip HUD */}
        {selectedMonthData && (
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipDot} />
              <CustomText style={styles.tooltipMonthText}>
                {selectedMonthData.monthFull || selectedMonthData.month} {year}
              </CustomText>
            </View>
            <View style={styles.tooltipValueRow}>
              <CustomText style={styles.tooltipValueText}>
                ₹{selectedMonthData.value.toLocaleString("en-IN")}
              </CustomText>
              {selectedMonthData.transactions !== undefined && (
                <CustomText style={styles.tooltipTxText}>{selectedMonthData.transactions} payments</CustomText>
              )}
            </View>
          </View>
        )}

        {/* Responsive Dynamic SVG Line & Area Chart */}
        <View
          style={styles.chartWrapper}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0 && Math.abs(width - containerWidth) > 1) {
              setContainerWidth(width);
            }
          }}
        >
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="paint0_linear_earnings" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#2A80FF" stopOpacity="0.5" />
                <Stop offset="0.8" stopColor="#2A80FF" stopOpacity="0.08" />
                <Stop offset="1" stopColor="#04060A" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Y-Axis Grid Lines & Amount Labels */}
            {yTicks.map((val, idx) => {
              const yPos =
                CHART_PADDING_TOP + plotHeight - (val / Math.max(maxRevenue, 1)) * plotHeight;
              return (
                <React.Fragment key={`ytick-${idx}`}>
                  <Line
                    x1={CHART_PADDING_LEFT}
                    y1={yPos}
                    x2={chartWidth - CHART_PADDING_RIGHT}
                    y2={yPos}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth={1}
                    strokeDasharray={idx === 0 ? "0" : "3, 3"}
                  />
                  <SvgText
                    x={CHART_PADDING_LEFT - 12}
                    y={yPos + 4}
                    fill="rgba(255, 255, 255, 0.55)"
                    fontSize="8.5"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {formatYAxisAmount(val)}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Filled Gradient Area Curve */}
            {areaPath ? <Path d={areaPath} fill="url(#paint0_linear_earnings)" /> : null}

            {/* Stroke Line Curve */}
            {linePath ? (
              <Path
                d={linePath}
                stroke="#2A80FF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}

            {/* Selected Month Vertical Marker Line */}
            {selectedPoint && (
              <Line
                x1={selectedPoint.x}
                y1={CHART_PADDING_TOP}
                x2={selectedPoint.x}
                y2={CHART_PADDING_TOP + plotHeight}
                stroke="#2A80FF"
                strokeWidth={1.5}
                strokeDasharray="4, 4"
                opacity={0.8}
              />
            )}

            {/* Data Points on Curve */}
            {points.map((p, idx) => {
              const isSelected = idx === selectedMonthIdx;
              return (
                <React.Fragment key={`point-${idx}`}>
                  {isSelected && (
                    <Circle cx={p.x} cy={p.y} r={9} fill="#2A80FF" fillOpacity={0.25} />
                  )}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 5 : 3.5}
                    fill={isSelected ? "#FFFFFF" : "#2A80FF"}
                    stroke="#2A80FF"
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {/* Month Label aligned directly under point */}
                  <SvgText
                    x={p.x}
                    y={CHART_HEIGHT - 6}
                    fill={isSelected ? "#2A80FF" : "rgba(255, 255, 255, 0.55)"}
                    fontSize={isSelected ? "9.5" : "8"}
                    fontWeight={isSelected ? "700" : "500"}
                    textAnchor="middle"
                  >
                    {p.month.month}
                  </SvgText>
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Interactive touch overlay */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <View style={styles.touchColumnsRow}>
              {points.map((p, idx) => (
                <TouchableOpacity
                  key={`touch-col-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => setSelectedMonthIdx(idx)}
                  style={styles.touchColumn}
                />
              ))}
            </View>
          </View>
        </View>

        {/* Bottom Pagination Row */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMonthIdx((prev) => Math.max(0, prev - 1))}
            style={styles.whiteRoundBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#000000" />
          </TouchableOpacity>

          <CustomText style={styles.yearText}>{year}</CustomText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedMonthIdx((prev) => Math.min(normalizedMonths.length - 1, prev + 1))}
            style={styles.whiteRoundBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Key Metrics Grid */}
      <CustomText style={styles.sectionHeading}>Financial Highlights</CustomText>

      <View style={styles.metricsRow}>
        {/* YoY Revenue Growth */}
        <View style={styles.metricCard}>
          <Feather name={yoyIcon.name} size={20} color={yoyIcon.color} style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>
            {yoyDisplay}
          </CustomText>
          <CustomText style={styles.metricLabel}>YoY Revenue Growth</CustomText>
        </View>

        {/* Avg Monthly Revenue */}
        <View style={styles.metricCard}>
          <Feather name="dollar-sign" size={20} color="#2A80FF" style={styles.metricIcon} />
          <CustomText style={styles.metricValue}>{highlights.formattedAvgMonthly}</CustomText>
          <CustomText style={styles.metricLabel}>Avg. Monthly Revenue</CustomText>
        </View>
      </View>

      {/* Peak Month Banner */}
      <View style={styles.peakMonthCard}>
        <View>
          <CustomText style={styles.peakMonthLabel}>Top Performing Month</CustomText>
          <CustomText style={styles.peakMonthValue}>
            {highlights.topPerformingMonth?.month && highlights.topPerformingMonth.revenue > 0
              ? `${highlights.topPerformingMonth.month} · ${highlights.topPerformingMonth.formattedRevenue} Revenue`
              : "No revenue recorded yet"}
          </CustomText>
        </View>
        <View style={styles.peakBadge}>
          <CustomText style={styles.peakBadgeText}>Peak Month</CustomText>
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
    paddingHorizontal: 8,
    paddingVertical: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 8,
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
  totalEarningsText: {
    ...fontTextStyles.size24ExtraBoldBlack,
    color: "#2A80FF",
  },
  tooltipCard: {
    backgroundColor: "rgba(8, 20, 40, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.35)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    marginHorizontal: 8,
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
    color: "#2A80FF",
  },
  tooltipTxText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 1,
  },
  chartWrapper: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  touchColumnsRow: {
    flexDirection: "row",
    height: CHART_HEIGHT,
    paddingLeft: CHART_PADDING_LEFT - 6,
    paddingRight: CHART_PADDING_RIGHT - 6,
  },
  touchColumn: {
    flex: 1,
    height: "100%",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.08)",
  },
  whiteRoundBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  yearText: {
    ...fontTextStyles.eighteenNormalBlack,
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
  peakMonthCard: {
    backgroundColor: "rgba(25, 25, 25, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  peakMonthLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 3,
  },
  peakMonthValue: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  peakBadge: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  peakBadgeText: {
    ...fontTextStyles.tenBoldBlack,
    color: "#2A80FF",
  },
});

export default EarningsAnalyticsView;

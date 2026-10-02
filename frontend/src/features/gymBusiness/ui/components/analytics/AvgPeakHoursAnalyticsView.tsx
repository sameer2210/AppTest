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
import type { PeakHourSlot } from "@/types/gym/analytics.types";

interface AvgPeakHoursAnalyticsViewProps {
  rangeText: string;
  morningPeak?: string;
  eveningPeak?: string;
  offPeak?: string;
  hourlySlots?: PeakHourSlot[];
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const DEFAULT_CARD_WIDTH = Math.max(SCREEN_WIDTH - 32 - 16, 280);
const CHART_PADDING_LEFT = 42;
const CHART_PADDING_RIGHT = 12;
const CHART_PADDING_TOP = 22;
const CHART_PADDING_BOTTOM = 28;
const CHART_HEIGHT = 175;

import { STATIC_HOURLY_SLOTS } from "@/constants/gymAnalytics.constants";

export const AvgPeakHoursAnalyticsView: React.FC<AvgPeakHoursAnalyticsViewProps> = ({
  rangeText,
  morningPeak = "06:30 AM - 09:30 AM",
  eveningPeak = "05:30 PM - 09:30 PM",
  offPeak = "01:00 PM - 04:00 PM",
  hourlySlots = [],
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(DEFAULT_CARD_WIDTH);

  const slots: PeakHourSlot[] = useMemo(() => {
    if (!hourlySlots || hourlySlots.length === 0) {
      return STATIC_HOURLY_SLOTS;
    }
    return hourlySlots.map((s) => ({
      hour: s.hour,
      hourLabel: s.hourLabel || `${String(s.hour).padStart(2, "0")}:00`,
      memberCount: Number(s.memberCount) || 0,
      intensity: Number(s.intensity) || 0,
      loadLabel:
        s.loadLabel ||
        (s.memberCount > 0
          ? `${s.memberCount} check-in${s.memberCount === 1 ? "" : "s"}`
          : "Quiet (0%)"),
    }));
  }, [hourlySlots]);

  // Real stats for Evening (16:00 - 22:00)
  const eveningStats = useMemo(() => {
    const eveningSlots = slots.filter((s) => s.hour >= 16 && s.hour <= 21);
    const maxMember = eveningSlots.reduce((max, s) => Math.max(max, s.memberCount), 0);
    const maxIntensity = eveningSlots.reduce((max, s) => Math.max(max, s.intensity), 0);
    return {
      peakMembers: maxMember,
      badgeText: maxMember > 0 ? `${maxIntensity}% Rush` : "No Rush",
      timeWindow: eveningPeak || "05:30 PM - 09:30 PM",
    };
  }, [slots, eveningPeak]);

  // Real stats for Morning (05:00 - 11:00)
  const morningStats = useMemo(() => {
    const morningSlots = slots.filter((s) => s.hour >= 5 && s.hour <= 11);
    const maxMember = morningSlots.reduce((max, s) => Math.max(max, s.memberCount), 0);
    const maxIntensity = morningSlots.reduce((max, s) => Math.max(max, s.intensity), 0);
    return {
      peakMembers: maxMember,
      badgeText: maxMember > 0 ? `${maxIntensity}% Rush` : "No Rush",
      timeWindow: morningPeak || "06:30 AM - 09:30 AM",
    };
  }, [slots, morningPeak]);

  // Real stats for Off-Peak (12:00 - 15:00)
  const offPeakStats = useMemo(() => {
    const offSlots = slots.filter((s) => s.hour >= 12 && s.hour <= 15);
    const maxMember = offSlots.reduce((max, s) => Math.max(max, s.memberCount), 0);
    const maxIntensity = offSlots.reduce((max, s) => Math.max(max, s.intensity), 0);
    return {
      peakMembers: maxMember,
      badgeText: maxMember > 0 ? `Light (${maxIntensity}%)` : "Quiet (0%)",
      timeWindow: offPeak || "01:00 PM - 04:00 PM",
    };
  }, [slots, offPeak]);

  // Find index of slot with highest member count to select by default
  const peakSlotIdx = useMemo(() => {
    let maxIdx = 0;
    let maxVal = -1;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].memberCount > maxVal) {
        maxVal = slots[i].memberCount;
        maxIdx = i;
      }
    }
    return maxIdx;
  }, [slots]);

  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number>(peakSlotIdx);

  // Update selectedSlotIdx when slots change
  React.useEffect(() => {
    setSelectedSlotIdx(peakSlotIdx);
  }, [peakSlotIdx]);

  const chartWidth = Math.max(containerWidth, 260);
  const plotWidth = Math.max(chartWidth - CHART_PADDING_LEFT - CHART_PADDING_RIGHT, 100);
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;

  const maxMembers = useMemo(() => {
    const max = Math.max(...slots.map((s) => s.memberCount), 5);
    return Math.ceil(max / 5) * 5;
  }, [slots]);

  const yTicks = useMemo(() => {
    return [0, Math.round(maxMembers * 0.33), Math.round(maxMembers * 0.66), maxMembers];
  }, [maxMembers]);

  // Compute exact (x, y) coordinates for all hourly slots
  const points = useMemo(() => {
    return slots.map((s, index) => {
      const x = CHART_PADDING_LEFT + (index / Math.max(slots.length - 1, 1)) * plotWidth;
      const y =
        CHART_PADDING_TOP + plotHeight - (s.memberCount / Math.max(maxMembers, 1)) * plotHeight;
      return { x, y, slot: s, index };
    });
  }, [slots, maxMembers, plotWidth, plotHeight]);

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

  const selectedPoint = points[selectedSlotIdx] || points[0];
  const selectedSlot = selectedPoint?.slot || slots[0];

  return (
    <View style={styles.container}>
      {/* 1. Main Peak Hours Card */}
      <View style={styles.chartCard}>
        {/* Card Header: Title */}
        <View style={styles.chartHeaderRow}>
          <View>
            <CustomText style={styles.cardTitle}>Average Peak Hours</CustomText>
            <CustomText style={styles.cardSubtitle}>24-Hour Gym Occupancy Trends ({rangeText})</CustomText>
          </View>
        </View>

        {/* Selected Hour Tooltip HUD */}
        {selectedSlot && (
          <View style={styles.tooltipCard}>
            <View style={styles.tooltipRow}>
              <View style={styles.tooltipDot} />
              <CustomText style={styles.tooltipSlotText}>{selectedSlot.hourLabel} Window</CustomText>
            </View>
            <View style={styles.tooltipValueRow}>
              <CustomText style={styles.tooltipValueText}>{selectedSlot.memberCount} Members</CustomText>
              <CustomText style={styles.tooltipIntensityText}>
                {selectedSlot.loadLabel || `${selectedSlot.intensity}% Capacity`}
              </CustomText>
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
              <LinearGradient id="paint0_linear_peak_hours" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#086CFF" stopOpacity="0.6" />
                <Stop offset="0.8" stopColor="#086CFF" stopOpacity="0.08" />
                <Stop offset="1" stopColor="#04060A" stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {/* Horizontal Y-Axis Grid Lines & Tick Labels */}
            {yTicks.map((val, idx) => {
              const yPos =
                CHART_PADDING_TOP + plotHeight - (val / Math.max(maxMembers, 1)) * plotHeight;
              return (
                <React.Fragment key={`peak-ytick-${idx}`}>
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
                    fontSize="9"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {val}
                  </SvgText>
                </React.Fragment>
              );
            })}

            {/* Filled Gradient Area Curve */}
            {areaPath ? <Path d={areaPath} fill="url(#paint0_linear_peak_hours)" /> : null}

            {/* Stroke Line Curve */}
            {linePath ? (
              <Path
                d={linePath}
                stroke="#086CFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}

            {/* Selected Slot Marker Line */}
            {selectedPoint && (
              <Line
                x1={selectedPoint.x}
                y1={CHART_PADDING_TOP}
                x2={selectedPoint.x}
                y2={CHART_PADDING_TOP + plotHeight}
                stroke="#086CFF"
                strokeWidth={1.5}
                strokeDasharray="4, 4"
                opacity={0.8}
              />
            )}

            {/* Data Points on Curve */}
            {points.map((p, idx) => {
              const isSelected = idx === selectedSlotIdx;
              const showLabel = idx % 2 === 0 || isSelected;
              return (
                <React.Fragment key={`peak-pt-${idx}`}>
                  {isSelected && (
                    <Circle cx={p.x} cy={p.y} r={9} fill="#086CFF" fillOpacity={0.25} />
                  )}
                  <Circle
                    cx={p.x}
                    cy={p.y}
                    r={isSelected ? 5 : 3}
                    fill={isSelected ? "#FFFFFF" : "#086CFF"}
                    stroke="#086CFF"
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  {showLabel && (
                    <SvgText
                      x={p.x}
                      y={CHART_HEIGHT - 6}
                      fill={isSelected ? "#2A80FF" : "rgba(255, 255, 255, 0.55)"}
                      fontSize={isSelected ? "9.5" : "8"}
                      fontWeight={isSelected ? "700" : "500"}
                      textAnchor="middle"
                    >
                      {p.slot.hourLabel}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          {/* Full height interactive touch overlay */}
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            <View style={styles.touchColumnsRow}>
              {points.map((p, idx) => (
                <TouchableOpacity
                  key={`peak-touch-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => setSelectedSlotIdx(idx)}
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
            onPress={() => setSelectedSlotIdx((prev) => Math.max(0, prev - 1))}
            style={styles.whiteRoundBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={18} color="#000000" />
          </TouchableOpacity>

          <CustomText style={styles.rangeText}>{rangeText}</CustomText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSelectedSlotIdx((prev) => Math.min(slots.length - 1, prev + 1))}
            style={styles.whiteRoundBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={18} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Occupancy Windows Breakdown */}
      <CustomText style={styles.sectionHeading}>Occupancy Windows</CustomText>

      {/* Evening Rush Peak */}
      <View style={styles.windowCard}>
        <View style={styles.windowLeftCol}>
          <View style={[styles.windowIconBox, styles.eveningIconBox]}>
            <Feather name="zap" size={18} color="#2A80FF" />
          </View>
          <View>
            <CustomText style={styles.windowTitle}>Evening Rush Peak</CustomText>
            <CustomText style={styles.windowSubtitle}>{eveningStats.timeWindow}</CustomText>
          </View>
        </View>
        <View style={[styles.windowBadge, styles.eveningBadge]}>
          <CustomText style={[styles.windowBadgeText, styles.eveningBadgeText]}>
            {eveningStats.badgeText}
          </CustomText>
        </View>
      </View>

      {/* Morning Peak */}
      <View style={styles.windowCard}>
        <View style={styles.windowLeftCol}>
          <View style={[styles.windowIconBox, styles.morningIconBox]}>
            <Feather name="sun" size={18} color="#2A80FF" />
          </View>
          <View>
            <CustomText style={styles.windowTitle}>Morning Fitness Peak</CustomText>
            <CustomText style={styles.windowSubtitle}>{morningStats.timeWindow}</CustomText>
          </View>
        </View>
        <View style={[styles.windowBadge, styles.morningBadge]}>
          <CustomText style={[styles.windowBadgeText, styles.morningBadgeText]}>
            {morningStats.badgeText}
          </CustomText>
        </View>
      </View>

      {/* Off Peak */}
      <View style={styles.windowCard}>
        <View style={styles.windowLeftCol}>
          <View style={[styles.windowIconBox, styles.offPeakIconBox]}>
            <Feather name="coffee" size={18} color="#2A80FF" />
          </View>
          <View>
            <CustomText style={styles.windowTitle}>Off-Peak Windows</CustomText>
            <CustomText style={styles.windowSubtitle}>{offPeakStats.timeWindow}</CustomText>
          </View>
        </View>
        <View style={[styles.windowBadge, styles.offPeakBadge]}>
          <CustomText style={[styles.windowBadgeText, styles.offPeakBadgeText]}>
            {offPeakStats.badgeText}
          </CustomText>
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
  tooltipCard: {
    backgroundColor: "rgba(8, 20, 40, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
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
  tooltipSlotText: {
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
  tooltipIntensityText: {
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
  rangeText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
  },
  sectionHeading: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FFFFFF",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  windowCard: {
    backgroundColor: "rgba(25, 25, 25, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  windowLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  windowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  eveningIconBox: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
  },
  morningIconBox: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
  },
  offPeakIconBox: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
  },
  windowTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  windowSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  windowBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  windowBadgeText: {
    ...fontTextStyles.tenBoldBlack,
  },
  eveningBadge: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
  },
  eveningBadgeText: {
    ...fontTextStyles.tenBoldBlack,
    color: "#2A80FF",
  },
  morningBadge: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
  },
  morningBadgeText: {
    ...fontTextStyles.tenBoldBlack,
    color: "#2A80FF",
  },
  offPeakBadge: {
    backgroundColor: "rgba(42, 128, 255, 0.15)",
  },
  offPeakBadgeText: {
    ...fontTextStyles.tenBoldBlack,
    color: "#2A80FF",
  },
});

export default AvgPeakHoursAnalyticsView;

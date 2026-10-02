import React, { useEffect, useState, useMemo } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet, Image } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import type { AttendanceDayData, AttendanceRosterItem } from "@/types/gym/analytics.types";
import { OrganizerContactSheet, type OrganizerContactSeed } from "@/components/sheets/OrganizerContactSheet";

interface AttendanceAnalyticsViewProps {
  rangeText: string;
  days: AttendanceDayData[];
  recentRoster?: AttendanceRosterItem[];
}

const AnimatedAttendanceBar: React.FC<{
  day: AttendanceDayData;
  index: number;
  maxVal: number;
  maxHeight: number;
  isSelected: boolean;
  onPress: () => void;
}> = ({ day, index, maxVal, maxHeight, isSelected, onPress }) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = 0;
    animatedProgress.value = withDelay(
      index * 60,
      withTiming(1, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [day.count, index, animatedProgress]);

  const targetHeight = Math.max(18, (day.count / Math.max(maxVal, 1)) * maxHeight);

  const barStyle = useAnimatedStyle(() => {
    return {
      height: targetHeight * animatedProgress.value,
      opacity: Math.max(0.3, animatedProgress.value),
    };
  });

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.barColumn}>
      {/* Selected Indicator Glow */}
      {isSelected && (
        <View style={styles.selectedPill}>
          <CustomText style={styles.selectedPillText}>{day.count}</CustomText>
        </View>
      )}

      {/* Bar container */}
      <View style={[styles.barContainer, { height: maxHeight }]}>
        <Animated.View style={[barStyle, styles.barShape, isSelected && styles.selectedBarShape]} />
      </View>

      {/* Day Short Label (MON, TUE...) */}
      <CustomText style={[styles.dayShortText, isSelected && styles.selectedDayShortText]}>
        {day.dayShort}
      </CustomText>

      {/* Count Value */}
      <CustomText style={[styles.countText, isSelected && styles.selectedCountText]}>{day.count}</CustomText>
    </TouchableOpacity>
  );
};

import { createStatic7Days } from "@/constants/gymAnalytics.constants";

export const AttendanceAnalyticsView: React.FC<AttendanceAnalyticsViewProps> = ({
  rangeText,
  days = [],
  recentRoster = [],
}) => {
  const normalizedDays: AttendanceDayData[] = useMemo(() => {
    if (days && days.length === 7) {
      return days;
    }
    if (days && days.length > 0) {
      return days;
    }
    return createStatic7Days();
  }, [days]);

  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(normalizedDays.length - 1);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);
  const [contactSeed, setContactSeed] = useState<OrganizerContactSeed | null>(null);

  const selectedDay = normalizedDays[selectedDayIndex] || normalizedDays[normalizedDays.length - 1];

  const displayRange = useMemo(() => {
    if (rangeText && rangeText.trim().length > 0) return rangeText;
    if (normalizedDays.length >= 2) {
      const first = normalizedDays[0].formattedDate || normalizedDays[0].dayShort;
      const last =
        normalizedDays[normalizedDays.length - 1].formattedDate ||
        normalizedDays[normalizedDays.length - 1].dayShort;
      return `${first} - ${last}`;
    }
    return "Last 7 Days";
  }, [rangeText, normalizedDays]);

  // Filter roster by selected day if matching records exist, else show all recent
  const filteredRoster = useMemo(() => {
    if (!selectedDay) return recentRoster;
    const matched = recentRoster.filter((item) => item.attendanceDate === selectedDay.date);
    return matched.length > 0 ? matched : recentRoster;
  }, [recentRoster, selectedDay]);

  const handleContactPress = (item: AttendanceRosterItem) => {
    setContactSeed({
      phone: item.memberId.phone,
      email: item.memberId.email,
    });
    setContactSheetVisible(true);
  };

  const handlePrevDay = () => {
    setSelectedDayIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNextDay = () => {
    setSelectedDayIndex((prev) => Math.min(normalizedDays.length - 1, prev + 1));
  };

  const maxVal = useMemo(() => Math.max(...normalizedDays.map((d) => d.count), 1), [normalizedDays]);

  return (
    <View style={styles.container}>
      {/* 1. Main Attendance Chart Card */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeaderRow}>
          <View>
            <CustomText style={styles.cardTitle}>Attendance</CustomText>
            <CustomText style={styles.cardSubtitle}>
              {selectedDay ? `${selectedDay.dayLabel} · ${selectedDay.count} Check-ins` : displayRange}
            </CustomText>
          </View>
          <View style={styles.totalBadge}>
            <CustomText style={styles.totalBadgeText}>
              {normalizedDays.reduce((acc, d) => acc + d.count, 0)} Total
            </CustomText>
          </View>
        </View>

        {/* Animated 7-Day Growing Bar Chart */}
        <View style={styles.barsRow}>
          {normalizedDays.map((day, idx) => (
            <AnimatedAttendanceBar
              key={`${day.dayShort}-${idx}`}
              day={day}
              index={idx}
              maxVal={maxVal}
              maxHeight={110}
              isSelected={idx === selectedDayIndex}
              onPress={() => setSelectedDayIndex(idx)}
            />
          ))}
        </View>

        {/* Date Range Selector Pill with Arrows */}
        <View style={styles.paginationRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handlePrevDay}
            style={styles.pageButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          </TouchableOpacity>

          <CustomText style={styles.rangeText}>{displayRange}</CustomText>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleNextDay}
            style={styles.pageButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Checked-in Members Section with Person In & Out Time */}
      <View style={styles.rosterHeaderRow}>
        <CustomText style={styles.sectionHeading}>
          {selectedDay ? `${selectedDay.dayLabel} Attendance Roster` : "Recent Attendance"}
        </CustomText>
        <CustomText style={styles.rosterCountText}>
          {filteredRoster.length} attendee{filteredRoster.length === 1 ? "" : "s"}
        </CustomText>
      </View>

      {filteredRoster.length === 0 ? (
        <View style={styles.emptyRosterCard}>
          <Ionicons name="people-outline" size={36} color="rgba(255, 255, 255, 0.4)" />
          <CustomText style={styles.emptyRosterTitle}>No Check-ins Recorded</CustomText>
          <CustomText style={styles.emptyRosterDesc}>
            Members who check in via QR or manual entry will appear here with live In & Out times.
          </CustomText>
        </View>
      ) : (
        filteredRoster.map((item, index) => {
          const isCurrentlyInGym = item.isActiveNow || !item.checkedOutAt;
          return (
            <View key={`${item._id}-${index}`} style={styles.memberCard}>
              {/* Top Row: Avatar + Name + Plan Status + Contact Button */}
              <View style={styles.memberTopRow}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  <Image
                    source={getProfileImageSource(
                      item.memberId.profileImage,
                      item.memberId._id || item.memberId.name,
                    )}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                </View>

                {/* Member Info */}
                <View style={styles.memberInfoCol}>
                  <View style={styles.memberNameRow}>
                    <CustomText style={styles.memberName} numberOfLines={1}>
                      {item.memberId.name}
                    </CustomText>
                    {isCurrentlyInGym && (
                      <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <CustomText style={styles.liveText}>In Gym</CustomText>
                      </View>
                    )}
                  </View>
                  <CustomText style={styles.membershipStatus} numberOfLines={1}>
                    {item.membershipStatus}
                  </CustomText>
                </View>

                {/* Contact Button */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleContactPress(item)}
                  style={styles.contactButton}
                >
                  <CustomText style={styles.contactButtonText}>Contact</CustomText>
                </TouchableOpacity>
              </View>

              {/* Bottom Row: In Time & Out Time Chips */}
              <View style={styles.timeChipsRow}>
                {/* In Time */}
                <View style={styles.timeChip}>
                  <Feather name="log-in" size={13} color="#2A80FF" style={styles.timeChipIcon} />
                  <CustomText style={styles.timeChipLabel}>In:</CustomText>
                  <CustomText style={styles.timeChipValue}>{item.inTime}</CustomText>
                </View>

                {/* Out Time */}
                <View
                  style={[
                    styles.timeChip,
                    isCurrentlyInGym ? styles.timeChipActive : styles.timeChipClosed,
                  ]}
                >
                  <Feather
                    name="log-out"
                    size={13}
                    color={isCurrentlyInGym ? "#2A80FF" : "rgba(255,255,255,0.7)"}
                    style={styles.timeChipIcon}
                  />
                  <CustomText style={styles.timeChipLabel}>Out:</CustomText>
                  <CustomText style={[styles.timeChipValue, isCurrentlyInGym && styles.activeNowText]}>
                    {isCurrentlyInGym ? "Active Now" : item.outTime}
                  </CustomText>
                </View>

                {/* Duration */}
                {item.duration && (
                  <View style={styles.durationChip}>
                    <Ionicons
                      name="timer-outline"
                      size={13}
                      color="rgba(255,255,255,0.6)"
                      style={styles.timeChipIcon}
                    />
                    <CustomText style={styles.durationValue}>{item.duration}</CustomText>
                  </View>
                )}
              </View>
            </View>
          );
        })
      )}

      {/* Contact Sheet */}
      <OrganizerContactSheet
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        seed={contactSeed}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  chartCard: {
    backgroundColor: "rgba(28, 28, 28, 0.85)",
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  chartHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
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
  totalBadge: {
    backgroundColor: "rgba(8, 108, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  totalBadgeText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#2A80FF",
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    marginBottom: 16,
    height: 155,
  },
  barColumn: {
    alignItems: "center",
    flex: 1,
  },
  selectedPill: {
    backgroundColor: "#086CFF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  selectedPillText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#FFFFFF",
  },
  barContainer: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 6,
  },
  barShape: {
    width: "74%",
    backgroundColor: "#2A80FF",
    borderRadius: 6,
  },
  selectedBarShape: {
    backgroundColor: "#60A5FA",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  dayShortText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    textTransform: "uppercase",
  },
  selectedDayShortText: {
    color: "#FFFFFF",
  },
  countText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  selectedCountText: {
    color: "#60A5FA",
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
  rangeText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  rosterHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FFFFFF",
  },
  rosterCountText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
  },
  emptyRosterCard: {
    backgroundColor: "rgba(25, 25, 25, 0.7)",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  emptyRosterTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
    marginTop: 10,
  },
  emptyRosterDesc: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
    textAlign: "center",
    marginTop: 4,
  },
  memberCard: {
    backgroundColor: "rgba(25, 25, 25, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.07)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  memberTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  memberInfoCol: {
    flex: 1,
    marginRight: 8,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    flexShrink: 1,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2A80FF",
  },
  liveText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#2A80FF",
  },
  membershipStatus: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: "#FFFFFF",
    height: 30,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  contactButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#000000",
  },
  timeChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  timeChipActive: {
    backgroundColor: "rgba(42, 128, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.25)",
  },
  timeChipClosed: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  timeChipIcon: {
    marginRight: 1,
  },
  timeChipLabel: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
  timeChipValue: {
    ...fontTextStyles.tenSemiBoldBlack,
    color: "#FFFFFF",
  },
  activeNowText: {
    color: "#2A80FF",
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginLeft: "auto",
  },
  durationValue: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.65)",
  },
});

export default AttendanceAnalyticsView;

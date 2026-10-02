import React from "react";
import { View, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { normalizeRemoteImageUri } from "@/utils/resolveRemoteImageUri";
import { fontTextStyles } from "@/utils/typography";
import type { GymBusinessProfile, PayoutAccountSummary } from "@/types/gym/businessPlan.types";
import { BusinessProStatusBadge } from "./BusinessProStatusBadge";

interface GymProfileOverviewCardProps {
  gymProfile: GymBusinessProfile;
  payoutAccount?: PayoutAccountSummary | null;
  isPro?: boolean;
  onEditPress?: () => void;
  onPayoutAccountPress?: () => void;
  onSharePress?: () => void;
}

export const GymProfileOverviewCard: React.FC<GymProfileOverviewCardProps> = ({
  gymProfile,
  payoutAccount,
  isPro = false,
  onEditPress,
  onPayoutAccountPress,
  onSharePress,
}) => {
  const rawName = gymProfile?.name?.trim() || gymProfile?.businessName?.trim() || "";
  const isDefaultUnregistered =
    !rawName ||
    rawName.toLowerCase() === "register your gym" ||
    rawName.toLowerCase() === "register your business";

  const displayName = isDefaultUnregistered ? "Register Your Business" : rawName;
  const displayAddress =
    gymProfile?.address?.trim() || gymProfile?.location?.trim() || "Get listed on STRON Business";
  const tags = gymProfile?.tags && gymProfile.tags.length > 0 ? gymProfile.tags : [];
  const progressPercent =
    typeof gymProfile?.verificationProgress === "number" ? gymProfile.verificationProgress : 0;

  const WEEKDAY_KEYS = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];
  const todayDayIndex = new Date().getDay();
  const todayKey = WEEKDAY_KEYS[todayDayIndex];

  const weeklyHours =
    gymProfile?.operatingHours?.weeklyHours || (gymProfile as any)?.openingHours || [];

  const format12HourTime = (timeStr?: string | null): string => {
    if (!timeStr) return "";
    const trimmed = String(timeStr).trim();
    if (!trimmed) return "";
    if (/am|pm/i.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return trimmed;
    let hour = parseInt(match[1], 10);
    const min = match[2];
    const ampm = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return `${hour}:${min} ${ampm}`;
  };

  const formatSlotLabel = (openTime?: string | null, closeTime?: string | null): string => {
    if (!openTime) return "";
    const openFormatted = format12HourTime(openTime);
    if (closeTime) {
      const closeFormatted = format12HourTime(closeTime);
      return `Open ${openFormatted} - ${closeFormatted}`;
    }
    if (!openFormatted.toLowerCase().startsWith("open")) {
      return `Open ${openFormatted}`;
    }
    return openFormatted;
  };

  const isMatchingToday = (h: any): boolean => {
    if (!h) return false;
    const dayStr = String(h.day || h.dayKey || h.dayName || "")
      .toUpperCase()
      .trim();
    return (
      dayStr === todayKey || dayStr === todayKey.slice(0, 3) || dayStr === String(todayDayIndex)
    );
  };

  const isDayAvailable = (h: any): boolean => {
    if (!h) return false;
    if (h.isAvailable !== undefined) return Boolean(h.isAvailable);
    if (h.isOpen !== undefined) return Boolean(h.isOpen);
    return Boolean(h.openTime || h.open);
  };

  const hasAnyWeeklyHours =
    Array.isArray(weeklyHours) &&
    weeklyHours.length > 0 &&
    weeklyHours.some(
      (h: any) => isDayAvailable(h) && Boolean(h.openTime || h.open || (h as any).morning),
    );

  const todaySlots = Array.isArray(weeklyHours)
    ? weeklyHours.filter((h: any) => isMatchingToday(h) && isDayAvailable(h))
    : [];

  const resolveDisplaySlots = (): string[] => {
    const rawSlots: string[] = [];

    if (todaySlots.length > 0) {
      for (const slot of todaySlots) {
        const openVal = slot.openTime || slot.open || (slot as any).morning;
        const closeVal = slot.closeTime || slot.close || (slot as any).evening;

        if (Array.isArray((slot as any).slots) && (slot as any).slots.length > 0) {
          for (const s of (slot as any).slots) {
            if (s) {
              const label = formatSlotLabel(s.openTime || s.open || s, s.closeTime || s.close);
              if (label && !rawSlots.includes(label)) rawSlots.push(label);
            }
          }
        } else if (openVal && closeVal) {
          const label = formatSlotLabel(openVal, closeVal);
          if (label && !rawSlots.includes(label)) rawSlots.push(label);
        } else if (openVal) {
          const label = formatSlotLabel(openVal);
          if (label && !rawSlots.includes(label)) rawSlots.push(label);
        }
      }
    }

    return rawSlots.slice(0, 2);
  };

  const displaySlots = resolveDisplaySlots();

  const payoutStatus = payoutAccount?.verificationStatus || gymProfile?.payoutVerificationStatus;

  const isKycFailed = payoutStatus === "FAILED" || payoutStatus === "REJECTED";
  const isFullyVerified = progressPercent >= 100 && payoutStatus === "VERIFIED";

  let statusTitle = "Incomplete profile";
  let statusTitleColor = "#FFFFFF";
  let percentColor = "#2A80FF";
  let progressBarColor = "#2A80FF";
  let subtitleText = "Complete your profile to receive payouts";

  if (isFullyVerified) {
    statusTitle = "Verified";
    statusTitleColor = "#61DC60";
    percentColor = "#2A80FF";
    progressBarColor = "#2A80FF";
    subtitleText = "Payouts processed within 5 business days of sale";
  } else if (isKycFailed) {
    statusTitle = "Verification Failed, Click to Retry";
    statusTitleColor = "#FF4D4D";
    percentColor = "#FF4D4D";
    progressBarColor = "#FF4D4D";
    subtitleText = "Bank verification failed. Tap to update your bank account.";
  }

  return (
    <View style={styles.cardContainer}>
      {/* Business Identity Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeftCol}>
          {/* Business Logo / Avatar with Default Image Fallback */}
          <View style={styles.avatarWrapper}>
            {gymProfile.logoUrl ? (
              <Image
                source={{
                  uri: normalizeRemoteImageUri(gymProfile.logoUrl) || gymProfile.logoUrl,
                }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            ) : (
              <Image
                source={images.ONBOARDING.BUSINESS_1}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            )}
          </View>

          {/* Name & Address */}
          <View style={styles.businessTextCol}>
            <View style={styles.nameRow}>
              <CustomText style={styles.displayName} numberOfLines={1}>
                {displayName}
              </CustomText>
              <BusinessProStatusBadge isPro={isPro} showPartnerFallback={false} />
            </View>
            <CustomText style={styles.displayAddress} numberOfLines={2}>
              {displayAddress}
            </CustomText>
          </View>
        </View>

        <View style={styles.headerActions}>
          {onSharePress && !isDefaultUnregistered ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onSharePress}
              style={styles.editButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Share listing"
            >
              <Feather name="share-2" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onEditPress}
            style={styles.editButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="edit-2" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Amenity / Feature Tag Chips */}
      {tags.length > 0 ? (
        <View style={styles.tagChipsRow}>
          {tags.map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.tagChip}>
              <CustomText style={styles.tagText}>{tag}</CustomText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Operating Hours / Today indicator */}
      <View style={styles.hoursRow}>
        <View style={styles.hoursIconCol}>
          <Ionicons name="time-outline" size={24} color="#2A80FF" />
          <CustomText style={styles.todayText}>today</CustomText>
        </View>
        <View style={styles.slotsRow}>
          {displaySlots.length > 0 ? (
            displaySlots.map((slotLabel, index) => {
              const cleanSlot = slotLabel.replace(/^Open\s+/i, "");
              return (
                <React.Fragment key={`${slotLabel}-${index}`}>
                  {index > 0 && <CustomText style={styles.slotDivider}>|</CustomText>}
                  <CustomText style={styles.slotText}>
                    {cleanSlot}
                  </CustomText>
                </React.Fragment>
              );
            })
          ) : (
            <CustomText style={styles.noTimingText}>
              {hasAnyWeeklyHours ? "Closed today" : "No timing added"}
            </CustomText>
          )}
        </View>
      </View>

      {/* Profile Completion / Payout Verification Progress */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPayoutAccountPress || onEditPress}
        style={styles.progressContainer}
      >
        <View style={styles.progressHeader}>
          <View style={styles.statusLabelRow}>
            {isKycFailed ? (
              <Ionicons name="alert-circle" size={16} color="#FF4D4D" style={{ marginRight: 6 }} />
            ) : null}
            <CustomText style={[styles.statusTitle, { color: statusTitleColor }]}>
              {statusTitle}
            </CustomText>
          </View>
          <CustomText style={[styles.percentText, { color: percentColor }]}>{progressPercent}%</CustomText>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarBackground}>
          <View
            style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: progressBarColor }]}
          />
        </View>

        {/* Payout Notice */}
        <CustomText style={styles.subtitleText}>{subtitleText}</CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#1C1C1C",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerLeftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarWrapper: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#202538",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  businessTextCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    ...fontTextStyles.twentyFourSemiBoldBlack,
    color: "#FFFFFF",
    flexShrink: 1,
  },
  displayAddress: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  tagChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  tagChip: {
    backgroundColor: "#545454",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  tagText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#FFFFFF",
  },
  hoursRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  hoursIconCol: {
    alignItems: "center",
    marginRight: 12,
  },
  todayText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
  },
  slotsRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 4,
  },
  slotDivider: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.4)",
  },
  slotText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  noTimingText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
  progressContainer: {
    marginBottom: 4,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  statusTitle: {
    ...fontTextStyles.sixteenMediumBlack,
  },
  percentText: {
    ...fontTextStyles.sixteenMediumBlack,
  },
  progressBarBackground: {
    height: 6,
    width: "100%",
    backgroundColor: "#313131",
    borderRadius: 9999,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 9999,
  },
  subtitleText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
});

export default GymProfileOverviewCard;

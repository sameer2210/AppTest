import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import EventFormatBanner from "@/components/EventFormatBanner";
import { fontTextStyles } from "@/utils/typography";

// ── Types ──

export type EventItem = {
  id: string;
  eventKey?: string;
  title: string;
  subtitle: string;
  locationDetails: string;
  isEnrolled?: boolean;
  priceText?: string;
  imageUri?: string;
  format?: string;
  bannerName?: string | null;
};

type Props = {
  event: EventItem;
  onCheckIn?: (event: EventItem) => void;
  onSelectEvent?: (event: EventItem) => void;
};

// ── Main Card Component ──

export const EventSelectionCard: React.FC<Props> = memo(({ event, onCheckIn, onSelectEvent }) => {
  const handlePress = () => (event.isEnrolled ? onCheckIn?.(event) : onSelectEvent?.(event));

  return (
    <PressableScale onPress={handlePress} style={s.card}>
      {/* Left Event Banner Artwork with Logo Circle */}
      <View style={s.leftBanner}>
        <EventFormatBanner
          format={event.format}
          logoUri={event.imageUri}
          bannerName={event.bannerName}
          alwaysShowLogoCircle={true}
          resizeMode="cover"
        />
      </View>

      {/* Right Details & Action */}
      <View style={s.rightContent}>
        <View>
          <CustomText style={s.title} numberOfLines={1}>
            {event.title}
          </CustomText>
          <CustomText style={s.subtitle} numberOfLines={1}>
            {event.subtitle}
          </CustomText>
          <CustomText style={s.location} numberOfLines={1}>
            {event.locationDetails}
          </CustomText>
        </View>

        {event.isEnrolled ? (
          <View style={s.enrolledRow}>
            <PressableScale onPress={() => onCheckIn?.(event)} style={s.checkInBtn}>
              <CustomText style={s.checkInText}>Check In</CustomText>
            </PressableScale>
          </View>
        ) : (
          <View style={s.priceRow}>
            <CustomText style={s.priceText}>{event.priceText || "Starts from ₹299"}</CustomText>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        )}
      </View>
    </PressableScale>
  );
});

EventSelectionCard.displayName = "EventSelectionCard";
export default EventSelectionCard;

// ── Styles ──

const CARD_H = 112;
const BANNER_W = 168;
const CARD_RADIUS = 12;

const s = StyleSheet.create({
  card: {
    height: CARD_H,
    maxHeight: CARD_H,
    marginBottom: 12,
    width: "100%",
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.25)",
    backgroundColor: "#07162C",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  leftBanner: {
    width: BANNER_W,
    height: "100%",
    overflow: "hidden",
    borderTopLeftRadius: CARD_RADIUS,
    borderBottomLeftRadius: CARD_RADIUS,
    backgroundColor: "#050F1E",
  },

  rightContent: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "space-between",
  },

  title: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  subtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#94A3B8",
    marginTop: 2,
  },
  location: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#64748B",
    marginTop: 2,
  },

  enrolledRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },

  checkInBtn: {
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkInText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  priceText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
});

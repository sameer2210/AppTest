import React from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Linking,
  StyleSheet,
} from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { normalizeRemoteImageUri } from "@/utils/resolveRemoteImageUri";

export interface PlanPreviewBusinessData {
  businessName?: string;
  logo?: string | null;
  bannerUrl?: string | null;
  location?: string | null;
  mapLink?: string | null;
  phone?: string | null;
  email?: string | null;
  services?: string[];
  openingHours?: {
    day: string;
    isAvailable: boolean;
    openTime?: string | null;
    closeTime?: string | null;
  }[];
}

interface PlanPreviewGymCardProps {
  business?: PlanPreviewBusinessData | null;
  onContactPress: () => void;
}

const DAY_META = [
  { key: "MONDAY", dayKey: "M", dayName: "Monday" },
  { key: "TUESDAY", dayKey: "T", dayName: "Tuesday" },
  { key: "WEDNESDAY", dayKey: "W", dayName: "Wednesday" },
  { key: "THURSDAY", dayKey: "Th", dayName: "Thursday" },
  { key: "FRIDAY", dayKey: "F", dayName: "Friday" },
  { key: "SATURDAY", dayKey: "Sat", dayName: "Saturday" },
  { key: "SUNDAY", dayKey: "S", dayName: "Sunday" },
] as const;

const formatTime12h = (timeStr?: string | null): string => {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(trimmed)) return trimmed.toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return trimmed;
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = hours < 10 ? `0${hours}` : `${hours}`;
  return `${strHours}:${minutes} ${ampm}`;
};

export const PlanPreviewGymCard: React.FC<PlanPreviewGymCardProps> = ({
  business,
  onContactPress,
}) => {
  const businessName = business?.businessName?.trim() || "Business";
  const businessLocation = business?.location || "";
  const mapLink = business?.mapLink;
  const logoUri = normalizeRemoteImageUri(business?.logo || null);
  const services =
    Array.isArray(business?.services) && business.services.length > 0 ? business.services : [];

  const scheduleRows = DAY_META.map((dayMeta) => {
    const matched = business?.openingHours?.find(
      (h) => h.day?.toUpperCase() === dayMeta.key,
    );
    const openTime = matched?.openTime ? formatTime12h(matched.openTime) : "";
    const closeTime = matched?.closeTime ? formatTime12h(matched.closeTime) : "";
    const isAvailable = Boolean(matched?.isAvailable) && Boolean(openTime || closeTime);
    return {
      ...dayMeta,
      isAvailable,
      openTime,
      closeTime,
    };
  });

  const handleMap = () => {
    if (mapLink) {
      Linking.openURL(mapLink).catch(() => {});
    } else if (businessLocation) {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(businessLocation)}`).catch(
        () => {},
      );
    }
  };

  return (
    <View style={styles.card}>
      {/* Top Row: Avatar + Name/Location + Contact CTA */}
      <View style={styles.gymHeaderRow}>
        <View style={styles.gymInfoLeft}>
          {/* Gym Logo / Avatar */}
          <View style={styles.gymAvatarContainer}>
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                style={styles.gymAvatarImage}
                resizeMode="cover"
              />
            ) : null}
          </View>

          {/* Gym Name & Location */}
          <View style={styles.gymDetailsCol}>
            <CustomText style={styles.gymName} numberOfLines={1}>
              {businessName}
            </CustomText>
            <CustomText style={styles.gymLocation} numberOfLines={1}>
              {businessLocation}
            </CustomText>
            <TouchableOpacity activeOpacity={0.7} onPress={handleMap}>
              <CustomText style={styles.mapLink}>Map Link</CustomText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Now CTA */}
        <TouchableOpacity activeOpacity={0.7} onPress={onContactPress} style={styles.contactButton}>
          <CustomText style={styles.contactButtonText}>Contact Now</CustomText>
        </TouchableOpacity>
      </View>

      {/* Services Pills Row */}
      <View style={styles.servicesRow}>
        {services.map((service, idx) => (
          <View key={`${service}-${idx}`} style={styles.servicePill}>
            <CustomText style={styles.serviceText}>{service}</CustomText>
          </View>
        ))}
      </View>

      {/* Opening Hours */}
      <View style={styles.openingHoursContainer}>
        <CustomText style={styles.openingHoursTitle}>Opening Hours</CustomText>

        {/* Header Columns */}
        <View style={styles.scheduleHeaderRow}>
          <View style={styles.scheduleHeaderSpacer} />
          <CustomText style={styles.scheduleHeaderLabel}>Opens</CustomText>
          <CustomText style={styles.scheduleHeaderLabel}>Closes</CustomText>
        </View>

        {/* Day Schedules */}
        <View style={styles.scheduleList}>
          {scheduleRows.map((item, idx) => (
            <View key={`schedule-${idx}`} style={styles.scheduleRow}>
              {/* Day Initial Circle */}
              <View style={styles.dayCircle}>
                <CustomText style={styles.dayCircleText}>{item.dayKey}</CustomText>
              </View>

              {item.isAvailable ? (
                <>
                  {/* Opens Time Box */}
                  <View style={styles.timeBox}>
                    <CustomText style={styles.timeBoxText}>{item.openTime}</CustomText>
                  </View>

                  {/* Closes Time Box */}
                  <View style={styles.timeBox}>
                    <CustomText style={styles.timeBoxText}>{item.closeTime}</CustomText>
                  </View>
                </>
              ) : (
                /* Unavailable Full Box */
                <View style={styles.unavailableBox}>
                  <CustomText style={styles.unavailableText}>Unavailable</CustomText>
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#191919",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  gymHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gymInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  gymAvatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  gymAvatarImage: {
    width: "100%",
    height: "100%",
  },
  gymDetailsCol: {
    flex: 1,
  },
  gymName: {
    ...headingTextStyles.twentyBoldBlack,
    color: "#FFFFFF",
  },
  gymLocation: {
    ...fontTextStyles.twelveRegularBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  mapLink: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#2671F2",
    marginTop: 2,
  },
  contactButton: {
    backgroundColor: "#086CFF",
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  contactButtonText: {
    ...fontTextStyles.thirteenMediumBlack,
    color: "#FFFFFF",
  },
  servicesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  servicePill: {
    backgroundColor: "#545454",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  serviceText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FFFFFF",
  },
  openingHoursContainer: {
    backgroundColor: "#141417",
    borderRadius: 12,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  openingHoursTitle: {
    ...headingTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  scheduleHeaderSpacer: {
    width: 32,
    marginRight: 10,
  },
  scheduleHeaderLabel: {
    ...fontTextStyles.twelveRegularBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    flex: 1,
  },
  scheduleList: {
    gap: 8,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  dayCircleText: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  timeBox: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  timeBoxText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FFFFFF",
  },
  unavailableBox: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  unavailableText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
});

export default PlanPreviewGymCard;

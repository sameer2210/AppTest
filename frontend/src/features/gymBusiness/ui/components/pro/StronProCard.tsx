import React, { memo } from "react";
import { Image, StyleProp, TouchableOpacity, View, ViewStyle, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { fontTextStyles } from "@/utils/typography";

export interface StronProCardProps {
  /** Whether the user currently has an active STRON PRO subscription */
  isPro?: boolean;
  /** Custom renewal date / days / ISO string (e.g. "renews in 12 days", 12, or "2026-09-12") */
  renewalDateText?: string | number | Date | null;
  /** Subtitle text (defaults to "Analytics · WhatsApp · Automation") */
  subtitle?: string;
  /** Callback when card is pressed */
  onPress?: () => void;
  /** Optional container style overrides */
  containerStyle?: StyleProp<ViewStyle>;
}

export const formatRenewalDaysText = (dateInput?: string | number | Date | null): string => {
  if (typeof dateInput === "number") {
    if (dateInput > 100000000000) {
      const now = Date.now();
      const diffMs = dateInput - now;
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (days === 0) return "renews today";
      return `renews in ${days} ${days === 1 ? "day" : "days"}`;
    }
    if (dateInput === 0) return "renews today";
    return `renews in ${dateInput} ${dateInput === 1 ? "day" : "days"}`;
  }

  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (trimmed.toLowerCase().startsWith("renews")) {
      return trimmed;
    }
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && String(num) === trimmed) {
      if (num === 0) return "renews today";
      return `renews in ${num} ${num === 1 ? "day" : "days"}`;
    }
    const parsedDate = new Date(trimmed);
    if (!isNaN(parsedDate.getTime())) {
      const now = new Date();
      const diffMs = parsedDate.getTime() - now.getTime();
      const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (days === 0) return "renews today";
      return `renews in ${days} ${days === 1 ? "day" : "days"}`;
    }
  }

  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    const now = new Date();
    const diffMs = dateInput.getTime() - now.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (days === 0) return "renews today";
    return `renews in ${days} ${days === 1 ? "day" : "days"}`;
  }

  return "renews in 14 days";
};

const PRO_GRADIENT_COLORS = ["#2A80FF", "#64A8FF", "#F4F9FF"] as const;
const UPGRADE_GRADIENT_COLORS = ["#164FB8", "#0B2763", "#040E26"] as const;
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END = { x: 1, y: 1 };

export const StronProCard: React.FC<StronProCardProps> = memo(({
  isPro = false,
  renewalDateText,
  subtitle = "Analytics · WhatsApp · Automation",
  onPress,
  containerStyle,
}) => {
  const renewalLabel = formatRenewalDaysText(renewalDateText);
  const iconSource = images.PRO_LOGO || images.GYM_BUSINESS?.STRON_PRO_CROWN_DIAMOND;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.cardContainer,
        isPro ? styles.cardBorderPro : styles.cardBorderStandard,
        containerStyle,
      ]}
    >
      <LinearGradient
        colors={isPro ? PRO_GRADIENT_COLORS : UPGRADE_GRADIENT_COLORS}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.gradientFill}
      >
        {/* Left Crown Icon (100x100 in fixed bounding box, neatly clipped by card's overflow-hidden) */}
        <View style={styles.crownContainer}>
          <Image
            source={iconSource}
            style={styles.crownImage}
            resizeMode="contain"
          />
        </View>

        {/* Center Text Area */}
        <View style={styles.textContainer}>
          {isPro ? (
            <CustomText
              style={styles.titlePro}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              <CustomText style={styles.titleProBrand}>STRON PRO </CustomText>
              <CustomText style={styles.titleProRenewal}>{renewalLabel}</CustomText>
            </CustomText>
          ) : (
            <CustomText
              style={styles.titleUpgrade}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              Upgrade to STRON PRO
            </CustomText>
          )}

          <CustomText
            style={[
              styles.subtitleBase,
              isPro ? styles.subtitlePro : styles.subtitleStandard,
            ]}
            numberOfLines={2}
          >
            {subtitle}
          </CustomText>
        </View>

        {/* Right Arrow Chevron */}
        <Ionicons
          name="chevron-forward"
          size={22}
          color={isPro ? "#0A1C36" : "#FFFFFF"}
        />
      </LinearGradient>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    minHeight: 74,
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
  },
  cardBorderPro: {
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  cardBorderStandard: {
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  gradientFill: {
    width: "100%",
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
    paddingRight: 10,
    paddingVertical: 8,
  },
  crownContainer: {
    width: 48,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -2,
    marginRight: 6,
    overflow: "visible",
  },
  crownImage: {
    width: 72,
    height: 72,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    paddingRight: 6,
  },
  titlePro: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#000000",
  },
  titleProBrand: {
    ...fontTextStyles.fourteenExtraBoldBlack,
    color: "#000000",
  },
  titleProRenewal: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#0A1C36",
  },
  titleUpgrade: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  subtitleBase: {
    ...fontTextStyles.twelveNormalBlack,
    marginTop: 2,
  },
  subtitlePro: {
    color: "#183B70",
  },
  subtitleStandard: {
    color: "#9DBDE8",
  },
});

export default StronProCard;

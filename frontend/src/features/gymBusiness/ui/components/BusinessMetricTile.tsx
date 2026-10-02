import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type MetricTileVariant = "neutral" | "blue";

interface BusinessMetricTileProps {
  value: string | number;
  label: string;
  onPress?: () => void;
  variant?: MetricTileVariant;
  icon?: React.ReactNode;
}

const TILE_SHADOW = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.12,
  shadowRadius: 3,
  elevation: 2,
};

export const BusinessMetricTile: React.FC<BusinessMetricTileProps> = ({
  value,
  label,
  onPress,
  variant = "neutral",
  icon,
}) => {
  const isBlue = variant === "blue";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.tile,
        isBlue ? styles.tileBlue : styles.tileNeutral,
        TILE_SHADOW,
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconSlot}>{icon}</View>
        <Ionicons
          name="chevron-forward"
          size={13}
          color={isBlue ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)"}
        />
      </View>
      <CustomText
        style={styles.value}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </CustomText>
      <CustomText style={styles.label} numberOfLines={2}>
        {label}
      </CustomText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    height: 94,
    borderRadius: 4,
    paddingLeft: 6,
    paddingRight: 5,
    paddingTop: 7,
    paddingBottom: 6,
  },
  tileNeutral: {
    backgroundColor: "#313131",
  },
  tileBlue: {
    backgroundColor: "#096BFC",
  },
  topRow: {
    height: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconSlot: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  value: {
    ...fontTextStyles.thirtyFourMediumBlack,
    color: "#FFFFFF",
    marginTop: 2,
    ...(Platform.OS === "android" ? { includeFontPadding: false } : null),
  },
  label: {
    ...fontTextStyles.twelveNormalBlack,
    marginTop: "auto",
    color: "rgba(214,214,214,0.6)",
  },
});

export default BusinessMetricTile;

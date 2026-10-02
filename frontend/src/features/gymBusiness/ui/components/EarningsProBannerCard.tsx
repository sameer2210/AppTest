import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Line } from "react-native-svg";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { StronProCard } from "./pro/StronProCard";
import type { EarningsSummary } from "@/types/gym/businessPlan.types";

interface EarningsProBannerCardProps {
  earnings: EarningsSummary;
  renewalDateText?: string | number | Date | null;
  onPress?: () => void;
}

export const EarningsProBannerCard: React.FC<EarningsProBannerCardProps> = ({
  earnings,
  renewalDateText,
  onPress,
}) => {
  return (
    <View style={styles.cardContainer}>
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <CustomText style={styles.headerLabel}>
          Total Revenue this Month (Gross)
        </CustomText>
      </View>

      {/* Main Revenue Figure */}
      <CustomText style={styles.revenueText}>
        {earnings.formattedRevenue || "₹0"}
      </CustomText>

      {/* True Dotted Divider Line via SVG */}
      <View style={styles.dottedDivider}>
        <Svg height="2" width="100%">
          <Line
            x1="0"
            y1="1"
            x2="1000"
            y2="1"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="2"
            strokeDasharray="4 4"
          />
        </Svg>
      </View>

      {/* STRON PRO Action Button (Purchase or Manage) */}
      <StronProCard
        isPro={earnings.isPro}
        renewalDateText={renewalDateText}
        onPress={onPress}
        containerStyle={{ marginBottom: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#1C1C1C",
    borderRadius: 12,
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
    marginBottom: 6,
  },
  headerLabel: {
    ...fontTextStyles.eighteenNormalBlack,
    flex: 1,
    marginRight: 8,
    color: "rgba(255, 255, 255, 0.6)",
  },
  revenueText: {
    ...fontTextStyles.thirtyFourSemiBoldBlack,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  dottedDivider: {
    width: "100%",
    marginBottom: 16,
    overflow: "hidden",
    height: 2,
  },
});

export default EarningsProBannerCard;

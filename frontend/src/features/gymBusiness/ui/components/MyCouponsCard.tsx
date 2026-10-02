import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import type { CouponSummary } from "@/types/gym/businessPlan.types";

interface MyCouponsCardProps {
  coupons?: CouponSummary;
  onManagePress?: () => void;
}

export const MyCouponsCard: React.FC<MyCouponsCardProps> = ({ coupons, onManagePress }) => {
  const count = coupons?.activeCount ?? 0;

  return (
    <View style={styles.cardContainer}>
      {/* Left Column: Title with Coupon Badge Icon + Subtitle */}
      <View style={styles.leftColumn}>
        <View style={styles.titleRow}>
          <CustomText style={styles.titleText}>My Coupons</CustomText>
          <MaterialCommunityIcons
            name="brightness-percent"
            size={29}
            color="#FFFFFF"
            style={styles.percentIcon}
          />
        </View>
        <CustomText style={styles.subtitleText}>
          {count} {count === 1 ? "Coupon Active" : "Coupons Active"}
        </CustomText>
      </View>

      {/* Right Column: Manage Pill Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onManagePress}
        style={styles.manageButton}
        accessibilityRole="button"
        accessibilityLabel="Manage Coupons"
      >
        <CustomText style={styles.manageButtonText}>Manage</CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#191919",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 24,
    width: "100%",
    marginBottom: 16,
    minHeight: 93,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftColumn: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFFFFF",
  },
  percentIcon: {
    marginLeft: 8,
  },
  subtitleText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 4,
  },
  manageButton: {
    backgroundColor: "#575757",
    borderWidth: 1,
    borderColor: "#686868",
    height: 33,
    paddingHorizontal: 22,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  manageButtonText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
  },
});

export default MyCouponsCard;

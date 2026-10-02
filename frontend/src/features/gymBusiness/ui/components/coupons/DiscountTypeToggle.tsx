import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { CouponDiscountType } from "@/types/gym/coupon.types";

interface DiscountTypeToggleProps {
  value: CouponDiscountType;
  onChange: (type: CouponDiscountType) => void;
}

export const DiscountTypeToggle: React.FC<DiscountTypeToggleProps> = ({ value, onChange }) => {
  const isPercentage = value === "PERCENTAGE";

  return (
    <View style={styles.container}>
      {/* Option 1: By Percentage */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange("PERCENTAGE")}
        style={[
          styles.tab,
          isPercentage ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <CustomText
          style={[
            styles.tabText,
            isPercentage ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          By Percentage
        </CustomText>
      </TouchableOpacity>

      {/* Option 2: By Amount */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onChange("FIXED_AMOUNT")}
        style={[
          styles.tab,
          !isPercentage ? styles.tabActive : styles.tabInactive,
        ]}
      >
        <CustomText
          style={[
            styles.tabText,
            !isPercentage ? styles.tabTextActive : styles.tabTextInactive,
          ]}
        >
          By Amount
        </CustomText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    height: 60,
    borderRadius: 30,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    elevation: 3,
  },
  tabInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 16,
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextInactive: {
    color: "rgba(255, 255, 255, 0.6)",
  },
});

export default DiscountTypeToggle;

import React from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import CustomText from "@/components/CustomText";
import type { Coupon } from "@/types/gym/coupon.types";
import { showToastMessage } from "@/utils/app-utils";

interface CouponCardItemProps {
  coupon: Coupon;
  onDelete?: (id: string, code: string) => void;
  onEdit?: (coupon: Coupon) => void;
}

export const CouponCardItem: React.FC<CouponCardItemProps> = ({ coupon, onDelete, onEdit }) => {
  const isPercentage = coupon.type === "PERCENTAGE";
  const discountLabel = isPercentage
    ? `${coupon.discountPercentage || 0}% OFF`
    : `₹${coupon.discountAmount || 0} OFF`;

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(coupon.code);
    showToastMessage(`Copied code: ${coupon.code}`);
  };

  const couponId = coupon._id || coupon.id || "";

  // Remaining count logic
  let remainingText = "Unlimited";
  if (coupon.totalCoupons != null && coupon.totalCoupons > 0) {
    const used = coupon.usedCoupons ?? coupon.usedCount ?? 0;
    const left = Math.max(0, coupon.totalCoupons - used);
    remainingText = `${left} left`;
  }

  // Subtitle condition matching the screenshot
  let subtitleText = "";
  if (isPercentage && coupon.maximumDiscount && coupon.maximumDiscount > 0) {
    subtitleText = `Up to ₹${coupon.maximumDiscount} discount`;
  } else if (coupon.minimumOrderValue && coupon.minimumOrderValue > 0) {
    subtitleText = `On min. order ₹${coupon.minimumOrderValue}`;
  } else {
    subtitleText = "On all plans";
  }

  return (
    <View style={styles.cardContainer}>
      {/* Top Header Row: Code + Copy Icon & Remaining Count */}
      <View style={styles.headerRow}>
        <View style={styles.codeRow}>
          <CustomText style={styles.codeText}>{coupon.code}</CustomText>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleCopyCode}
            style={styles.copyButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Feather name="copy" size={15} color="rgba(255, 255, 255, 0.75)" />
          </TouchableOpacity>
        </View>

        <CustomText style={styles.remainingText}>{remainingText}</CustomText>
      </View>

      {/* Middle Row: Blue Discount Text & Subtitle */}
      <View style={styles.discountRow}>
        <CustomText style={styles.discountLabel}>{discountLabel}</CustomText>
        <CustomText style={styles.subtitleText}>{subtitleText}</CustomText>
      </View>

      {/* Bottom Action Row: Discard & Edit Buttons */}
      <View style={styles.actionsRow}>
        {/* Discard Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onDelete?.(couponId, coupon.code)}
          style={styles.discardButton}
        >
          <CustomText style={styles.discardText}>Discard</CustomText>
        </TouchableOpacity>

        {/* Edit Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onEdit?.(coupon)}
          style={styles.editButton}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <CustomText style={styles.editText}>Edit</CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#18191E",
    borderRadius: 22,
    padding: 20,
    width: "100%",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  codeText: {
    ...fontTextStyles.size24BoldBlack,
    color: "#FFFFFF",
    marginRight: 10,
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  remainingText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "rgba(255, 255, 255, 0.9)",
  },
  discountRow: {
    marginTop: 4,
    marginBottom: 16,
  },
  discountLabel: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#086CFF",
  },
  subtitleText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  discardButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#281518",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 79, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FF8A8A",
  },
  editButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#3E4045",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  editText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
    marginLeft: 6,
  },
});

export default CouponCardItem;

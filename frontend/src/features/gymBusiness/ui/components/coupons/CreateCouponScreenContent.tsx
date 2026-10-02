import React from "react";
import {
  View,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassBackButton, ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { screenContentContainerWideStyle } from "@/utils/screen-layout";
import { images } from "@/utils/images";

import type { CouponDiscountType, CouponFormErrors } from "@/types/gym/coupon.types";
import { DiscountTypeToggle } from "./DiscountTypeToggle";
import { CouponFormField } from "./CouponFormField";
import { CouponBottomActionBar } from "./CouponBottomActionBar";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

interface CreateCouponScreenContentProps {
  type: CouponDiscountType;
  onTypeChange: (type: CouponDiscountType) => void;
  code: string;
  onCodeChange: (code: string) => void;
  discountPercentage: string;
  onDiscountPercentageChange: (val: string) => void;
  discountAmount: string;
  onDiscountAmountChange: (val: string) => void;
  minimumOrderValue: string;
  onMinimumOrderValueChange: (val: string) => void;
  maximumDiscount: string;
  onMaximumDiscountChange: (val: string) => void;
  totalCoupons: string;
  onTotalCouponsChange: (val: string) => void;
  errors: CouponFormErrors;
  isSubmitting: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onBack: () => void;
}

export const CreateCouponScreenContent: React.FC<CreateCouponScreenContentProps> = ({
  type,
  onTypeChange,
  code,
  onCodeChange,
  discountPercentage,
  onDiscountPercentageChange,
  discountAmount,
  onDiscountAmountChange,
  minimumOrderValue,
  onMinimumOrderValueChange,
  maximumDiscount,
  onMaximumDiscountChange,
  totalCoupons,
  onTotalCouponsChange,
  errors,
  isSubmitting,
  onDiscard,
  onSave,
  onBack,
}) => {
  const isPercentage = type === "PERCENTAGE";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Home Background Image with light color on top & dark at bottom */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient matching Business Home */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        >
          {/* Header Row: Back Button & Title */}
          <View style={styles.header}>
            <GlassBackButton onPress={onBack} size={48} iconSize={24} />

            <CustomText style={styles.headerTitle}>
              Create Coupon
            </CustomText>
          </View>

          {/* Discount Type Toggle (Percentage vs Flat INR) */}
          <DiscountTypeToggle value={type} onChange={onTypeChange} />

          {/* 1. Coupon Code */}
          <CouponFormField
            label="Coupon Code"
            placeholder="e.g. SUMMER50"
            value={code}
            onChangeText={(val) => onCodeChange(val.toUpperCase())}
            error={errors.code}
            autoCapitalize="characters"
          />

          {/* 2. Dynamic Discount Fields based on type */}
          {isPercentage ? (
            <>
              <CouponFormField
                label="Discount Percentage"
                placeholder="e.g. 20"
                value={discountPercentage}
                onChangeText={onDiscountPercentageChange}
                error={errors.discountPercentage}
                keyboardType="numeric"
                suffix="%"
              />

              <CouponFormField
                label="Maximum Discount"
                placeholder="Unlimited"
                value={maximumDiscount}
                onChangeText={onMaximumDiscountChange}
                error={errors.maximumDiscount}
                keyboardType="numeric"
                prefix="₹"
              />
            </>
          ) : (
            <CouponFormField
              label="Discount Amount"
              placeholder="e.g. 500"
              value={discountAmount}
              onChangeText={onDiscountAmountChange}
              error={errors.discountAmount}
              keyboardType="numeric"
              prefix="₹"
            />
          )}

          {/* 3. Minimum Order Value */}
          <CouponFormField
            label="Minimum Order Value"
            placeholder="0"
            value={minimumOrderValue}
            onChangeText={onMinimumOrderValueChange}
            error={errors.minimumOrderValue}
            keyboardType="numeric"
            prefix="₹"
          />

          {/* 4. No. of Coupons */}
          <CouponFormField
            label="No. of Coupons"
            placeholder="Unlimited"
            value={totalCoupons}
            onChangeText={onTotalCouponsChange}
            error={errors.totalCoupons}
            keyboardType="numeric"
          />
        </ScrollView>

        {/* Floating Liquid Glass Bottom Buttons (Outside Scroller) */}
        <View style={styles.bottomBarContainer}>
          <CouponBottomActionBar
            onDiscard={onDiscard}
            onSave={onSave}
            isSubmitting={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    ...screenContentContainerWideStyle,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerTitle: {
    ...fontTextStyles.headingMedium,
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  bottomBarContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 18,
  },
});

export default CreateCouponScreenContent;

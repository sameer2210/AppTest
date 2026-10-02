import React, { useCallback, useState } from "react";
import {
  View,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { useAppDispatch } from "@/store/hooks";
import { validateCouponThunk } from "@/features/gymBusiness";
import { OnboardingHeader } from "./OnboardingHeader";
import { StepBadgeIcon } from "./StepBadgeIcon";

type Props = {
  onBack: () => void;
  onGetPro: () => void;
  onContinue: () => void;
  actionsLoading?: boolean;
};

const COMPARISON_FEATURES: readonly {
  readonly label: string;
  readonly free: boolean;
}[] = [
  { label: "Auto Renewal Plans", free: true },
  { label: "QR Attendance", free: true },
  { label: "Member Management", free: true },
  { label: "Advanced Analytics", free: false },
  { label: "WhatsApp Reminders", free: false },
  { label: "Unlimited Listing", free: false },
  { label: "Enhanced Listing Visibility", free: false },
  { label: "Referral Coupons", free: false },
  { label: "Priority Support", free: false },
];

const PRO_GRADIENT = ["#3B8AFF", "#1E6AE8", "#1554D4", "#0E3FA8"] as const;
const CTA_GRADIENT = ["#4A9BFF", "#2E72E7", "#1B5CD6"] as const;
const ROW_H = 34;
const HEADER_H = 36;

/**
 * Final business-onboarding step — fixed one-screen layout matching design
 * (glow bg, dense comparison table, Get STRON PRO CTA + coupon).
 */
export const BusinessStep4Success = ({
  onBack,
  onGetPro,
  onContinue,
  actionsLoading = false,
}: Props) => {
  const dispatch = useAppDispatch();
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponCode.trim()) {
      showToastMessage("Please enter a coupon code");
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const res = await dispatch(
        validateCouponThunk({ code: couponCode.trim(), amount: 999 }),
      ).unwrap();
      if (res.valid || res.success) {
        showToastMessage(`Coupon "${couponCode.trim().toUpperCase()}" applied successfully!`);
      } else {
        showToastMessage(res.message || "Invalid or expired coupon code");
      }
    } catch {
      showToastMessage("Failed to validate coupon code");
    } finally {
      setIsApplyingCoupon(false);
    }
  }, [couponCode, dispatch]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Same atmospheric glow as other business onboarding steps */}
      <Image
        source={images.ONBOARDING.BUSINESS_4}
        style={StyleSheet.absoluteFillObject}
        resizeMode="stretch"
      />
      <View style={styles.overlay} />

      <ScreenSafeArea edges={["top", "bottom"]}>
        <View style={styles.body}>
          <OnboardingHeader
            onBack={actionsLoading ? undefined : onBack}
            onSkip={actionsLoading ? undefined : onContinue}
            showSkip
          />

          <View style={styles.hero}>
            <StepBadgeIcon>
              <Ionicons name="checkmark" size={42} color="#34C759" />
            </StepBadgeIcon>
            <CustomText style={styles.title}>You are all Set.</CustomText>
            <CustomText style={styles.subtitle}>Automate your business and grow 10x faster.</CustomText>
          </View>

          {/* Dense table — content height, not stretched */}
          <View style={styles.tableCard}>
            <View style={styles.leftColumn}>
              <View style={[styles.tableHeaderRow, { height: HEADER_H }]}>
                <CustomText style={styles.tableHeaderFeatures}>Features</CustomText>
                <CustomText style={styles.tableHeaderFree}>FREE</CustomText>
              </View>
              {COMPARISON_FEATURES.map((item) => (
                <View key={item.label} style={[styles.featureRow, { height: ROW_H }]}>
                  <CustomText style={styles.featureLabel} numberOfLines={1}>
                    {item.label}
                  </CustomText>
                  <View style={styles.freeIconCell}>
                    {item.free ? (
                      <Ionicons name="checkmark" size={17} color="#FFFFFF" />
                    ) : (
                      <Ionicons name="close" size={17} color="#EF4444" />
                    )}
                  </View>
                </View>
              ))}
            </View>

            <LinearGradient
              colors={PRO_GRADIENT}
              locations={[0, 0.35, 0.7, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.proColumn}
            >
              <View style={[styles.proHeaderCell, { height: HEADER_H }]}>
                <CustomText style={styles.tableHeaderPro}>PRO</CustomText>
              </View>
              {COMPARISON_FEATURES.map((item) => (
                <View key={item.label} style={[styles.proIconCell, { height: ROW_H }]}>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </View>
              ))}
            </LinearGradient>
          </View>

          <View style={styles.spacer} />

          <View style={styles.footer}>
            {/* Design: icon + title on one line, price under — full-width glow CTA */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onGetPro}
              disabled={actionsLoading}
              style={[styles.upgradeButton, actionsLoading && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Get STRON PRO"
            >
              <LinearGradient
                colors={CTA_GRADIENT}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.upgradeGradient}
              >
                <View style={styles.ctaInner}>
                  <Image
                    source={images.GYM_BUSINESS.STRON_PRO_CROWN_DIAMOND}
                    style={styles.ctaIcon}
                    resizeMode="contain"
                  />
                  <View style={styles.ctaTextBlock}>
                    <CustomText style={styles.ctaTitle}>Get STRON PRO</CustomText>
                    <View style={styles.priceRow}>
                      <CustomText style={styles.priceAmount}>₹999</CustomText>
                      <CustomText style={styles.pricePeriod}> /month</CustomText>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            <CustomText style={styles.couponLabel}>Apply Coupon Code</CustomText>
            <View style={styles.couponInputContainer}>
              <TextInput
                style={styles.couponTextInput}
                value={couponCode}
                onChangeText={(text) => setCouponCode(text.toUpperCase())}
                placeholder="Enter coupon code"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.applyButton}
                activeOpacity={0.7}
                onPress={handleApplyCoupon}
                disabled={isApplyingCoupon}
              >
                {isApplyingCoupon ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <CustomText style={styles.applyButtonText}>Apply</CustomText>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onContinue}
              disabled={actionsLoading}
              style={[styles.continueButton, actionsLoading && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Continue"
            >
              <CustomText style={styles.continueButtonText}>Continue</CustomText>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenSafeArea>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030A16",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030A16",
    opacity: 0.45,
  },
  body: {
    flex: 1,
    paddingHorizontal: 18,
  },
  hero: {
    alignItems: "center",
    marginTop: -4,
    marginBottom: 12,
  },
  title: {
    ...headingTextStyles.twentyEightBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: -4,
  },
  subtitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.72)",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },
  tableCard: {
    width: "100%",
    backgroundColor: "rgba(22, 23, 27, 0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    overflow: "hidden",
  },
  leftColumn: {
    flex: 1,
    paddingVertical: 12,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  tableHeaderFeatures: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.55)",
  },
  tableHeaderFree: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.55)",
    width: 40,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
  },
  featureLabel: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255, 255, 255, 0.92)",
    flex: 1,
    paddingRight: 6,
  },
  freeIconCell: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  proColumn: {
    width: 64,
    paddingVertical: 12,
    alignItems: "center",
  },
  proHeaderCell: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255, 255, 255, 0.22)",
  },
  tableHeaderPro: {
    ...fontTextStyles.fourteenExtraBoldBlack,
    color: "#FFFFFF",
  },
  proIconCell: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  spacer: {
    flexGrow: 0,
    height: 10,
  },
  footer: {
    width: "100%",
  },
  upgradeButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
  },
  upgradeGradient: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  ctaInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaIcon: {
    width: 40,
    height: 40,
  },
  ctaTextBlock: {
    alignItems: "flex-start",
  },
  ctaTitle: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 0,
  },
  priceAmount: {
    ...fontTextStyles.sixteenExtraBoldBlack,
    color: "#FFFFFF",
  },
  pricePeriod: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.85)",
  },
  priceOriginal: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.45)",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  couponLabel: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.7)",
    marginBottom: 8,
  },
  couponInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.16)",
    borderRadius: 14,
    paddingLeft: 14,
    paddingRight: 8,
    height: 48,
  },
  couponTextInput: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    flex: 1,
    color: "#FFFFFF",
    paddingVertical: 0,
  },
  applyButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  applyButtonText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#000000",
  },
  continueButton: {
    marginTop: 10,
    height: 48,
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#2B82FF",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    ...fontTextStyles.eighteenBoldBlack,
    color: "#FFFFFF",
  },
});

import React, { useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
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
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import type {
  ProSubscriptionInfo,
  ProFeatureEntitlements,
} from "@/types/gym/proSubscription.types";
import type { StronProOfferingsPrices } from "@/features/payments";

interface StronProScreenContentProps {
  subscription: ProSubscriptionInfo | null;
  features: ProFeatureEntitlements | null;
  isPro: boolean;
  offeringsPrices?: StronProOfferingsPrices;
  isLoading: boolean;
  isSubmitting: boolean;
  isRestoring?: boolean;
  onSubscribe: () => void;
  onRestore?: () => void;
  onCancel: () => void;
  onBack: () => void;
}

const COMPARISON_FEATURES: readonly {
  readonly label: string;
  readonly free: boolean;
  readonly pro: boolean;
}[] = [
  { label: "Auto Renewal Plans", free: true, pro: true },
  { label: "QR Attendance", free: true, pro: true },
  { label: "Member Management", free: true, pro: true },
  { label: "Custom Gym Branding", free: false, pro: true },
  { label: "Advanced Analytics", free: false, pro: true },
  { label: "WhatsApp Reminders", free: false, pro: true },
  { label: "Unlimited Listing", free: false, pro: true },
  { label: "Enhanced Listing Visibility", free: false, pro: true },
  { label: "Referral Coupons", free: false, pro: true },
  { label: "Priority Support", free: false, pro: true },
];

const FeatureLeftRow: React.FC<{ label: string; free: boolean }> = ({ label, free }) => (
  <View style={styles.featureRow}>
    <CustomText style={styles.featureLabelText} numberOfLines={1}>
      {label}
    </CustomText>
    <View style={styles.freeIconCell}>
      {free ? (
        <Ionicons name="checkmark" size={17} color="#CBD5E1" />
      ) : (
        <Ionicons name="close" size={17} color="#EF4444" />
      )}
    </View>
  </View>
);

const ProCheckmarkRow: React.FC = () => (
  <View style={styles.proIconCell}>
    <Ionicons name="checkmark" size={19} color="#FFFFFF" />
  </View>
);

const PRO_GRADIENT_COLORS = ["#2D72EC", "#215CD6", "#1C48B2", "#15358A"] as const;
const PRO_GRADIENT_LOCATIONS = [0, 0.3, 0.65, 1] as const;
const CTA_GRADIENT_COLORS = ["#2E72E7", "#235FE0", "#1845B2"] as const;

export const StronProScreenContent: React.FC<StronProScreenContentProps> = ({
  isPro,
  isLoading,
  isSubmitting,
  isRestoring = false,
  offeringsPrices,
  onSubscribe,
  onRestore,
  onCancel,
  onBack,
}) => {
  const router = useRouter();

  const handleFaqPress = useCallback(() => {
    router.push({
      pathname: href.app.policyWebView as never,
      params: { url: "https://stron.in/faq", title: "STRON PRO FAQs" },
    });
  }, [router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <Image
        source={images.STRON_PRO.BG}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        fadeDuration={0}
      />

      <ScreenSafeArea>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerRightGroup}>
            <View style={styles.titleRow}>
              <Image
                source={images.STRON_PRO.LOGO}
                style={styles.headerLogo}
                resizeMode="contain"
                fadeDuration={0}
              />
              <CustomText style={styles.headerTitle}>STRON PRO</CustomText>
            </View>

            <TouchableOpacity
              style={styles.faqsButton}
              activeOpacity={0.7}
              onPress={handleFaqPress}
            >
              <CustomText style={styles.faqsText}>FAQs</CustomText>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === "android"}
          overScrollMode="never"
        >
          <View style={styles.taglinePill}>
            <CustomText style={styles.taglineText}>Reliable</CustomText>
            <View style={styles.taglineDot} />
            <CustomText style={styles.taglineText}>Secure</CustomText>
            <View style={styles.taglineDot} />
            <CustomText style={styles.taglineText}>Built for Fitness</CustomText>
          </View>

          <View style={styles.tableCard}>
            <View style={styles.leftColumn}>
              <View style={styles.tableHeaderRow}>
                <CustomText style={styles.tableHeaderFeatures}>Features</CustomText>
                <CustomText style={styles.tableHeaderFree}>FREE</CustomText>
              </View>

              {COMPARISON_FEATURES.map((item) => (
                <FeatureLeftRow key={item.label} label={item.label} free={item.free} />
              ))}
            </View>

            <LinearGradient
              colors={PRO_GRADIENT_COLORS}
              locations={PRO_GRADIENT_LOCATIONS}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.proColumnGradient}
            >
              <View style={styles.proHeaderCell}>
                <CustomText style={styles.tableHeaderPro}>PRO</CustomText>
              </View>

              {COMPARISON_FEATURES.map((item) => (
                <ProCheckmarkRow key={item.label} />
              ))}
            </LinearGradient>
          </View>

          <View style={styles.ctaWrapper}>
            {isPro ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onCancel}
                disabled={isSubmitting}
                style={styles.cancelButton}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FF5252" />
                ) : (
                  <CustomText style={styles.cancelButtonText}>Cancel auto-renew</CustomText>
                )}
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onSubscribe}
                  disabled={isSubmitting}
                  style={styles.upgradeButton}
                >
                  <LinearGradient
                    colors={CTA_GRADIENT_COLORS}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.upgradeButtonGradient}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <View style={styles.upgradeContent}>
                        <CustomText style={styles.upgradeTitle}>
                          {offeringsPrices?.hasStoreTrial
                            ? "Claim 14-day free trial"
                            : "Upgrade to PRO"}
                        </CustomText>
                        <View style={styles.priceRow}>
                          <CustomText style={styles.priceAmount}>
                            {offeringsPrices?.amount || offeringsPrices?.monthly || "₹999"}
                          </CustomText>
                          <CustomText style={styles.pricePeriod}>
                            {" "}
                            {offeringsPrices?.period || "/month"}{" "}
                          </CustomText>
                        </View>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {onRestore ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onRestore}
                    disabled={isRestoring || isSubmitting}
                    style={styles.restoreButton}
                  >
                    {isRestoring ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <CustomText style={styles.restoreText}>Restore purchases</CustomText>
                    )}
                  </TouchableOpacity>
                ) : null}

                <View style={styles.trustRow}>
                  <CustomText style={styles.trustText}>Secure Payments</CustomText>
                  <View style={styles.trustDot} />
                  <CustomText style={styles.trustText}>Cancel Anytime</CustomText>
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </ScreenSafeArea>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050608",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#050608",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRightGroup: {
    alignItems: "flex-end",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerLogo: {
    width: 64,
    height: 64,
  },
  headerTitle: {
    ...headingTextStyles.thirtyExtraBoldBlack,
    color: "#FFFFFF",
  },
  faqsButton: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  faqsText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
    alignItems: "center",
  },
  taglinePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
    marginTop: 8,
    gap: 8,
  },
  taglineText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.85)",
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  tableCard: {
    width: "100%",
    backgroundColor: "#16171B",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: 20,
  },
  leftColumn: {
    flex: 1,
    paddingVertical: 14,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  tableHeaderFeatures: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  tableHeaderFree: {
    ...fontTextStyles.twelveBoldBlack,
    color: "rgba(255, 255, 255, 0.6)",
    width: 44,
    textAlign: "center",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  featureLabelText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.9)",
    flex: 1,
  },
  freeIconCell: {
    width: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  proColumnGradient: {
    width: 68,
    paddingVertical: 14,
    alignItems: "center",
  },
  proHeaderCell: {
    paddingBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.2)",
  },
  tableHeaderPro: {
    ...fontTextStyles.fourteenExtraBoldBlack,
    color: "#FFFFFF",
  },
  proIconCell: {
    paddingVertical: 7,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  ctaWrapper: {
    width: "100%",
    alignItems: "center",
  },
  upgradeButton: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  upgradeButtonGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeContent: {
    alignItems: "center",
  },
  upgradeTitle: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FFFFFF",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 2,
  },
  priceAmount: {
    ...fontTextStyles.sixteenExtraBoldBlack,
    color: "#FFFFFF",
  },
  pricePeriod: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.8)",
  },
  priceOriginal: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    textDecorationLine: "line-through",
  },
  restoreButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  restoreText: {
    ...fontTextStyles.twelveSemiBoldBlack,
    color: "rgba(255, 255, 255, 0.75)",
    textDecorationLine: "underline",
  },
  cancelButton: {
    width: "100%",
    backgroundColor: "rgba(255, 82, 82, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.4)",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    ...fontTextStyles.sixteenBoldBlack,
    color: "#FF5252",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  trustText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});

export default StronProScreenContent;

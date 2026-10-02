import React, { memo } from "react";
import { ActivityIndicator, type StyleProp, StyleSheet, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";

export interface StronProOfferingsPricesSummary {
  amount?: string;
  period?: string;
  cta?: string;
}

export interface StronProMarketingBannerProps {
  isPro?: boolean;
  isTrialEligible?: boolean;
  isSubmitting?: boolean;
  offeringsPrices?: StronProOfferingsPricesSummary;
  onCtaPress?: () => void | Promise<void>;
  containerStyle?: StyleProp<ViewStyle>;
}

export const StronProMarketingBanner = memo(
  ({
    isPro = false,
    isTrialEligible = false,
    isSubmitting = false,
    offeringsPrices,
    onCtaPress,
    containerStyle,
  }: StronProMarketingBannerProps) => {
    // If user is already active PRO, do not show marketing banner
    if (isPro) return null;

    const handleCtaPress = async () => {
      if (onCtaPress) {
        await onCtaPress();
      }
    };

    return (
      <View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={["#0D2866", "#071738", "#030A1C"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.cardGradient}
        >
          {/* Inner Header with Blue Banner */}
          <LinearGradient
            colors={["#2A78F4", "#185ECE", "#0F46A6"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.innerBanner}
          >
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-2 border border-white/30">
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                </View>
                <CustomText className="font-body-bold text-[17px] text-white">Unlock with STRON Pro</CustomText>
              </View>

              {isTrialEligible ? (
                <View className="bg-[#61DC60]/20 border border-[#61DC60]/40 px-2.5 py-0.5 rounded-full">
                  <CustomText className="font-body-semibold text-[11px] text-[#61DC60]">
                    14 Days Free
                  </CustomText>
                </View>
              ) : null}
            </View>

            {/* Feature Bullets */}
            <View className="gap-1.5 mt-1">
              <View className="flex-row items-center">
                <View style={styles.bullet} />
                <CustomText className="font-body text-[13px] text-white/95">
                  Automated WhatsApp Client Reminders
                </CustomText>
              </View>
              <View className="flex-row items-center">
                <View style={styles.bullet} />
                <CustomText className="font-body text-[13px] text-white/95">
                  Unlimited Active Listings & Events
                </CustomText>
              </View>
              <View className="flex-row items-center">
                <View style={styles.bullet} />
                <CustomText className="font-body text-[13px] text-white/95">
                  Top Search Visibility & Priority Support
                </CustomText>
              </View>
            </View>
          </LinearGradient>

          {/* Pricing & CTA Section */}
          <View className="items-center pt-3.5 pb-1">
            <View className="flex-row items-baseline mb-2">
              <CustomText className="font-body-bold text-[28px] text-white">
                {offeringsPrices?.amount || (isTrialEligible ? "₹0" : "₹999")}
              </CustomText>
              <CustomText className="font-body text-[14px] text-white/70 ml-1.5">
                {offeringsPrices?.period ||
                  (isTrialEligible ? "for 14 days, then ₹999/mo" : "/month")}
              </CustomText>
            </View>

            <PressableScale
              onPress={handleCtaPress}
              disabled={isSubmitting}
              style={styles.ctaButton}
              accessibilityRole="button"
              accessibilityLabel={
                offeringsPrices?.cta ||
                (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO")
              }
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <CustomText className="font-body-bold text-[15px] text-white">
                  {offeringsPrices?.cta ||
                    (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO")}
                </CustomText>
              )}
            </PressableScale>

            <CustomText className="font-body text-[11px] text-white/50 mt-2">
              Payment method required · Auto-renews via Play Store or App Store · Cancel anytime
            </CustomText>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

StronProMarketingBanner.displayName = "StronProMarketingBanner";

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    marginVertical: 12,
  },
  cardGradient: {
    padding: 12,
  },
  innerBanner: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#7DD3FF",
    marginRight: 8,
  },
  ctaButton: {
    width: "100%",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#1877F2",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
});

export default StronProMarketingBanner;

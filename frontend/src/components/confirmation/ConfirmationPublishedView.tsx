import React, { memo } from "react";
import { Image, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { SCREEN_CONTENT_PADDING_BOTTOM } from "@/utils/screen-layout";

const DEFAULT_PRO_FEATURES = [
  "Top Search Visibility",
  "Custom Gym Branding",
  "Unlimited active listings",
];

const PAGE_GRADIENT = [
  "#1B68F5",
  "#1556DC",
  "#0D3AA5",
  "#071E5E",
  "#040F2E",
  "#010512",
  "#000000",
] as const;

const PAGE_GRADIENT_LOCATIONS = [0, 0.15, 0.35, 0.52, 0.68, 0.85, 1] as const;
const CARD_GRADIENT = ["#0B1F4A", "#071A32", "#050B1C"] as const;
const BANNER_GRADIENT = ["#3B8AFF", "#1E6AE8", "#1554D4"] as const;

export type ConfirmationPublishedViewProps = {
  title?: string;
  subtitle?: string;
  isListing?: boolean;
  isPro?: boolean;
  isTrialEligible?: boolean;
  isSubmittingPro?: boolean;
  proTitle?: string;
  proFeatures?: string[];
  proPrice?: string;
  proOriginalPrice?: string;
  proBillingPeriod?: string;
  proCtaLabel?: string;
  onUpgradePro?: () => void;
  onShare?: () => void;
  onSeePreview?: () => void;
  shareLabel?: string;
  previewLabel?: string;
  loadingPreview?: boolean;
};

export const ConfirmationPublishedView = memo(
  ({
    title = "Congrats",
    subtitle = "Now your Listing is live and Discoverable by thousands of fitness enthusiasts",
    isListing = true,
    isPro = false,
    isTrialEligible = false,
    isSubmittingPro = false,
    proTitle = "Unlock with STRON Pro",
    proFeatures = DEFAULT_PRO_FEATURES,
    proPrice,
    proOriginalPrice,
    proBillingPeriod,
    proCtaLabel,
    onUpgradePro,
    onShare,
    onSeePreview,
    shareLabel = "Share Event",
    previewLabel = "See Preview",
    loadingPreview = false,
  }: ConfirmationPublishedViewProps) => {
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
    const displayPrice = proPrice || (isTrialEligible ? "₹0" : "₹999");
    const displayPeriod =
      proBillingPeriod || (isTrialEligible ? "for 14 days, then ₹999/mo" : "/month");
    const displayOriginalPrice = proOriginalPrice !== undefined ? proOriginalPrice : null;
    const displayCta =
      proCtaLabel || (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO");

    return (
      <View className="flex-1 bg-black">
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <LinearGradient
          colors={PAGE_GRADIENT}
          locations={PAGE_GRADIENT_LOCATIONS}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.page}
        >
          <View style={styles.container}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: topInset + 16,
                  paddingBottom: Math.max(insets.bottom, SCREEN_CONTENT_PADDING_BOTTOM),
                },
              ]}
            >
              <Animated.View entering={FadeInDown.duration(400)} style={styles.headerBlock}>
                <CustomText style={styles.titleText}>
                  {title}
                </CustomText>
                <CustomText style={styles.subtitleText}>
                  {subtitle}
                </CustomText>
              </Animated.View>

              {!isPro ? (
                <Animated.View
                  entering={FadeInDown.duration(500).delay(100)}
                  className="w-full my-6"
                >
                  <View style={styles.cardClip}>
                    <LinearGradient
                      colors={CARD_GRADIENT}
                      start={{ x: 0.5, y: 0 }}
                      end={{ x: 0.5, y: 1 }}
                      style={styles.cardInner}
                    >
                      <View style={styles.bannerClip}>
                        <LinearGradient
                          colors={BANNER_GRADIENT}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.banner}
                        >
                          <View className="flex-row items-center justify-between mb-3.5">
                            <View className="flex-row items-center flex-1">
                              <Image
                                source={images.PRO_LOGO}
                                style={styles.proLogo}
                                resizeMode="contain"
                                accessibilityIgnoresInvertColors
                              />
                              <CustomText className="font-body-bold text-[16px] text-white ml-2.5 flex-1">
                                {proTitle}
                              </CustomText>
                            </View>

                            {isTrialEligible ? (
                              <View className="bg-[#61DC60]/20 border border-[#61DC60]/40 px-2.5 py-0.5 rounded-full">
                                <CustomText className="font-body-semibold text-[11px] text-[#61DC60]">
                                  14 Days Free
                                </CustomText>
                              </View>
                            ) : null}
                          </View>

                          <View className="gap-2">
                            {proFeatures.map((feat) => (
                              <View key={feat} className="flex-row items-center">
                                <View style={styles.bullet} />
                                <CustomText className="font-body-medium text-[14px] leading-[20px] text-[#E8F1FF]">
                                  {feat}
                                </CustomText>
                              </View>
                            ))}
                          </View>
                        </LinearGradient>
                      </View>

                      <View className="items-center pt-5 pb-1">
                        <View className="flex-row items-baseline justify-center">
                          <CustomText className="font-body-bold text-[34px] leading-[40px] text-white">
                            {displayPrice}
                          </CustomText>
                          <CustomText className="font-body-medium text-[16px] leading-[22px] text-white/85 ml-1.5">
                            {displayPeriod}
                          </CustomText>
                          {displayOriginalPrice ? (
                            <CustomText className="font-body-medium text-[16px] leading-[22px] text-white/35 line-through ml-2.5">
                              {displayOriginalPrice}
                            </CustomText>
                          ) : null}
                        </View>

                        <PressableScale
                          onPress={onUpgradePro}
                          disabled={isSubmittingPro}
                          style={styles.cta}
                          accessibilityRole="button"
                          accessibilityLabel={displayCta}
                        >
                          <CustomText className="font-body-bold text-[15px] text-white tracking-[0.4px]">
                            {displayCta}
                          </CustomText>
                        </PressableScale>

                        <CustomText className="font-body text-[12px] leading-[16px] text-[#9BB0D0] mt-3.5">
                          Secure Payments · Cancel Anytime
                        </CustomText>
                      </View>
                    </LinearGradient>
                  </View>
                </Animated.View>
              ) : null}

              <Animated.View
                entering={FadeInDown.duration(450).delay(180)}
                className="flex-row items-center gap-3"
              >
                <PressableScale
                  onPress={onShare}
                  className="flex-1 h-[56px] rounded-full border border-white/20 bg-[#0B0D14]/80 items-center justify-center px-4"
                  accessibilityRole="button"
                  accessibilityLabel={shareLabel}
                >
                  <CustomText className="font-body-medium text-[16px] text-white" numberOfLines={1}>
                    {shareLabel}
                  </CustomText>
                </PressableScale>

                <PressableScale
                  onPress={onSeePreview}
                  disabled={loadingPreview}
                  className="flex-1 h-[56px] rounded-full bg-white items-center justify-center px-4 shadow-sm"
                  accessibilityRole="button"
                  accessibilityLabel={previewLabel}
                >
                  <CustomText className="font-body-bold text-[16px] text-black" numberOfLines={1}>
                    {loadingPreview ? "Loading..." : previewLabel}
                  </CustomText>
                </PressableScale>
              </Animated.View>
            </ScrollView>
          </View>
        </LinearGradient>
      </View>
    );
  },
);

ConfirmationPublishedView.displayName = "ConfirmationPublishedView";

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingHorizontal: 22,
  },
  headerBlock: {
    paddingHorizontal: 4,
  },
  titleText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 38,
    lineHeight: 46,
    paddingBottom: 4,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 20,
    lineHeight: 28,
    color: "#D0E2FF",
    marginTop: 10,
    maxWidth: 340,
  },
  cardClip: {
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 16,
  },
  cardInner: {
    padding: 14,
    paddingBottom: 18,
  },
  bannerClip: {
    borderRadius: 20,
    overflow: "hidden",
  },
  banner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  proLogo: {
    width: 22,
    height: 22,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#7DD3FF",
    marginRight: 10,
  },
  cta: {
    width: "100%",
    height: 48,
    borderRadius: 999,
    backgroundColor: "#1877F2",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default ConfirmationPublishedView;

import React from "react";
import { View, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { sharePlan } from "@/utils/sharePlan";
import { screenContentContainerWideStyle } from "@/utils/screen-layout";

interface PlanPublishedScreenContentProps {
  planId?: string;
  planName?: string;
  price?: string | number;
  duration?: string | number;
  durationUnit?: string;
  isPro?: boolean;
  isTrialEligible?: boolean;
  isSubmitting?: boolean;
  proPrice?: string;
  proBillingPeriod?: string;
  proCtaLabel?: string;
  onUpgradeToPro: () => void;
  onSeePreview: () => void;
  onBackToDashboard: () => void;
}

export const PlanPublishedScreenContent: React.FC<PlanPublishedScreenContentProps> = ({
  planId = "",
  planName = "Membership Plan",
  price = "",
  duration = "",
  durationUnit = "MONTHS",
  isPro = false,
  isTrialEligible = false,
  isSubmitting = false,
  proPrice,
  proBillingPeriod,
  proCtaLabel,
  onUpgradeToPro,
  onSeePreview,
}) => {
  const handleShare = async () => {
    await sharePlan({
      _id: planId,
      id: planId,
      name: planName,
      price: Number(price) || 0,
      duration: Number(duration) || 1,
      durationUnit: (durationUnit as any) || "MONTHS",
      perks: [],
    } as any);
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const displayPrice = proPrice || (isTrialEligible ? "₹0" : "₹999");
  const displayPeriod =
    proBillingPeriod || (isTrialEligible ? "for 14 days, then ₹999/mo" : "/month");
  const displayCta =
    proCtaLabel || (isTrialEligible ? "Claim 14-day free trial" : "Upgrade to PRO");

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Top Ambient Glow */}
      <LinearGradient
        colors={["#086CFF", "#044ECA", "#022778", "#01123B", "#000000"]}
        locations={[0, 0.22, 0.48, 0.75, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={styles.ambientGlow}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset + 16,
          },
        ]}
      >
        {/* Top Header Section */}
        <View style={styles.headerSection}>
          <CustomText style={styles.headerTitle}>
            Congrats
          </CustomText>
          <CustomText style={styles.headerSubtitle}>
            Now your plan is live and Discoverable by thousands of fitness enthusiasts
          </CustomText>
        </View>

        {/* Center PRO Upsell Glass Card */}
        {!isPro ? (
          <View style={styles.proUpsellCard}>
            {/* Inner Blue Gradient Card */}
            <LinearGradient
              colors={["#438FFF", "#0B4DB8", "#00327B"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.proCardGradient}
            >
              {/* Header Badge */}
              <View style={styles.badgeHeaderRow}>
                <View style={styles.badgeTitleRow}>
                  <View style={styles.shieldIconWrapper}>
                    <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
                  </View>
                  <CustomText style={styles.badgeTitleText}>
                    Unlock with STRON Pro
                  </CustomText>
                </View>

                {isTrialEligible ? (
                  <View style={styles.trialPill}>
                    <CustomText style={styles.trialPillText}>
                      14 Days Free
                    </CustomText>
                  </View>
                ) : null}
              </View>

              {/* Perks List */}
              <View style={styles.perksList}>
                <View style={styles.perkRow}>
                  <View style={styles.perkDot} />
                  <CustomText style={styles.perkText}>WhatsApp Reminders</CustomText>
                </View>

                <View style={styles.perkRow}>
                  <View style={styles.perkDot} />
                  <CustomText style={styles.perkText}>
                    Advanced Member Analytics
                  </CustomText>
                </View>

                <View style={styles.perkRow}>
                  <View style={styles.perkDot} />
                  <CustomText style={styles.perkText}>
                    Referral Coupons & Unlimited Listings
                  </CustomText>
                </View>
              </View>
            </LinearGradient>

            {/* Pricing Row */}
            <View style={styles.pricingRow}>
              <CustomText style={styles.priceAmount}>{displayPrice}</CustomText>
              <CustomText style={styles.pricePeriod}>
                {displayPeriod}
              </CustomText>
            </View>

            {/* Upgrade Button */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onUpgradeToPro}
              disabled={isSubmitting}
              style={styles.upgradeButton}
            >
              <CustomText style={styles.upgradeButtonText}>{displayCta}</CustomText>
            </TouchableOpacity>

            {/* Trust Text */}
            <CustomText style={styles.trustText}>
              Secure Payments · Cancel Anytime
            </CustomText>
          </View>
        ) : null}

        {/* Bottom Action Bar: Share Plan + See Preview */}
        <View style={styles.bottomActionBar}>
          {/* Share Plan */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleShare}
            style={styles.sharePlanButton}
          >
            <CustomText style={styles.sharePlanText}>Share Plan</CustomText>
          </TouchableOpacity>

          {/* See Preview */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onSeePreview}
            style={styles.seePreviewButton}
          >
            <CustomText style={styles.seePreviewText}>See Preview</CustomText>
            <View style={styles.seePreviewArrowCircle}>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  ambientGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 450,
  },
  scrollContent: {
    ...screenContentContainerWideStyle,
    flexGrow: 1,
    justifyContent: "space-between",
  },
  headerSection: {
    marginBottom: 32,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 38,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 22,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 10,
    lineHeight: 28,
  },
  proUpsellCard: {
    width: "100%",
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 20,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  proCardGradient: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  badgeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badgeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  shieldIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  badgeTitleText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  trialPill: {
    backgroundColor: "rgba(97, 220, 96, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(97, 220, 96, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  trialPillText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 11,
    color: "#61DC60",
  },
  perksList: {
    gap: 8,
    marginBottom: 4,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  perkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
  },
  perkText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 12,
  },
  priceAmount: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 32,
    color: "#FFFFFF",
  },
  pricePeriod: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    marginLeft: 6,
    marginRight: 8,
  },
  upgradeButton: {
    width: "100%",
    height: 46,
    borderRadius: 9999,
    backgroundColor: "#0074FF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0074FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  upgradeButtonText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
  trustText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginTop: 10,
  },
  bottomActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sharePlanButton: {
    flex: 1,
    height: 60,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  sharePlanText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
  },
  seePreviewButton: {
    flex: 1,
    height: 60,
    paddingLeft: 24,
    paddingRight: 8,
    borderRadius: 9999,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  seePreviewText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 16,
    color: "#000000",
  },
  seePreviewArrowCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default PlanPublishedScreenContent;

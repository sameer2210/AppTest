import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import PressableScale from "@/components/ui/PressableScale";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { Ionicons } from "@expo/vector-icons";

const PRO_CARD_FEATURES = ["WhatsApp Reminders", "Advanced Analytics", "Referral Coupons"];

const CARD_GRADIENT = ["#0A255D", "#071B45", "#05122E"] as const;
const BANNER_GRADIENT = ["#1F6EF2", "#1659CE", "#1047AC"] as const;

type Props = {
  onUpgradePro: () => void;
  onDismiss?: () => void;
  priceAmount?: string;
  pricePeriod?: string;
  ctaLabel?: string;
};

export const HomeProUpgradeCard: React.FC<Props> = ({
  onUpgradePro,
  onDismiss,
  priceAmount = "₹999",
  pricePeriod = "/month",
  ctaLabel = "Upgrade to PRO",
}) => {
  return (
    <View style={styles.cardClip}>
      <LinearGradient
        colors={CARD_GRADIENT}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.cardInner}
      >
        {/* Top Highlight Banner */}
        <View style={styles.bannerClip}>
          <LinearGradient
            colors={BANNER_GRADIENT}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            {/* Header: Logo + Title + Close / Cut Button */}
            <View style={styles.bannerHeader}>
              <View style={styles.bannerHeaderLeft}>
                <Image source={images.STRON_PRO.LOGO} style={styles.proLogo} resizeMode="contain" />
                <CustomText style={styles.bannerTitle}>
                  Unlock with STRON Pro
                </CustomText>
              </View>

              {onDismiss ? (
                <PressableScale
                  scale={0.9}
                  onPress={onDismiss}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={17} color="#FFFFFF" />
                </PressableScale>
              ) : null}
            </View>

            {/* Feature Bullets */}
            <View style={styles.featureBullets}>
              {PRO_CARD_FEATURES.map((feat) => (
                <View key={feat} style={styles.featureRow}>
                  <View style={styles.bullet} />
                  <CustomText style={styles.featureText}>{feat}</CustomText>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Pricing & CTA Section */}
        <View style={styles.pricingSection}>
          <View style={styles.priceRow}>
            <CustomText style={styles.priceAmount}>
              {priceAmount}
            </CustomText>
            <CustomText style={styles.pricePeriod}>
              {pricePeriod}
            </CustomText>
          </View>

          {/* Upgrade Button */}
          <PressableScale
            scale={0.97}
            onPress={onUpgradePro}
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
          >
            <CustomText style={styles.ctaText}>
              {ctaLabel}
            </CustomText>
          </PressableScale>

          {/* Footer Note */}
          <CustomText style={styles.footerNote}>
            Secure payments · Cancel anytime in the store
          </CustomText>
        </View>
      </LinearGradient>
    </View>
  );
};

export default HomeProUpgradeCard;

const styles = StyleSheet.create({
  cardClip: {
    marginBottom: 16,
    width: "100%",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  cardInner: {
    padding: 12,
  },
  bannerClip: {
    borderRadius: 16,
    overflow: "hidden",
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  bannerHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 8,
  },
  proLogo: {
    width: 26,
    height: 26,
  },
  bannerTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 16.5,
    color: "#FFFFFF",
    marginLeft: 10,
    fontWeight: "700",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  featureBullets: {
    gap: 8,
    paddingLeft: 2,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#7DD3FF",
    marginRight: 10,
  },
  featureText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14.5,
    color: "#E8F1FF",
  },
  pricingSection: {
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 4,
    paddingHorizontal: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  priceAmount: {
    ...fontTextStyles.headingLarge,
    fontSize: 32,
    lineHeight: 38,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pricePeriod: {
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.85)",
    marginLeft: 6,
  },
  cta: {
    width: "100%",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 24,
    backgroundColor: "#0075FF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: "#0075FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaText: {
    ...fontTextStyles.buttonText,
    fontSize: 15.5,
    color: "#FFFFFF",
    letterSpacing: 0.3,
    fontWeight: "700",
  },
  footerNote: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "#9BB0D0",
    marginTop: 12,
  },
});

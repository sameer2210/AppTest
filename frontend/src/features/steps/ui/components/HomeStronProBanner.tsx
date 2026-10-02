import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, TouchableOpacity, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";

export interface HomeStronProBannerProps {
  onPress?: () => void;
  onDismiss?: () => void;
  ctaLabel?: string;
  footerText?: string;
}

const PRO_FEATURES = [
  {
    key: "listing",
    title: "Unlimited",
    subtitle: "Active listing",
    icon: <Ionicons name="list" size={20} color="#FFFFFF" />,
  },
  {
    key: "analytics",
    title: "Advanced",
    subtitle: "Analytics",
    icon: <Feather name="trending-up" size={19} color="#FFFFFF" />,
  },
  {
    key: "support",
    title: "Priority",
    subtitle: "VIP Support",
    icon: <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />,
  },
  {
    key: "whatsapp",
    title: "Whatsapp",
    subtitle: "reminders",
    icon: <Ionicons name="notifications" size={18} color="#FFFFFF" />,
  },
] as const;

export const HomeStronProBanner: React.FC<HomeStronProBannerProps> = ({
  onPress,
  onDismiss,
  ctaLabel = "Claim 14-day free trial",
  footerText = "Renews at ₹999/month · Cancel anytime",
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const handleClose = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <View style={styles.cardContainer}>
      {/* Background Gradient */}
      <LinearGradient
        colors={["#001C46", "#001433", "#000E26"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top Right Close Button */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleClose}
        style={styles.closeButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityRole="button"
        accessibilityLabel="Close Pro Banner"
      >
        <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.65)" />
      </TouchableOpacity>

      {/* Header Row: 3D Crown + Title & Subtitle */}
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.headerRow}>
        <Image
          source={images.HOME_V2.STRON_PRO_CROWN}
          style={styles.crownImage}
          resizeMode="contain"
        />

        <View style={styles.headerTextCol}>
          <CustomText style={styles.titleText}>STRON PRO</CustomText>
          <CustomText style={styles.subtitleText}>Everything you need to grow faster.</CustomText>
        </View>
      </TouchableOpacity>

      {/* 4 Feature Highlights Track */}
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.featureTrack}>
        {PRO_FEATURES.map((item) => (
          <View key={item.key} style={styles.featureCol}>
            <View style={styles.iconCircle}>{item.icon}</View>
            <CustomText style={styles.featureTitle}>{item.title}</CustomText>
            <CustomText style={styles.featureSubtitle}>{item.subtitle}</CustomText>
          </View>
        ))}
      </TouchableOpacity>

      {/* CTA Button */}
      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.ctaButtonTouch}>
        <LinearGradient
          colors={["#1E7FFF", "#0066FF", "#0055E0"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.ctaButtonGradient}
        >
          <CustomText style={styles.ctaButtonText}>{ctaLabel}</CustomText>
        </LinearGradient>
      </TouchableOpacity>

      {/* Renewal Footer Text */}
      <CustomText style={styles.footerText}>{footerText}</CustomText>
    </View>
  );
};

export default HomeStronProBanner;

const styles = StyleSheet.create({
  cardContainer: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  closeButton: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 28,
  },
  crownImage: {
    width: 64,
    height: 72,
    marginRight: 14,
  },
  headerTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  titleText: {
    ...fontTextStyles.size30BoldBlack,
    color: "#FFFFFF",
  },
  subtitleText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.85)",
  },
  featureTrack: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0, 75, 185, 0.22)",
    borderWidth: 1,
    borderColor: "rgba(0, 116, 255, 0.25)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 6,
    marginTop: 14,
    marginBottom: 16,
  },
  featureCol: {
    flex: 1,
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0074FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    shadowColor: "#0074FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  featureTitle: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
  featureSubtitle: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
  },
  ctaButtonTouch: {
    width: "82%",
    alignSelf: "center",
    borderRadius: 37,
    overflow: "hidden",
    shadowColor: "#0074FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonGradient: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
  },
  ctaButtonText: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FFFFFF",
  },
  footerText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginTop: 10,
  },
});

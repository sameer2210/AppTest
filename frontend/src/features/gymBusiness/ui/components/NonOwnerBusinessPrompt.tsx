import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";

interface NonOwnerBusinessPromptProps {
  onRegisterPress?: () => void;
}

const ONBOARDING_STEPS = [
  {
    step: "1",
    title: "Business Profile & Logo",
    desc: "Enter your business name, location, map link, and opening hours.",
  },
  {
    step: "2",
    title: "Create Membership Plans",
    desc: "Set monthly, quarterly, or annual plans with custom amenities.",
  },
  {
    step: "3",
    title: "Add Bank Account for Payouts",
    desc: "Link your verified account for automated 24-hour settlements.",
  },
];

export const NonOwnerBusinessPrompt: React.FC<NonOwnerBusinessPromptProps> = ({
  onRegisterPress,
}) => {
  return (
    <View style={styles.container}>
      {/* Hero Glass Card */}
      <View style={styles.heroCard}>
        <BlurView
          intensity={Platform.OS === "ios" ? 40 : 60}
          tint="dark"
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["rgba(42, 128, 255, 0.4)", "rgba(18, 55, 130, 0.25)", "rgba(10, 16, 28, 0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={styles.iconCircle}>
            <Ionicons name="briefcase-outline" size={40} color="#60A5FA" />
          </View>

          <CustomText style={styles.heroTitle}>
            Register Your Business
          </CustomText>

          <CustomText style={styles.heroSubtitle}>
            Get your fitness business listed on the STRON network. Start selling memberships and
            managing members today.
          </CustomText>

          {/* Register Business CTA */}
          <LinearGradient
            colors={["#2A80FF", "#0051D5"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onRegisterPress}
              style={styles.ctaButton}
            >
              <CustomText style={styles.ctaText}>
                Start Business Registration
              </CustomText>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </LinearGradient>
        </LinearGradient>
      </View>

      {/* 3 Step Setup Guide */}
      <CustomText style={styles.sectionHeader}>
        3 Simple Steps to Get Started
      </CustomText>

      <View style={styles.stepsContainer}>
        {ONBOARDING_STEPS.map((s) => (
          <View key={s.step} style={styles.stepCard}>
            <View style={styles.stepBadge}>
              <CustomText style={styles.stepBadgeText}>{s.step}</CustomText>
            </View>

            <View style={styles.stepContent}>
              <CustomText style={styles.stepTitle}>{s.title}</CustomText>
              <CustomText style={styles.stepDesc}>{s.desc}</CustomText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    paddingBottom: 32,
  },
  heroCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  heroGradient: {
    padding: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(42, 128, 255, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  heroTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  ctaGradient: {
    width: "100%",
    borderRadius: 9999,
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 17,
    color: "#FFFFFF",
    marginRight: 8,
    letterSpacing: 0.2,
  },
  sectionHeader: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  stepsContainer: {
    gap: 12,
  },
  stepCard: {
    backgroundColor: "rgba(20, 24, 36, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2A80FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    marginTop: 2,
  },
  stepBadgeText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  stepDesc: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
});

export default NonOwnerBusinessPrompt;

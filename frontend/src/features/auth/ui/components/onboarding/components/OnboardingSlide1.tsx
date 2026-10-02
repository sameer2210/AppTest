import React, { useState } from "react";
import { Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "@/components/ui/PressableScale";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

export type UserRoleType = "individual" | "business";

type Props = {
  onContinue: (selectedRole: UserRoleType) => void;
  currentSlideIndex?: number;
  totalSlides?: number;
};

export const OnboardingSlide1 = ({ onContinue, currentSlideIndex = 0, totalSlides = 4 }: Props) => {
  const insets = useSafeAreaInsets();
  const [selectedRole, setSelectedRole] = useState<UserRoleType | null>(null);

  return (
    <View style={styles.container}>
      <Image
        source={images.ONBOARDING_SLIDE1_BG as ImageSourcePropType}
        style={styles.bgImage}
        resizeMode="stretch"
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 44, 70),
            paddingBottom: Math.max(insets.bottom + 16, 24),
          },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <CustomText style={styles.welcomeText}>Welcome to</CustomText>
          <CustomText style={styles.brandText}>STRON</CustomText>
          <CustomText style={styles.subtitleText}>
            Your fitness. Your community.{"\n"}Your competition.
          </CustomText>
        </Animated.View>

        <View style={styles.spacer} />

        <View style={styles.actionsContainer}>
          <Animated.View
            entering={FadeInDown.duration(450).delay(100)}
            style={styles.cardsWrapper}
          >
            <PressableScale
              scale={0.98}
              onPress={() => {
                setSelectedRole("individual");
                onContinue("individual");
              }}
              style={[
                styles.roleCard,
                selectedRole === "individual" ? styles.roleCardActive : styles.roleCardDefault,
              ]}
            >
              <View style={styles.roleIconContainer}>
                <Ionicons name="person-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContainer}>
                <CustomText style={styles.roleTitle}>Individual</CustomText>
                <CustomText style={styles.roleDescription}>
                  Discover, compete & get STRON
                </CustomText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={selectedRole === "individual" ? "#2B82FF" : "rgba(255,255,255,0.7)"}
              />
            </PressableScale>

            <PressableScale
              scale={0.98}
              onPress={() => {
                setSelectedRole("business");
                onContinue("business");
              }}
              style={[
                styles.roleCard,
                selectedRole === "business" ? styles.roleCardActive : styles.roleCardDefault,
              ]}
            >
              <View style={styles.roleIconContainer}>
                <Ionicons name="briefcase-outline" size={24} color="#FFFFFF" />
              </View>
              <View style={styles.roleTextContainer}>
                <CustomText style={styles.roleTitle}>Business</CustomText>
                <CustomText style={styles.roleDescription}>Grow your fitness business</CustomText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={selectedRole === "business" ? "#2B82FF" : "rgba(255,255,255,0.7)"}
              />
            </PressableScale>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeIn.duration(400).delay(250)}
          style={styles.dotsContainer}
        >
          {Array.from({ length: totalSlides }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                idx === currentSlideIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030A16",
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 16,
  },
  welcomeText: {
    ...fontTextStyles.medium,
    fontSize: 20,
    color: "#FFFFFF",
    textAlign: "center",
  },
  brandText: {
    ...headingTextStyles.h1,
    fontSize: 36,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
  },
  subtitleText: {
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
  spacer: {
    flex: 1,
  },
  actionsContainer: {
    width: "100%",
    paddingHorizontal: 20,
  },
  cardsWrapper: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  roleCardDefault: {
    backgroundColor: "rgba(7, 19, 37, 0.65)",
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  roleCardActive: {
    backgroundColor: "rgba(10, 26, 54, 0.85)",
    borderColor: "#2B82FF",
    borderWidth: 1.5,
  },
  roleIconContainer: {
    marginRight: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  roleTitle: {
    ...headingTextStyles.h4,
    fontSize: 17,
    color: "#FFFFFF",
    lineHeight: 24,
  },
  roleDescription: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
  dotsContainer: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#2B82FF",
  },
  dotInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
});

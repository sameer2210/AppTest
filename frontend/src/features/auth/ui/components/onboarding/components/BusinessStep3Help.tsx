import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import PressableScale from "@/components/ui/PressableScale";
import { OnboardingStepLayout } from "./OnboardingStepLayout";
import { StepBadgeIcon } from "./StepBadgeIcon";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onBack: () => void;
  onContinue: (selectedFeatures: string[]) => void;
  onSkip: () => void;
};

type FeatureOption = {
  id: string;
  title: string;
  subtitle: string;
};

const FEATURE_OPTIONS: FeatureOption[] = [
  {
    id: "qr_attendance",
    title: "QR Attendance",
    subtitle: "Track member check-ins effortlessly",
  },
  {
    id: "qr_event_checkin",
    title: "QR Event Check-in",
    subtitle: "Make event entry quick and seamless",
  },
  {
    id: "auto_renewal_memberships",
    title: "Auto-Renewal Memberships",
    subtitle: "Automate recurring memberships",
  },
  {
    id: "virtual_challenge_builder",
    title: "Virtual Challenge Builder",
    subtitle: "Create challenges and engage your audience",
  },
  {
    id: "advanced_analytics",
    title: "Advanced Analytics",
    subtitle: "Understand your members and business better",
  },
];

export const BusinessStep3Help = ({ onBack, onContinue, onSkip }: Props) => {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  const toggleFeature = (id: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  return (
    <OnboardingStepLayout
      bgImageSource={images.ONBOARDING.BUSINESS_2}
      onBack={onBack}
      onSkip={onSkip}
      showSkip
      activeStepIndex={2}
      primaryButtonLabel="Continue"
      onPrimaryPress={() => onContinue(selectedFeatures)}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Briefcase Badge */}
        <StepBadgeIcon iconName="briefcase-outline" iconSize={32} />

        {/* Title & Subtitle */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.headerContainer}
        >
          <CustomText style={styles.title}>
            What can STRON help you with?
          </CustomText>
          <CustomText style={styles.subtitle}>
            Select the features that are most useful to your business.
          </CustomText>
        </Animated.View>

        {/* Features Checklist Cards */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.featuresList}
        >
          {FEATURE_OPTIONS.map((item) => {
            const selected = selectedFeatures.includes(item.id);
            return (
              <PressableScale
                key={item.id}
                scale={0.98}
                onPress={() => toggleFeature(item.id)}
                style={[
                  styles.featureCard,
                  selected ? styles.featureCardSelected : styles.featureCardDefault,
                ]}
              >
                <View style={styles.textContainer}>
                  <CustomText style={styles.featureTitle}>{item.title}</CustomText>
                  <CustomText style={styles.featureSubtitle}>{item.subtitle}</CustomText>
                </View>

                <View
                  style={[
                    styles.checkbox,
                    selected ? styles.checkboxSelected : styles.checkboxDefault,
                  ]}
                >
                  {selected ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
                </View>
              </PressableScale>
            );
          })}
        </Animated.View>
      </ScrollView>
    </OnboardingStepLayout>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  headerContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    ...headingTextStyles.h3,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    ...fontTextStyles.regular,
    fontSize: 14.5,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  featuresList: {
    paddingHorizontal: 20,
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  featureCardDefault: {
    backgroundColor: "rgba(11, 26, 58, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  featureCardSelected: {
    backgroundColor: "rgba(11, 30, 62, 0.9)",
    borderColor: "#2B82FF",
    borderWidth: 2,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  featureTitle: {
    ...headingTextStyles.h4,
    fontSize: 15.5,
    color: "#FFFFFF",
  },
  featureSubtitle: {
    ...fontTextStyles.regular,
    fontSize: 12.5,
    color: "rgba(255, 255, 255, 0.65)",
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDefault: {
    backgroundColor: "transparent",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  checkboxSelected: {
    backgroundColor: "#2B82FF",
    borderColor: "#2B82FF",
  },
});

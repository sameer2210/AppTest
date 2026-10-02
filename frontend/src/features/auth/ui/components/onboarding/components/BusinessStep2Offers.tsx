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
  onContinue: (selectedOffers: string[]) => void;
  onSkip: () => void;
};

const OFFER_OPTIONS = [
  "Fitness Event Organizer",
  "Gym & Fitness Center",
  "Trainer & Diet Coach",
  "Supplements & Gear Seller",
  "Non-Fitness Business",
];

export const BusinessStep2Offers = ({ onBack, onContinue, onSkip }: Props) => {
  const [selectedOffers, setSelectedOffers] = useState<string[]>([]);

  const toggleOffer = (offer: string) => {
    setSelectedOffers((prev) =>
      prev.includes(offer) ? prev.filter((item) => item !== offer) : [...prev, offer],
    );
  };

  return (
    <OnboardingStepLayout
      bgImageSource={images.ONBOARDING.BUSINESS_1}
      onBack={onBack}
      onSkip={onSkip}
      showSkip
      activeStepIndex={1}
      primaryButtonLabel="Continue"
      onPrimaryPress={() => onContinue(selectedOffers)}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Top Grid Badge */}
        <StepBadgeIcon iconName="grid-outline" iconSize={32} />

        {/* Title & Subtitle */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.headerContainer}
        >
          <CustomText style={styles.title}>
            What does your business offer?
          </CustomText>
          <CustomText style={styles.subtitle}>Select all that apply</CustomText>
        </Animated.View>

        {/* Options Checklist */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.optionsContainer}
        >
          {OFFER_OPTIONS.map((option) => {
            const selected = selectedOffers.includes(option);
            return (
              <PressableScale
                key={option}
                scale={0.98}
                onPress={() => toggleOffer(option)}
                style={[
                  styles.optionCard,
                  selected ? styles.optionCardSelected : styles.optionCardDefault,
                ]}
              >
                <CustomText style={styles.optionText}>{option}</CustomText>
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
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 6,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    height: 56,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  optionCardDefault: {
    backgroundColor: "rgba(11, 26, 58, 0.7)",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  optionCardSelected: {
    backgroundColor: "rgba(11, 30, 62, 0.9)",
    borderColor: "#2B82FF",
    borderWidth: 2,
  },
  optionText: {
    ...fontTextStyles.semiBold,
    fontSize: 15.5,
    color: "#FFFFFF",
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

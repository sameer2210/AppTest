import React from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { OnboardingStepLayout } from "./OnboardingStepLayout";
import { StepBadgeIcon } from "./StepBadgeIcon";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onBack: () => void;
  onAllowStepTracking: () => void;
  onSkip: () => void;
};

export const IndividualStep3StepTracking = ({ onBack, onAllowStepTracking, onSkip }: Props) => {
  return (
    <OnboardingStepLayout
      bgImageSource={images.ONBOARDING.INDIVIDUAL_3}
      onBack={onBack}
      onSkip={onSkip}
      showSkip
      activeStepIndex={2}
      primaryButtonLabel="Allow Step Tracking"
      onPrimaryPress={onAllowStepTracking}
    >
      <View style={styles.body}>
        <View>
          {/* Top Badge Icon */}
          <StepBadgeIcon iconName="calendar-outline" iconSize={34} />

          {/* Top Subtitle */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.topTextContainer}
          >
            <CustomText style={styles.topSubtitle}>
              You can compete with friends and strangers in fitness challenges.
            </CustomText>
          </Animated.View>
        </View>

        {/* Bottom Title & Description */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(150)}
          style={styles.bottomContainer}
        >
          <CustomText style={styles.bottomTitle}>
            Allow STRON to track your steps
          </CustomText>
          <CustomText style={styles.bottomDescription}>
            Your steps power your races and challenges.
          </CustomText>
        </Animated.View>
      </View>
    </OnboardingStepLayout>
  );
};

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "space-between",
  },
  topTextContainer: {
    paddingHorizontal: 28,
    alignItems: "center",
  },
  topSubtitle: {
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  bottomContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
    marginBottom: 24,
  },
  bottomTitle: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "center",
  },
  bottomDescription: {
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 8,
  },
});

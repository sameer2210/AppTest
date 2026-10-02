import React from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { OnboardingStepLayout } from "./OnboardingStepLayout";
import { StepBadgeIcon } from "./StepBadgeIcon";
import { images } from "@/utils/images";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onBack: () => void;
  onStartRaceNow: () => void;
  onTryLater: () => void;
  actionsLoading?: boolean;
};

export const IndividualStep4Success = ({
  onBack,
  onStartRaceNow,
  onTryLater,
  actionsLoading = false,
}: Props) => {
  return (
    <OnboardingStepLayout
      bgImageSource={images.ONBOARDING.INDIVIDUAL_4}
      onBack={actionsLoading ? undefined : onBack}
      activeStepIndex={3}
      primaryButtonLabel="Start Race Now"
      onPrimaryPress={onStartRaceNow}
      primaryButtonIcon={
        <Ionicons name="flag-outline" size={20} color="#FFFFFF" style={styles.buttonIcon} />
      }
      secondaryButtonLabel="Try Later"
      onSecondaryPress={onTryLater}
      actionsLoading={actionsLoading}
    >
      <View style={styles.content}>
        <StepBadgeIcon>
          <Ionicons name="checkmark" size={42} color="#34C759" />
        </StepBadgeIcon>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.textContainer}>
          <CustomText style={styles.title}>You are all Set.</CustomText>
          <CustomText style={styles.subtitle}>
            Let&apos;s start with a fun race for 50 steps.
          </CustomText>
        </Animated.View>
      </View>
    </OnboardingStepLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    ...headingTextStyles.h2,
    fontSize: 30,
    color: "#FFFFFF",
    textAlign: "center",
  },
  subtitle: {
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.75)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 24,
  },
});

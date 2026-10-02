import React from "react";
import { ActivityIndicator, Image, ImageSourcePropType, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "@/components/ui/PressableScale";
import { OnboardingHeader } from "./OnboardingHeader";
import { PaginationDots } from "./PaginationDots";
import { headingTextStyles } from "@/utils/typography";

type Props = {
  bgImageSource: ImageSourcePropType;
  overlayOpacity?: number;
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
  activeStepIndex: number;
  children: React.ReactNode;
  primaryButtonLabel?: string;
  onPrimaryPress?: () => void;
  secondaryButtonLabel?: string;
  onSecondaryPress?: () => void;
  primaryButtonIcon?: React.ReactNode;
  /** Disables CTAs and shows spinner — used while guest login finishes */
  actionsLoading?: boolean;
};

export const OnboardingStepLayout = ({
  bgImageSource,
  overlayOpacity = 0.5,
  onBack,
  onSkip,
  showSkip = false,
  activeStepIndex,
  children,
  primaryButtonLabel,
  onPrimaryPress,
  secondaryButtonLabel,
  onSecondaryPress,
  primaryButtonIcon,
  actionsLoading = false,
}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Background Image */}
      <Image
        source={bgImageSource}
        style={styles.bgImage}
        resizeMode="stretch"
      />
      <View style={[styles.overlay, { opacity: overlayOpacity }]} />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 16, 28),
            paddingBottom: Math.max(insets.bottom + 12, 20),
          },
        ]}
      >
        {/* Header */}
        <OnboardingHeader onBack={onBack} onSkip={onSkip} showSkip={showSkip} />

        {/* Unique Step Body Content */}
        {children}

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.actionsWrapper}>
          {primaryButtonLabel && onPrimaryPress ? (
            <PressableScale
              scale={0.97}
              disabled={actionsLoading}
              onPress={() => {
                if (actionsLoading) return;
                onPrimaryPress();
              }}
              style={[styles.primaryButton, actionsLoading && styles.primaryButtonDisabled]}
            >
              {actionsLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  {primaryButtonIcon}
                  <CustomText style={styles.primaryButtonText}>{primaryButtonLabel}</CustomText>
                </>
              )}
            </PressableScale>
          ) : null}

          {secondaryButtonLabel && onSecondaryPress ? (
            <PressableScale
              scale={0.97}
              disabled={actionsLoading}
              onPress={() => {
                if (actionsLoading) return;
                onSecondaryPress();
              }}
              style={[styles.secondaryButton, actionsLoading && styles.secondaryButtonDisabled]}
            >
              {actionsLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <CustomText style={styles.secondaryButtonText}>{secondaryButtonLabel}</CustomText>
              )}
            </PressableScale>
          ) : null}
        </Animated.View>

        {/* Step Indicator Dots */}
        <PaginationDots activeStepIndex={activeStepIndex} />
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#030A16",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionsWrapper: {
    width: "100%",
    paddingHorizontal: 20,
    gap: 12,
  },
  primaryButton: {
    height: 56,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#2B82FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  primaryButtonDisabled: {
    opacity: 0.8,
  },
  primaryButtonText: {
    ...headingTextStyles.h4,
    fontSize: 18,
    color: "#FFFFFF",
  },
  secondaryButton: {
    height: 56,
    width: "100%",
    borderRadius: 10,
    backgroundColor: "#1C1C1E",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonText: {
    ...headingTextStyles.h4,
    fontSize: 18,
    color: "#FFFFFF",
  },
});

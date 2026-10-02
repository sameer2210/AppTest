import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { SlideInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { ACTIONS_BLOCK_HEIGHT } from "../constants/onboarding.constants";
import { OnboardingAuthButton } from "./OnboardingAuthButton";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  insetsBottom: number;
  isAuthLoading: boolean;
  isGoogleLoading: boolean;
  isGuestLoading: boolean;
  onGoogleSignIn: () => void;
  onPhoneSignIn: () => void;
  onGuestSignIn: () => void;
};

export const OnboardingAuthSheet = ({
  insetsBottom,
  isAuthLoading,
  isGoogleLoading,
  isGuestLoading,
  onGoogleSignIn,
  onPhoneSignIn,
  onGuestSignIn,
}: Props) => {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Animated.View
        entering={SlideInDown.duration(600).springify()}
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(30, insetsBottom + 10),
            height: ACTIONS_BLOCK_HEIGHT,
          },
        ]}
      >
        <CustomText style={styles.title}>Welcome to STRON</CustomText>
        <CustomText style={styles.subtitle}>
          Access events, challenges, communities, rewards, and everything STRON has to offer with
          one account.
        </CustomText>

        {Platform.OS !== "ios" ? (
          <OnboardingAuthButton
            label="Continue with Google"
            onPress={onGoogleSignIn}
            loading={isGoogleLoading}
            disabled={isAuthLoading}
            imageSource={images.GOOGLE}
          />
        ) : null}

        <OnboardingAuthButton
          label="Continue with Phone"
          onPress={onPhoneSignIn}
          disabled={isAuthLoading}
          iconName="phone-portrait-outline"
        />

        <OnboardingAuthButton
          label="Continue as Guest"
          onPress={onGuestSignIn}
          loading={isGuestLoading}
          disabled={isAuthLoading}
          variant="link"
        />

        {/* Terms & Privacy Policy */}
        <View style={styles.legalRow}>
          <CustomText style={styles.legalText}>By continuing, you agree to Stron{"'"}s </CustomText>
          <CustomText
            style={styles.legalLink}
            onPress={() =>
              router.push({
                pathname: href.app.policyWebView,
                params: { policy: "terms-and-conditions" },
              } as never)
            }
          >
            Terms
          </CustomText>
          <CustomText style={styles.legalText}> and </CustomText>
          <CustomText
            style={styles.legalLink}
            onPress={() =>
              router.push({
                pathname: href.app.policyWebView,
                params: { policy: "privacy-policy" },
              } as never)
            }
          >
            Privacy Policy.
          </CustomText>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    zIndex: 50,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 32,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },
  title: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#000000",
    marginBottom: 12,
  },
  subtitle: {
    ...fontTextStyles.regular,
    fontSize: 13,
    lineHeight: 18,
    color: "#000000",
    textAlign: "center",
    marginBottom: 32,
    width: 290,
  },
  legalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  legalText: {
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "#000000",
  },
  legalLink: {
    ...fontTextStyles.regular,
    fontSize: 12,
    color: "#3B82F6",
  },
});

import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import CustomText from "@/components/CustomText";
import Animated, { FadeInDown } from "react-native-reanimated";
import { OnboardingStepLayout } from "./OnboardingStepLayout";
import { StepBadgeIcon } from "./StepBadgeIcon";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onBack: () => void;
  onContinue: (businessName: string) => void;
};

export const BusinessStep1Name = ({ onBack, onContinue }: Props) => {
  const [businessName, setBusinessName] = useState("");

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <OnboardingStepLayout
          bgImageSource={images.ONBOARDING.BUSINESS_1}
          onBack={onBack}
          activeStepIndex={0}
          primaryButtonLabel="Continue"
          onPrimaryPress={() => {
            const name = businessName.trim();
            if (!name) {
              showToastMessage("Please enter your business name");
              return;
            }
            onContinue(name);
          }}
        >
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* Top Store Badge */}
            <StepBadgeIcon iconName="storefront-outline" iconSize={36} />

            {/* Title & Subtitle */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(100)}
              style={styles.headerContainer}
            >
              <CustomText style={styles.title}>
                Thousands of <CustomText style={styles.titleBold}>STRON</CustomText> users can benefit from
                your offerings.
              </CustomText>
              <CustomText style={styles.subtitle}>
                Let{"'"}s get your business started
              </CustomText>
            </Animated.View>

            {/* Business Name Input */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(150)}
              style={styles.inputSection}
            >
              <CustomText style={styles.inputLabel}>
                What is your Business Name?
              </CustomText>
              <TextInput
                value={businessName}
                onChangeText={setBusinessName}
                placeholder="Enter business name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => {
                  const name = businessName.trim();
                  if (!name) {
                    showToastMessage("Please enter your business name");
                    return;
                  }
                  onContinue(name);
                }}
              />
            </Animated.View>
          </KeyboardAvoidingView>
        </OnboardingStepLayout>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: "space-between",
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
    lineHeight: 32,
  },
  titleBold: {
    ...headingTextStyles.h3,
    fontWeight: "800",
  },
  subtitle: {
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginTop: 8,
  },
  inputSection: {
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: "auto",
  },
  inputLabel: {
    ...fontTextStyles.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 10,
  },
  textInput: {
    height: 56,
    width: "100%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(11, 26, 58, 0.8)",
    paddingHorizontal: 16,
    ...fontTextStyles.regular,
    fontSize: 16,
    color: "#FFFFFF",
  },
});

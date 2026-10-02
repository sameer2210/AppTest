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
  onContinue: (name: string) => void;
  onSkip: () => void;
  initialName?: string;
};

export const IndividualStep1Name = ({ onBack, onContinue, onSkip, initialName = "" }: Props) => {
  const [userName, setUserName] = useState(initialName);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.root}>
        <OnboardingStepLayout
          bgImageSource={images.ONBOARDING.INDIVIDUAL_1}
          onBack={onBack}
          onSkip={onSkip}
          showSkip
          activeStepIndex={0}
          primaryButtonLabel="Continue"
          onPrimaryPress={() => {
            const name = userName.trim();
            if (!name) {
              showToastMessage("Please enter your name");
              return;
            }
            onContinue(name);
          }}
        >
          <KeyboardAvoidingView
            style={styles.keyboardAvoiding}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            {/* Top Header Section */}
            <View style={styles.headerSection}>
              <StepBadgeIcon iconName="people-outline" iconSize={36} />

              <Animated.View
                entering={FadeInDown.duration(400).delay(100)}
                style={styles.headerTextContainer}
              >
                <CustomText style={styles.title}>
                  STRON{"'"}s fitness community is waiting for you.
                </CustomText>
              </Animated.View>
            </View>

            {/* Input Section - Positioned comfortably below top */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(150)}
              style={styles.inputSection}
            >
              <CustomText style={styles.inputLabel}>
                What should we call you?
              </CustomText>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter your name"
                placeholderTextColor="rgba(255,255,255,0.4)"
                style={styles.textInput}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => {
                  const name = userName.trim();
                  if (!name) {
                    showToastMessage("Please enter your name");
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
  headerSection: {
    width: "100%",
    alignItems: "center",
  },
  headerTextContainer: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  title: {
    ...headingTextStyles.h3,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
  },
  inputSection: {
    paddingHorizontal: 20,
    width: "100%",
    marginBottom: "auto",
    marginTop: 65,
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

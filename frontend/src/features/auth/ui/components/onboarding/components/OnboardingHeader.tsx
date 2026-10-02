import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onBack?: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
};

export const OnboardingHeader = ({ onBack, onSkip, showSkip = false }: Props) => {
  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={styles.header}
    >
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}

      {showSkip && onSkip ? (
        <TouchableOpacity
          onPress={onSkip}
          activeOpacity={0.7}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Skip"
        >
          <CustomText style={styles.skipText}>Skip</CustomText>
        </TouchableOpacity>
      ) : (
        <View style={styles.spacer} />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  backBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  spacer: {
    width: 50,
    height: 50,
  },
  skipBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
});


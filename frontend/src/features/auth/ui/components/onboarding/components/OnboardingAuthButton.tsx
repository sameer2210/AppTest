import React from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
  variant?: "primary" | "secondary" | "link";
};

export const OnboardingAuthButton = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  iconName,
  imageSource,
  variant = "primary",
}: Props) => {
  if (variant === "link") {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={0.7}
        style={styles.linkButton}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#3B82F6" />
        ) : (
          <CustomText style={styles.linkText}>{label}</CustomText>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={disabled || loading ? 1 : 0.7}
      style={[styles.primaryButton, (disabled || loading) && styles.buttonDisabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <>
          {imageSource ? (
            <View style={styles.iconWrapper}>
              <Image source={imageSource} style={styles.googleIcon} resizeMode="contain" />
            </View>
          ) : iconName ? (
            <View style={styles.iconWrapper}>
              <Ionicons name={iconName} size={24} color="white" />
            </View>
          ) : null}
          <CustomText style={styles.primaryButtonText}>{label}</CustomText>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  linkButton: {
    height: 36,
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: {
    ...fontTextStyles.medium,
    fontSize: 16,
    color: "#000000",
    textDecorationLine: "underline",
  },
  primaryButton: {
    height: 55,
    width: 310,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  iconWrapper: {
    position: "absolute",
    left: 24,
  },
  googleIcon: {
    width: 20,
    height: 20,
    tintColor: "#FFFFFF",
  },
  primaryButtonText: {
    ...fontTextStyles.medium,
    fontSize: 18,
    color: "#FFFFFF",
  },
});

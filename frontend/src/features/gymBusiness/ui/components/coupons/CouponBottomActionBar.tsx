import React from "react";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

interface CouponBottomActionBarProps {
  onDiscard: () => void;
  onSave: () => void;
  isSubmitting?: boolean;
}

export const CouponBottomActionBar: React.FC<CouponBottomActionBarProps> = ({
  onDiscard,
  onSave,
  isSubmitting = false,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Left Pill: Discard */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.45)",
          "rgba(255, 255, 255, 0.08)",
          "rgba(255, 255, 255, 0.2)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.discardGradient}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onDiscard}
          disabled={isSubmitting}
          style={styles.discardButton}
          accessibilityRole="button"
          accessibilityLabel="Discard Coupon"
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 40 : 60}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          {/* Dark Glass with Subtle Left Highlight */}
          <LinearGradient
            colors={["rgba(26, 75, 175, 0.45)", "rgba(18, 18, 24, 0.8)", "rgba(12, 12, 16, 0.92)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <CustomText style={styles.discardText}>Discard</CustomText>
        </TouchableOpacity>
      </LinearGradient>

      {/* 2. Right Pill: Save */}
      <LinearGradient
        colors={[
          "rgba(255, 255, 255, 0.45)",
          "rgba(255, 255, 255, 0.08)",
          "rgba(255, 255, 255, 0.2)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.saveGradient}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onSave}
          disabled={isSubmitting}
          style={styles.saveButton}
          accessibilityRole="button"
          accessibilityLabel="Save Coupon"
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 40 : 60}
            tint="dark"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View pointerEvents="none" style={styles.saveOverlay} />
          <CustomText style={styles.saveText}>Save</CustomText>
          <View style={styles.saveArrowCircle}>
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#0A0A0A" />
            ) : (
              <Ionicons name="arrow-forward" size={24} color="#0A0A0A" />
            )}
          </View>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  discardGradient: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    padding: 1,
    elevation: 6,
  },
  discardButton: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  discardText: {
    ...fontTextStyles.buttonText,
    fontSize: 18,
    fontWeight: "600",
    color: "#FF7272",
    letterSpacing: 0.5,
  },
  saveGradient: {
    flex: 1.45,
    height: 60,
    borderRadius: 30,
    padding: 1,
    elevation: 6,
  },
  saveButton: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 6,
  },
  saveOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 18, 22, 0.85)",
  },
  saveText: {
    ...fontTextStyles.buttonText,
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  saveArrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
});

export default CouponBottomActionBar;

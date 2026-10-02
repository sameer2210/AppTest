import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

export type PermissionType =
  "activity" | "healthConnect" | "notification" | "camera" | "battery" | "location";

type PermissionModalProps = {
  visible: boolean;
  type: PermissionType;
  stepIndex?: number;
  totalSteps?: number;
  requesting?: boolean;
  onGrant: () => void;
  onSkip: () => void;
  onClose: () => void;
  /** iOS: fired after the modal has fully left the screen. */
  onDismiss?: () => void;
};

type PermissionCopy = {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  bullets: string[];
  primaryButtonText: string;
  secondaryText: string;
};

/** App Review 5.1.1(iv): iOS Motion/Health soft-ask must always proceed to the system dialog. */
const mustProceedToSystemDialog = (type: PermissionType): boolean =>
  Platform.OS === "ios" && (type === "activity" || type === "healthConnect");

const PERMISSION_CONFIG: Record<PermissionType, PermissionCopy> = {
  activity: {
    iconName: "disc-outline",
    title: "Track every step",
    subtitle: "Allow activity tracking so we can count your steps even when you're offline.",
    bullets: ["Games", "Challenges", "Leaderboards"],
    primaryButtonText: Platform.OS === "ios" ? "Continue" : "Enable Activity Tracking",
    secondaryText: "Next",
  },
  healthConnect: {
    iconName: "pulse-outline",
    title: "More accurate tracking",
    subtitle:
      Platform.OS === "ios"
        ? "Connect with Apple Health to keep your step count accurate."
        : "Connect with Health Connect to keep your step count accurate.",
    bullets: [
      "Steps sync even when STRON is in the background or closed",
      "No steps missed, accurate results always",
    ],
    primaryButtonText: Platform.OS === "ios" ? "Continue" : "Connect with Health Connect",
    secondaryText: "Next",
  },
  notification: {
    iconName: "notifications-outline",
    title: "Stay Updated",
    subtitle: "Enable notifications so you never miss important updates.",
    bullets: ["Activity Tracking Updates", "Event Reminders", "Challenge and Result Alerts"],
    primaryButtonText: "Enable Notification",
    secondaryText: "Next",
  },
  camera: {
    iconName: "camera-outline",
    title: "Enable Camera Access",
    subtitle:
      "Allow camera access to scan QR codes for fast event check-in and entry verification.",
    bullets: [
      "Scan QR codes for instant event check-in",
      "Verify event entry & participant badges",
      "Seamless venue & leaderboard access",
    ],
    primaryButtonText: "Enable Camera",
    secondaryText: "Next",
  },
  battery: {
    iconName: "battery-charging-outline",
    title: "Background Running",
    subtitle:
      "Allow STRON to run in the background so steps are tracked when your screen is locked.",
    bullets: [
      "Unrestricted step tracking in background",
      "No steps dropped during long walks or runs",
    ],
    primaryButtonText: "Disable Battery Optimization",
    secondaryText: "Next",
  },
  location: {
    iconName: "location-outline",
    title: "GPS & Distance Tracking",
    subtitle: "Grant location access to measure exact distance and pace during step races.",
    bullets: ["Accurate pace calculation per 1k steps", "GPS distance metrics for races & events"],
    primaryButtonText: "Enable Location Access",
    secondaryText: "Next",
  },
};

const PermissionModal = ({
  visible,
  type,
  stepIndex = 0,
  totalSteps = 3,
  requesting = false,
  onGrant,
  onSkip,
  onClose,
  onDismiss,
}: PermissionModalProps) => {
  const config = PERMISSION_CONFIG[type] || PERMISSION_CONFIG.activity;
  const hideDeferralControls = mustProceedToSystemDialog(type);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    translateYAnim.setValue(18);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [type, fadeAnim, translateYAnim]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={hideDeferralControls ? onGrant : onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.overlay}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <Animated.View
            style={[
              styles.sheetCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateYAnim }],
              },
            ]}
          >
            <View style={styles.headerRow}>
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={["#3586FF", "#0C56E8", "#03288C", "#010F42", "#000417"]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={styles.gradientBadge}
                >
                  <Ionicons name={config.iconName} size={28} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {totalSteps > 1 ? (
                <View style={styles.stepDotsRow}>
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.stepDot,
                        i === stepIndex ? styles.stepDotActive : styles.stepDotInactive,
                      ]}
                    />
                  ))}
                </View>
              ) : (
                <View style={styles.headerSpacer} />
              )}

              {hideDeferralControls ? (
                <View style={styles.closeButtonSpacer} />
              ) : (
                <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            <CustomText text={config.title} style={styles.titleText} />
            <CustomText text={config.subtitle} style={styles.subtitleText} />

            <View style={styles.bulletsContainer}>
              {config.bullets.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <CustomText text="•" style={styles.bulletDot} />
                  <CustomText text={bullet} style={styles.bulletText} />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                hideDeferralControls && styles.primaryButtonLast,
                requesting && styles.primaryButtonDisabled,
              ]}
              onPress={onGrant}
              activeOpacity={0.7}
              disabled={requesting}
            >
              <CustomText
                text={requesting ? "Opening…" : config.primaryButtonText}
                style={styles.primaryButtonText}
              />
            </TouchableOpacity>

            {!hideDeferralControls ? (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={onSkip}
                activeOpacity={0.7}
                disabled={requesting}
              >
                <CustomText text={config.secondaryText} style={styles.secondaryButtonText} />
              </TouchableOpacity>
            ) : null}
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default PermissionModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "flex-end",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  sheetCard: {
    width: "100%",
    backgroundColor: "#1C1C1E",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerSpacer: {
    flex: 1,
  },
  badgeContainer: {
    width: "16%",
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#000000",
    padding: 2,
  },
  gradientBadge: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  stepDotActive: {
    width: 18,
    backgroundColor: "#2A80FF",
  },
  stepDotInactive: {
    width: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  closeButton: {
    width: "12%",
    aspectRatio: 1,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonSpacer: {
    width: "12%",
    aspectRatio: 1,
  },
  primaryButtonLast: {
    marginBottom: 0,
  },
  titleText: {
    ...headingTextStyles.twentyFourSemiBoldBlack,
    color: "#FFFFFF",
  },
  subtitleText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 6,
    marginBottom: 20,
  },
  bulletsContainer: {
    marginBottom: 32,
    gap: 8,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
    marginRight: 10,
  },
  bulletText: {
    ...fontTextStyles.sixteenMediumBlack,
    flex: 1,
    color: "#FFFFFF",
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#2A80FF",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#2A80FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    opacity: 0.65,
  },
  primaryButtonText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#7F7F7F",
  },
});

import React, { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import type { ProSubscriptionInfo } from "@/types/gym/proSubscription.types";

interface ManageProModalProps {
  visible: boolean;
  isPaused?: boolean;
  subscription?: ProSubscriptionInfo | null;
  onClose: () => void;
  onPause: (pauseDays?: number) => Promise<boolean | void>;
  onResume: () => Promise<boolean | void>;
  onCancel: () => Promise<boolean | void>;
}

export const ManageProModal: React.FC<ManageProModalProps> = ({
  visible,
  isPaused = false,
  subscription,
  onClose,
  onPause,
  onResume,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pauseUntilLabel = subscription?.resumeAt
    ? new Date(subscription.resumeAt).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "14 days";

  const handlePausePress = () => {
    Alert.alert(
      "Pause for 14 Days",
      "STRON PRO features stay on. This only changes the in-app status for 14 days. Google Play and App Store will still charge on the normal renewal date unless you cancel there.",
      [
        { text: "No, Keep Active", style: "cancel" },
        {
          text: "Yes, Pause for 14 Days",
          style: "default",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onPause(14);
              onClose();
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  const handleResumePress = async () => {
    setIsSubmitting(true);
    try {
      await onResume();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelPress = () => {
    Alert.alert(
      "Cancel STRON PRO",
      "Are you sure you want to cancel your STRON PRO subscription? You will lose WhatsApp reminders, referral coupons, and advanced analytics at the end of this billing cycle.",
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Confirm Cancellation",
          style: "destructive",
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await onCancel();
              onClose();
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              <LinearGradient
                colors={["#1A2B4C", "#0A111E", "#04060A"]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFillObject}
              />

              {/* Close Button */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              {/* Header with Crown */}
              <View style={styles.headerContainer}>
                <Image
                  source={images.GYM_BUSINESS.STRON_PRO_CROWN_DIAMOND}
                  style={styles.crownImage}
                  resizeMode="contain"
                />
                <CustomText style={styles.modalTitle}>
                  Manage STRON PRO
                </CustomText>
                <View style={styles.statusPill}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isPaused ? "#FFBB38" : "#63FF61" },
                    ]}
                  />
                  <CustomText style={styles.statusText}>
                    {isPaused ? `Paused until ${pauseUntilLabel}` : "PRO Active"}
                  </CustomText>
                </View>
              </View>

              <CustomText style={styles.bodyDescription}>
                {isPaused
                  ? `You keep STRON PRO until ${pauseUntilLabel}. Store billing is unchanged.`
                  : "Need a short break? Pause the in-app status for 14 days. Play Store and App Store charges stay on their normal cycle."}
              </CustomText>

              {/* Actions */}
              <View style={styles.actionsContainer}>
                {isPaused ? (
                  <PressableScale
                    onPress={handleResumePress}
                    disabled={isSubmitting}
                    style={styles.primaryBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <CustomText style={styles.primaryBtnText}>
                        Resume Subscription Now
                      </CustomText>
                    )}
                  </PressableScale>
                ) : (
                  <PressableScale
                    onPress={handlePausePress}
                    disabled={isSubmitting}
                    style={styles.primaryBtn}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <View style={styles.pauseBtnContent}>
                        <Ionicons
                          name="pause-circle-outline"
                          size={18}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <CustomText style={styles.primaryBtnText}>
                          Pause for 14 Days
                        </CustomText>
                      </View>
                    )}
                  </PressableScale>
                )}

                <PressableScale
                  onPress={handleCancelPress}
                  disabled={isSubmitting}
                  style={styles.cancelBtn}
                >
                  <CustomText style={styles.cancelBtnText}>
                    Cancel Subscription
                  </CustomText>
                </PressableScale>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    overflow: "hidden",
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(67, 143, 255, 0.35)",
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  crownImage: {
    width: 70,
    height: 76,
    marginBottom: 8,
  },
  modalTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 13,
    color: "#FFFFFF",
  },
  bodyDescription: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: "#086CFF",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  pauseBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cancelBtn: {
    backgroundColor: "rgba(255, 91, 91, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 91, 91, 0.3)",
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
    color: "#FF5B5B",
  },
});

export default ManageProModal;

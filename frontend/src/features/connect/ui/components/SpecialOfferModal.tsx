import React from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

interface SpecialOfferModalProps {
  visible: boolean;
  onClose: () => void;
  offerCode?: string;
  redeemUrl?: string;
}

export const SpecialOfferModal: React.FC<SpecialOfferModalProps> = ({
  visible,
  onClose,
  offerCode = "STRONMARATHON202526",
  redeemUrl = "https://stron.in",
}) => {
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(offerCode);
      captureEvent("special_offer_copied", { code: offerCode });
      showToastMessage("Code copied");
    } catch {
      showToastMessage("Could not copy code.");
    }
  };

  const handleRedeem = async () => {
    captureEvent("special_offer_redeemed", { code: offerCode });
    const url = `${redeemUrl}?code=${encodeURIComponent(offerCode)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        showToastMessage("Could not open Stron website.");
      }
    } catch {
      showToastMessage("Could not open Stron website.");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerInfo}>
              <CustomText style={styles.title}>Special offer</CustomText>
              <CustomText style={styles.subtitle}>
                Copy this code and redeem it on the Stron website.
              </CustomText>
            </View>
            <PressableScale
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color="#111827" />
            </PressableScale>
          </View>

          {/* Offer Code Box */}
          <View style={styles.codeBox}>
            <CustomText style={styles.codeLabel}>
              OFFER CODE
            </CustomText>
            <CustomText style={styles.codeValue} selectable>
              {offerCode}
            </CustomText>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <PressableScale
              onPress={handleCopy}
              style={styles.copyButton}
            >
              <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
              <CustomText style={styles.buttonText}>Copy</CustomText>
            </PressableScale>
            <PressableScale
              onPress={handleRedeem}
              style={styles.redeemButton}
            >
              <Feather name="external-link" size={16} color="#FFFFFF" />
              <CustomText style={styles.buttonText}>Redeem</CustomText>
            </PressableScale>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 24,
    elevation: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    ...headingTextStyles.h3,
    fontSize: 22,
    color: "#000000",
  },
  subtitle: {
    ...fontTextStyles.regular,
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  codeBox: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    padding: 16,
    marginVertical: 16,
  },
  codeLabel: {
    ...fontTextStyles.bold,
    fontSize: 11,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  codeValue: {
    ...headingTextStyles.h4,
    fontSize: 20,
    color: "#000000",
    letterSpacing: 0.5,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  copyButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1F2937",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  redeemButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1E65FF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    ...fontTextStyles.semiBold,
    fontSize: 15,
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default SpecialOfferModal;

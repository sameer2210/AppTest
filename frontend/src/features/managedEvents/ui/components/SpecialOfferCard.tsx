import { useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { showToastMessage } from "@/utils/app-utils";
import { MARATHON_COUPON_CODE } from "@/constants/stron";
import { captureEvent } from "@/analytics/posthog/events";

const DEFAULT_OFFER_CODE = "STRON2026";
const REDEEM_URL = "https://stron.in";

const resolveOfferCode = () => (MARATHON_COUPON_CODE || DEFAULT_OFFER_CODE).trim().toUpperCase();

type Props = {
  eventKey?: string;
};

const SpecialOfferCard = ({ eventKey }: Props) => {
  const [open, setOpen] = useState(false);
  const code = resolveOfferCode();

  const openSheet = () => {
    captureEvent("special_offer_opened", { event_key: eventKey });
    setOpen(true);
  };

  const copyCode = async () => {
    try {
      await Clipboard.setStringAsync(code);
      captureEvent("special_offer_copied", { event_key: eventKey, code });
      showToastMessage("Code copied");
    } catch {
      showToastMessage("Could not copy code.");
    }
  };

  const redeem = async () => {
    captureEvent("special_offer_redeemed", { event_key: eventKey, code });
    const url = `${REDEEM_URL}?code=${encodeURIComponent(code)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToastMessage("Could not open Stron website.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToastMessage("Could not open Stron website.");
    }
  };

  return (
    <>
      <PressableScale
        onPress={openSheet}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel="You have a special offer. Click to claim."
      >
        <View style={styles.iconCircle}>
          <CustomText style={styles.emojiText}>🎉</CustomText>
        </View>
        <View style={styles.cardContent}>
          <CustomText style={styles.offerTitle}>You have a special offer.</CustomText>
          <CustomText style={styles.offerSubtitle}>Click to Claim</CustomText>
        </View>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
      </PressableScale>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalDismissArea} onPress={() => setOpen(false)} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTextWrap}>
                <CustomText style={styles.modalTitle}>Special offer</CustomText>
                <CustomText style={styles.modalSubtitle}>
                  Copy this code and redeem it on the Stron website.
                </CustomText>
              </View>
              <PressableScale
                onPress={() => setOpen(false)}
                style={styles.closeBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color="#111827" />
              </PressableScale>
            </View>

            <View style={styles.codeContainer}>
              <CustomText style={styles.codeLabel}>
                Offer code
              </CustomText>
              <CustomText style={styles.codeText} selectable>
                {code}
              </CustomText>
            </View>

            <View style={styles.buttonsRow}>
              <PressableScale
                onPress={() => void copyCode()}
                style={styles.copyBtn}
              >
                <Ionicons name="copy-outline" size={16} color="#FFFFFF" />
                <CustomText style={styles.buttonText}>Copy</CustomText>
              </PressableScale>
              <PressableScale
                onPress={() => void redeem()}
                style={styles.redeemBtn}
              >
                <Ionicons name="open-outline" size={16} color="#FFFFFF" />
                <CustomText style={styles.buttonText}>Redeem</CustomText>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    backgroundColor: "#1877F2",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emojiText: {
    fontSize: 24,
    lineHeight: 28,
  },
  cardContent: {
    flex: 1,
  },
  offerTitle: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
  },
  offerSubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalDismissArea: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  modalTitle: {
    ...fontTextStyles.twentyFourMediumBlack,
    color: "#000000",
  },
  modalSubtitle: {
    ...fontTextStyles.twelveNormalBlack,
    color: "rgba(0, 0, 0, 0.55)",
    marginTop: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  codeContainer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#F7F8FA",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  codeLabel: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(0, 0, 0, 0.45)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  codeText: {
    ...fontTextStyles.twentyFourMediumBlack,
    color: "#000000",
    letterSpacing: 1.5,
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  copyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#191919",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  redeemBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#1877F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  buttonText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
    marginLeft: 8,
  },
});

export default SpecialOfferCard;


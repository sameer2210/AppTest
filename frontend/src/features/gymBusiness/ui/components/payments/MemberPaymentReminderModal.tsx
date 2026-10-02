import React, { useState } from "react";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Linking,
  StyleSheet,
} from "react-native";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useAppDispatch } from "@/store/hooks";
import { sendPaymentReminderThunk } from "@/features/gymBusiness";
import type { MemberPaymentSummary } from "@/types/gym/payment.types";
import { showToastMessage } from "@/utils/app-utils";
import { shareMessageWithLink } from "@/utils/shareMessage";

interface MemberPaymentReminderModalProps {
  visible: boolean;
  member: MemberPaymentSummary | null;
  onClose: () => void;
}

export const MemberPaymentReminderModal: React.FC<MemberPaymentReminderModalProps> = ({
  visible,
  member,
  onClose,
}) => {
  const dispatch = useAppDispatch();
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!member) return null;

  const paymentUrl = `https://stron.fit/pay/m/${member.memberId}`;
  const reminderMessage = `Hi ${member.memberName}, this is a gentle reminder from business management regarding your pending membership fee of ₹${member.totalDue.toLocaleString("en-IN")}. You can pay directly here: ${paymentUrl}. Thank you!`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(paymentUrl);
    setCopiedLink(true);
    showToastMessage("Payment link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSendAppReminder = async () => {
    setIsSending(true);
    setStatusMessage(null);
    try {
      const res = await dispatch(sendPaymentReminderThunk(member.memberId)).unwrap();
      setStatusMessage(res.message);
      showToastMessage(res.message);
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch {
      showToastMessage("Could not send reminder.");
    } finally {
      setIsSending(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!member.phone) {
      showToastMessage("No phone number available for member.");
      return;
    }
    const cleanPhone = member.phone.replace(/[^0-9]/g, "");
    const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(reminderMessage)}`;
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        dispatch(sendPaymentReminderThunk(member.memberId)).unwrap().catch(() => {});
      } else {
        await shareMessageWithLink({ message: reminderMessage, url: paymentUrl });
      }
    } catch {
      await shareMessageWithLink({ message: reminderMessage, url: paymentUrl });
    }
  };

  const handleSystemShare = async () => {
    try {
      await shareMessageWithLink({
        message: reminderMessage,
        url: paymentUrl,
        title: `Payment Reminder - ${member.memberName}`,
      });
    } catch {
      // Ignore dismiss
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContent}>
              {/* Header */}
              <View style={styles.headerRow}>
                <CustomText style={styles.headerTitle}>Send Payment Reminder</CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={styles.closeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Subtitle & 6-Hour Rule info */}
              <CustomText style={styles.subtitleText}>
                Remind {member.memberName} to clear pending dues (1 reminder every 6 hours).
              </CustomText>

              {/* Due Summary Card */}
              <View style={styles.dueSummaryCard}>
                <View style={{ flex: 1 }}>
                  <CustomText style={styles.planNameText}>{member.billingCycleText}</CustomText>
                  <CustomText style={styles.phoneText}>{member.phone || "No phone linked"}</CustomText>
                </View>
                <View style={styles.dueBadge}>
                  <CustomText style={styles.dueBadgeLabel}>Total Due</CustomText>
                  <CustomText style={styles.dueBadgeValue}>
                    ₹{member.totalDue.toLocaleString("en-IN")}
                  </CustomText>
                </View>
              </View>

              {/* Status Message if cooldown or response */}
              {statusMessage && (
                <View style={styles.statusBox}>
                  <Ionicons name="information-circle" size={16} color="#2A80FF" />
                  <CustomText style={styles.statusText}>{statusMessage}</CustomText>
                </View>
              )}

              {/* Payment URL Copy Box */}
              <CustomText style={styles.fieldLabel}>Payment URL</CustomText>
              <View style={styles.urlCopyBox}>
                <CustomText style={styles.urlText} numberOfLines={1}>
                  {paymentUrl}
                </CustomText>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleCopyLink}
                  style={[styles.copyButton, copiedLink ? styles.copyButtonActive : null]}
                >
                  <Feather
                    name={copiedLink ? "check" : "copy"}
                    size={14}
                    color={copiedLink ? "#63FF61" : "#FFFFFF"}
                    style={{ marginRight: 4 }}
                  />
                  <CustomText style={[styles.copyButtonText, copiedLink ? { color: "#63FF61" } : null]}>
                    {copiedLink ? "Copied" : "Copy"}
                  </CustomText>
                </TouchableOpacity>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {/* 1. Send via WhatsApp */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleWhatsAppShare}
                  style={styles.whatsAppButton}
                >
                  <FontAwesome5
                    name="whatsapp"
                    size={18}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <CustomText style={styles.actionButtonText}>Send via WhatsApp</CustomText>
                </TouchableOpacity>

                {/* 2. Send Push / In-App Reminder */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSendAppReminder}
                  disabled={isSending}
                  style={styles.pushReminderButton}
                >
                  {isSending ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="notifications-outline"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 8 }}
                      />
                      <CustomText style={styles.actionButtonText}>Send App Reminder</CustomText>
                    </>
                  )}
                </TouchableOpacity>

                {/* 3. Share Message */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleSystemShare}
                  style={styles.shareOptionButton}
                >
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color="rgba(255, 255, 255, 0.8)"
                    style={{ marginRight: 8 }}
                  />
                  <CustomText style={styles.shareOptionText}>Share Message via SMS / Other</CustomText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#1C1C1C",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  headerTitle: {
    ...fontTextStyles.size24BoldBlack,
    color: "#FFFFFF",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  subtitleText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  dueSummaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  planNameText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  phoneText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 3,
  },
  dueBadge: {
    alignItems: "flex-end",
  },
  dueBadgeLabel: {
    ...fontTextStyles.twelveMediumBlack,
    color: "#FF5151",
    textTransform: "uppercase",
  },
  dueBadgeValue: {
    ...fontTextStyles.twentyTwoBoldBlack,
    color: "#FF5151",
    marginTop: 1,
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(42, 128, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(42, 128, 255, 0.3)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
    gap: 8,
  },
  statusText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFFFFF",
    flex: 1,
  },
  fieldLabel: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  urlCopyBox: {
    height: 48,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingLeft: 14,
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  urlText: {
    ...fontTextStyles.twelveNormalBlack,
    color: "#2A80FF",
    flex: 1,
    marginRight: 10,
  },
  copyButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  copyButtonActive: {
    backgroundColor: "rgba(99, 255, 97, 0.15)",
  },
  copyButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  actionsContainer: {
    gap: 10,
  },
  whatsAppButton: {
    width: "100%",
    height: 52,
    borderRadius: 10,
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pushReminderButton: {
    width: "100%",
    height: 52,
    borderRadius: 10,
    backgroundColor: "#2A80FF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  shareOptionButton: {
    width: "100%",
    height: 44,
    borderRadius: 10,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareOptionText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
});

export default MemberPaymentReminderModal;

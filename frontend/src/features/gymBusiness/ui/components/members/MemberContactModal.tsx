import React from "react";
import { View, Modal, TouchableOpacity, Linking, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons, Feather, FontAwesome5 } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { showToastMessage } from "@/utils/app-utils";

interface MemberContactModalProps {
  visible: boolean;
  onClose: () => void;
  gymName?: string;
  member: {
    name: string;
    phone?: string | null;
    email?: string | null;
    category?: "NEW_LEADS" | "EXPIRED" | "ABOUT_TO_EXPIRE" | "MORE_THAN_WEEK";
    daysCount?: number;
    subheadingText?: string;
    whatsappText?: string;
    autoRenew?: boolean;
  } | null;
}

export const MemberContactModal: React.FC<MemberContactModalProps> = ({
  visible,
  onClose,
  gymName,
  member,
}) => {
  if (!visible || !member) return null;

  const rawPhone = (member.phone || "").replace(/[^\d+]/g, "");
  const formattedPhone = member.phone || "No phone available";
  const formattedEmail = member.email || "No email available";

  const whatsappMessage =
    member.whatsappText ||
    (member.daysCount
      ? `Your membership at ${gymName || "our business"} expires in ${member.daysCount} days. Please don’t forget to renew to continue your fitness journey.`
      : "Hello from STRON!");

  const handleCall = () => {
    if (rawPhone) {
      Linking.openURL(`tel:${rawPhone}`).catch(() => {
        showToastMessage("Could not open dialer");
      });
    } else {
      showToastMessage("No phone number available");
    }
  };

  const handleWhatsApp = () => {
    if (rawPhone) {
      const cleanDigits = rawPhone.replace(/\+/g, "");
      const encodedMsg = encodeURIComponent(whatsappMessage);
      Linking.openURL(`https://wa.me/${cleanDigits}?text=${encodedMsg}`).catch(() => {
        showToastMessage("Could not open WhatsApp");
      });
    } else {
      showToastMessage("No phone number available");
    }
  };

  const handleCopy = async () => {
    const textToCopy = member.email || member.phone;
    if (textToCopy) {
      await Clipboard.setStringAsync(textToCopy);
      showToastMessage(
        member.email ? "Email copied to clipboard" : "Phone number copied to clipboard",
      );
      onClose();
    } else {
      showToastMessage("Nothing to copy");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.sheet}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <CustomText style={styles.headerTitle}>Contact Info</CustomText>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          {/* Phone Row */}
          <View style={styles.contactRow}>
            <CustomText style={styles.contactValue} numberOfLines={1}>
              {formattedPhone}
            </CustomText>

            <View style={styles.actionsRow}>
              {/* WhatsApp Button */}
              <TouchableOpacity
                activeOpacity={rawPhone ? 0.7 : 1}
                disabled={!rawPhone}
                onPress={handleWhatsApp}
                style={[
                  styles.actionButton,
                  !rawPhone ? styles.buttonDisabled : null,
                ]}
                accessibilityState={{ disabled: !rawPhone }}
              >
                <FontAwesome5 name="whatsapp" size={15} color="#25D366" />
                <CustomText style={styles.actionButtonText}>Whatsapp</CustomText>
              </TouchableOpacity>

              {/* Call Button */}
              <TouchableOpacity
                activeOpacity={rawPhone ? 0.7 : 1}
                disabled={!rawPhone}
                onPress={handleCall}
                style={[
                  styles.actionButton,
                  !rawPhone ? styles.buttonDisabled : null,
                ]}
                accessibilityState={{ disabled: !rawPhone }}
              >
                <Feather name="phone-outgoing" size={13} color="#FFFFFF" />
                <CustomText style={styles.actionButtonText}>Call</CustomText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Email Row */}
          <View style={[styles.contactRow, styles.emailRow]}>
            <CustomText style={styles.contactValue} numberOfLines={1}>
              {formattedEmail}
            </CustomText>

            <View style={styles.actionsRow}>
              {/* Copy Button */}
              <TouchableOpacity
                activeOpacity={member.email || member.phone ? 0.7 : 1}
                disabled={!member.email && !member.phone}
                onPress={handleCopy}
                style={[
                  styles.copyButton,
                  !member.email && !member.phone ? styles.buttonDisabled : null,
                ]}
                accessibilityState={{ disabled: !member.email && !member.phone }}
              >
                <CustomText style={styles.actionButtonText}>Copy</CustomText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#16171B",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  emailRow: {
    marginTop: 14,
  },
  contactValue: {
    ...fontTextStyles.bodyMedium,
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.6)",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    height: 38,
    backgroundColor: "#373737",
    borderWidth: 1,
    borderColor: "#474747",
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  copyButton: {
    height: 38,
    width: 111,
    backgroundColor: "#373737",
    borderWidth: 1,
    borderColor: "#474747",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  actionButtonText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    fontWeight: "400",
    color: "#FFFFFF",
  },
});

export default MemberContactModal;

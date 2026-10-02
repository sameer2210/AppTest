import React from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

interface ActivityRulesModalProps {
  visible: boolean;
  onClose: () => void;
  rulesBullets: string[];
}

export const ActivityRulesModal: React.FC<ActivityRulesModalProps> = ({
  visible,
  onClose,
  rulesBullets,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlayCenter}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.rulesCard}>
          <CustomText style={styles.rulesCardTitle}>Description</CustomText>
          <View style={styles.rulesList}>
            {rulesBullets.map((line, idx) => (
              <CustomText key={`${idx}-${line.slice(0, 24)}`} style={styles.rulesBulletText}>
                {idx === 0 ? line : `• ${line}`}
              </CustomText>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  rulesCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#16181D",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    padding: 22,
  },
  rulesCardTitle: {
    ...fontTextStyles.eighteenBoldBlack,
    color: "#FFFFFF",
    marginBottom: 14,
  },
  rulesList: {
    gap: 10,
  },
  rulesBulletText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.85)",
  },
});

export default ActivityRulesModal;

import { useState } from "react";
import { View, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type Props = {
  onQuitRace: () => void;
};

export const ActiveRaceFooter = ({ onQuitRace }: Props) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <View style={styles.container}>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel="Quit Race"
        style={styles.quitBtn}
        onPress={() => setShowConfirmModal(true)}
      >
        <Ionicons name="exit-outline" size={22} color="#041538" />
        <CustomText text="Quit Race" style={[fontTextStyles.bold, styles.quitBtnText]} />
      </PressableScale>

      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="alert-circle-outline" size={36} color="#FF5C5C" />
            </View>

            <CustomText text="Quit Step Race?" style={[fontTextStyles.bold, styles.modalTitle]} />
            <CustomText
              text="Are you sure you want to forfeit this race? This action will end your active race."
              style={[fontTextStyles.regular, styles.modalDesc]}
            />

            <View style={styles.modalBtnRow}>
              <PressableScale
                style={styles.keepRacingBtn}
                onPress={() => setShowConfirmModal(false)}
              >
                <CustomText text="Keep Racing" style={[fontTextStyles.medium, styles.keepRacingText]} />
              </PressableScale>

              <PressableScale
                style={styles.confirmQuitBtn}
                onPress={() => {
                  setShowConfirmModal(false);
                  onQuitRace();
                }}
              >
                <CustomText text="Quit Race" style={[fontTextStyles.bold, styles.confirmQuitText]} />
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: "auto",
    marginBottom: 24,
  },
  quitBtn: {
    width: "100%",
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  quitBtnText: {
    ...fontTextStyles.seventeenBoldBlack,
    color: "#041538",
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#061B42",
    padding: 24,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 92, 92, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 92, 92, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    ...headingTextStyles.size24BoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
  modalDesc: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
  },
  keepRacingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  keepRacingText: {
    ...fontTextStyles.fifteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  confirmQuitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FF5C5C",
    alignItems: "center",
  },
  confirmQuitText: {
    ...fontTextStyles.fifteenSemiBoldBlack,
    color: "#FFFFFF",
  },
});

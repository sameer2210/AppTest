import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type ConfirmationModalProps = {
  visible: boolean;
  title: string;
  message?: string;
  titleColor?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  hideCancelButton?: boolean;
  hideConfirmButton?: boolean;
};

const ConfirmationModal = ({
  visible,
  title,
  message,
  titleColor = "#000000",
  cancelText = "No",
  confirmText = "Yes",
  onCancel,
  onConfirm,
  hideCancelButton = false,
  hideConfirmButton = false,
}: ConfirmationModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <CustomText text={title} style={[styles.title, { color: titleColor }]} />
          {message ? <CustomText text={message} style={styles.message} /> : null}

          <View style={styles.actions}>
            {!hideCancelButton ? (
              <TouchableOpacity
                onPress={onCancel}
                style={styles.cancelButton}
                activeOpacity={0.7}
              >
                <CustomText text={cancelText} style={styles.buttonLabel} />
              </TouchableOpacity>
            ) : null}

            {!hideConfirmButton ? (
              <TouchableOpacity
                onPress={onConfirm}
                style={styles.confirmButton}
                activeOpacity={0.7}
              >
                <CustomText text={confirmText} style={styles.buttonLabel} />
              </TouchableOpacity>
            ) : null}
          </View>
        </Pressable>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    width: "100%",
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: "center",
  },
  title: {
    ...fontTextStyles.twentyFourSemiBoldBlack,
    textAlign: "center",
  },
  message: {
    ...fontTextStyles.sixteenNormalBlack,
    textAlign: "center",
    color: "#4B4B4B",
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    width: "100%",
    gap: 16,
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: "#727272",
    flex: 1,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  confirmButton: {
    backgroundColor: "#000000",
    flex: 1,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  buttonLabel: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFFFFF",
  },
});

export default ConfirmationModal;

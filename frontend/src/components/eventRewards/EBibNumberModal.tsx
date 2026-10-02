import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { headingTextStyles } from "@/utils/typography";
import CustomText from "../CustomText";
import { images } from "@/utils/images";
import { formatPlanLabelUpper } from "@/utils/rewards.utils";
import { ctaStyles } from "@/utils/ctaStyles";
import { captureEvent } from "@/analytics/posthog/events";
import { useEffect } from "react";

type Props = {
  visible: boolean;
  bibNumber: string;
  participantName: string;
  planLabel?: string | null;
  onClose: () => void;
};

const BIB_BOX_HEIGHT = 320;

const EBibNumberModal = ({ visible, bibNumber, participantName, planLabel, onClose }: Props) => {
  useEffect(() => {
    if (visible) {
      captureEvent("ebib_viewed", {});
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.templateWrap}>
            <Image
              source={images.REWARDS.BIB_TEMPLATE}
              style={styles.templateImage}
              resizeMode="cover"
            />
            <View style={[styles.overlayText, styles.bibNumberWrap]}>
              <CustomText
                text={bibNumber.trim() || "—"}
                style={styles.bibNumber}
                numberOfLines={1}
              />
            </View>
            <View style={[styles.overlayText, styles.participantWrap]}>
              <CustomText
                text={participantName.toUpperCase()}
                style={styles.participantName}
                numberOfLines={1}
              />
            </View>
            <View style={[styles.overlayText, styles.planWrap]}>
              <CustomText
                text={formatPlanLabelUpper(planLabel)}
                style={styles.planLabel}
                numberOfLines={1}
              />
            </View>
          </View>

          <TouchableOpacity
            style={ctaStyles.primaryButtonSoft}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <CustomText text="CLOSE" style={ctaStyles.primaryButtonText} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default EBibNumberModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  templateWrap: {
    width: "100%",
    height: BIB_BOX_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  templateImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  overlayText: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  bibNumberWrap: {
    top: BIB_BOX_HEIGHT * 0.39,
  },
  bibNumber: {
    ...headingTextStyles.size56ExtraBoldBlack,
    color: "#000000",
    textAlign: "center",
  },
  participantWrap: {
    top: BIB_BOX_HEIGHT * 0.63,
  },
  participantName: {
    ...headingTextStyles.eighteenExtraBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
  planWrap: {
    top: BIB_BOX_HEIGHT * 0.72,
  },
  planLabel: {
    ...headingTextStyles.twentyTwoExtraBoldBlack,
    color: "#FFFFFF",
    textAlign: "center",
  },
});

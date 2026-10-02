import { Image, Modal, Pressable, StyleSheet, View } from "react-native";
import { useRef } from "react";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { StronReward } from "@/models/stronManaged/reward";
import { images } from "@/utils/images";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { buildScoreLine, medalImageForReward } from "@/utils/rewards.utils";
import { shareCapturedView } from "@/utils/shareRewardVisual";

type Props = {
  visible: boolean;
  reward: StronReward | null;
  onClose: () => void;
};

const RewardPreviewModal = ({ visible, reward, onClose }: Props) => {
  const viewRef = useRef<View>(null);
  if (!reward) return null;

  const onShare = async () => {
    await shareCapturedView({
      viewRef,
      fallbackMessage: `I earned a ${reward.medalTier || "participation"} reward in ${reward.eventTitle} on STRON!`,
      dialogTitle: "Share reward",
    });
  };

  const avatar = getProfileImageSource(reward.avatarUrl, reward.uid);
  const scoreLine = buildScoreLine(reward);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={ZoomIn.duration(280)}
          style={styles.contentCard}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View ref={viewRef} collapsable={false}>
              <View style={styles.headerRow}>
                <PressableScale
                  onPress={onClose}
                  style={styles.closeBtn}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={16} color="#021124" />
                </PressableScale>
                <PressableScale
                  onPress={() => void onShare()}
                  style={styles.shareBtn}
                >
                  <CustomText style={styles.shareText}>Share</CustomText>
                </PressableScale>
              </View>

              <Animated.View entering={FadeIn.delay(80)} style={styles.imageWrap}>
                <Image
                  source={
                    reward.type === "medal" ? medalImageForReward(reward) : images.REWARDS.CERTIFICATE
                  }
                  style={reward.type === "medal" ? styles.medalImage : styles.certImage}
                  resizeMode="contain"
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(120)} style={styles.scoreRow}>
                <CustomText style={styles.scoreLabel}>Your Score</CustomText>
                <Image source={avatar} style={styles.avatar} resizeMode="cover" />
                <CustomText style={styles.userName} numberOfLines={1}>
                  {reward.displayName || "Athlete"}
                </CustomText>
              </Animated.View>

              {scoreLine ? (
                <CustomText style={styles.scoreLineText} numberOfLines={2}>
                  {scoreLine}
                </CustomText>
              ) : null}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  contentCard: {
    width: "100%",
    maxWidth: 365,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F0F4FF",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    height: 28,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  imageWrap: {
    alignItems: "center",
    marginTop: -4,
  },
  medalImage: {
    width: 93,
    height: 133,
  },
  certImage: {
    width: 140,
    height: 110,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  scoreLabel: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#000000",
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  userName: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#000000",
  },
  scoreLineText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(0, 0, 0, 0.6)",
    marginTop: 6,
  },
});

export default RewardPreviewModal;


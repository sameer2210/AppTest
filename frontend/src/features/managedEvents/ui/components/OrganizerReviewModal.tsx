import React from "react";
import { Image, Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";

type Props = {
  visible: boolean;
  onClose: () => void;
  eventTitle: string;
  organizerName: string;
  organizerAvatar?: string | null;
  organizerUid?: string | null;
  rating: number;
  onRatingChange: (n: number) => void;
  onSubmitRating: () => void;
  submitting?: boolean;
  onViewLeaderboard?: () => void;
  onViewRewards?: () => void;
};

export const OrganizerReviewModal = ({
  visible,
  onClose,
  eventTitle,
  organizerName,
  organizerAvatar,
  organizerUid,
  rating,
  onRatingChange,
  onSubmitRating,
  submitting = false,
  onViewLeaderboard,
  onViewRewards,
}: Props) => {
  const avatarSource = getProfileImageSource(organizerAvatar, organizerUid || organizerName);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={styles.backdrop}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.modalCard}
        >
          {/* Header Event Title Badge */}
          <View style={styles.eventHeaderBadge}>
            <CustomText style={styles.eventTitle} numberOfLines={1}>
              {eventTitle}
            </CustomText>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <CustomText style={styles.statusText}>Event Completed</CustomText>
            </View>
          </View>

          {/* Organizer Avatar */}
          <View style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatarImg} resizeMode="cover" />
          </View>

          {/* Title & Subtitle */}
          <CustomText style={styles.heading}>
            Rate {organizerName}
          </CustomText>
          <CustomText style={styles.subheading}>
            How was your experience with {organizerName} as the organizer?
          </CustomText>

          {/* Star Rating Selection */}
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <PressableScale
                key={star}
                onPress={() => onRatingChange(star)}
                accessibilityRole="button"
                accessibilityLabel={`Rate ${star} stars`}
              >
                <Ionicons
                  name={star <= rating ? "star" : "star-outline"}
                  size={36}
                  color={star <= rating ? "#FFC107" : "rgba(255,255,255,0.25)"}
                />
              </PressableScale>
            ))}
          </View>

          {/* Submit Rating Button */}
          <PressableScale
            onPress={onSubmitRating}
            disabled={submitting}
            style={styles.submitBtn}
          >
            <CustomText style={styles.submitBtnText}>
              {submitting ? "Submitting…" : "Submit Rating"}
            </CustomText>
          </PressableScale>

          {/* Divider WHAT'S NEXT */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <CustomText style={styles.dividerText}>
              WHAT'S NEXT
            </CustomText>
            <View style={styles.dividerLine} />
          </View>

          {/* Bottom Action Buttons */}
          <View style={styles.actionRow}>
            <PressableScale
              onPress={onViewLeaderboard}
              style={styles.actionBtn}
            >
              <CustomText style={styles.actionBtnText}>View Leaderboard</CustomText>
            </PressableScale>

            <PressableScale
              onPress={onViewRewards}
              style={styles.actionBtn}
            >
              <CustomText style={styles.actionBtnText}>View Rewards</CustomText>
            </PressableScale>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#161618",
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 24,
  },
  eventHeaderBadge: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#242426",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventTitle: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  statusRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34C759",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#34C759",
  },
  avatarWrap: {
    marginVertical: 20,
    width: 76,
    height: 76,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 38,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  heading: {
    textAlign: "center",
    fontSize: 20,
    color: "#FFFFFF",
  },
  subheading: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.6)",
  },
  starsRow: {
    marginVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  submitBtn: {
    height: 54,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#2B6BEE",
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  dividerRow: {
    marginVertical: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255, 255, 255, 0.4)",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    height: 48,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#38383A",
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});

export default OrganizerReviewModal;

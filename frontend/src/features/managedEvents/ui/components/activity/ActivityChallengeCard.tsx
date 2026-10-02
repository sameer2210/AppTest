import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import {
  type ActivityItem,
  formatDaysRemainingLabel,
  formatKingSecondsLabel,
  formatStartsLabel,
  formatStepsShort,
  isLiveOrFinished,
} from "./activity.types";

interface ActivityChallengeCardProps {
  item: ActivityItem;
  openEvent: (
    eventKey: string,
    role?: "participant" | "organizer",
    eventStatus?: string | null,
  ) => void;
  openRulesModal: (item: ActivityItem) => void;
}

export const ActivityChallengeCard: React.FC<ActivityChallengeCardProps> = ({
  item,
  openEvent,
  openRulesModal,
}) => {
  const isOrganizer = item.role === "organizer";
  const isFaceOff = item.format === "face_off";
  const isKoth = item.format === "king_of_the_hill";
  const isStepChallenge = item.format === "virtual_step_challenge";
  const showProgress = isLiveOrFinished(item.eventStatus);
  const daysLeftText = formatDaysRemainingLabel(item.deadlineDate);
  const startsText = formatStartsLabel(item.startDate);
  const organizerName = item.organizerName || "Organizer";

  const statusParts: string[] = [];
  if (isOrganizer) {
    statusParts.push("Organizing");
    if (item.registrationCount != null) {
      statusParts.push(`${item.registrationCount} Registered`);
    }
  } else if (!showProgress) {
    if (item.participationStatus === "registered" || item.eventStatus === "published") {
      statusParts.push("Registered");
    } else if (item.actionLabel) {
      statusParts.push(item.actionLabel);
    } else {
      statusParts.push("Ticket");
    }
    if (startsText) statusParts.push(startsText);
  } else {
    if (item.rank != null && Number(item.rank) > 0) {
      statusParts.push(`Rank #${item.rank}`);
    } else {
      statusParts.push("In Progress");
    }
    if (isStepChallenge && item.successfulDays != null && item.requiredDays != null) {
      statusParts.push(`Successful Days: ${item.successfulDays}/${item.requiredDays}`);
    } else if (isStepChallenge && item.successfulDays != null) {
      statusParts.push(`Successful Days: ${item.successfulDays}`);
    }
    if (daysLeftText) statusParts.push(daysLeftText);
  }

  const dayPercent =
    isStepChallenge &&
    item.requiredDays != null &&
    item.requiredDays > 0 &&
    item.successfulDays != null
      ? Math.min(100, Math.max(0, Math.round((item.successfulDays / item.requiredDays) * 100)))
      : item.progressPercent != null && Number.isFinite(item.progressPercent)
        ? Math.max(0, Math.min(100, Math.round(item.progressPercent)))
        : null;

  return (
    <View style={styles.challengeCard}>
      <PressableScale
        onPress={() => openEvent(item.eventKey, item.role, item.eventStatus)}
        scale={0.98}
      >
        <View style={styles.challengeTopRow}>
          <CustomText style={styles.challengeTitle} numberOfLines={1}>
            {item.title}
          </CustomText>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
        </View>

        {statusParts.length > 0 ? (
          <View style={styles.challengeSubRow}>
            {statusParts.map((part, idx) => (
              <React.Fragment key={`${part}-${idx}`}>
                {idx > 0 ? <CustomText style={styles.challengeDot}>•</CustomText> : null}
                <CustomText style={styles.challengeSubText}>{part}</CustomText>
              </React.Fragment>
            ))}
          </View>
        ) : null}

        {showProgress ? (
          isKoth ? (
            <View style={styles.challengeStatGrid}>
              <View style={styles.challengeStatBox}>
                <CustomText style={styles.statBoxLabel}>Wins</CustomText>
                <CustomText style={styles.statBoxValue}>{item.totalWins || 0}</CustomText>
              </View>
              <View style={styles.challengeStatBox}>
                <CustomText style={styles.statBoxLabel}>King Time</CustomText>
                <CustomText style={styles.statBoxValue}>
                  {formatKingSecondsLabel(item.totalKingSeconds)}
                </CustomText>
              </View>
            </View>
          ) : isFaceOff ? (
            <View style={styles.challengeStatGrid}>
              <View style={styles.challengeStatBox}>
                <CustomText style={styles.statBoxLabel}>Your Steps</CustomText>
                <CustomText style={styles.statBoxValue}>
                  {item.coveredSteps != null ? item.coveredSteps.toLocaleString("en-US") : 0}
                </CustomText>
              </View>
              <View style={styles.challengeStatBox}>
                <CustomText style={styles.statBoxLabel}>Target</CustomText>
                <CustomText style={styles.statBoxValue}>
                  {item.targetSteps != null ? item.targetSteps.toLocaleString("en-US") : "—"}
                </CustomText>
              </View>
            </View>
          ) : isStepChallenge && dayPercent != null ? (
            <View style={{ marginTop: 8 }}>
              <View style={styles.progressTextRow}>
                <CustomText style={styles.progressCurrentText}>
                  {item.successfulDays || 0} / {item.requiredDays || 0} days
                </CustomText>
                <CustomText style={styles.progressTargetText}>{dayPercent}%</CustomText>
              </View>
              <View style={styles.progressBarTrack}>
                <LinearGradient
                  colors={["#003dcf", "#4e92ff"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${dayPercent}%` }]}
                />
              </View>
              {item.dailyStepTarget != null && item.dailyStepTarget > 0 ? (
                <CustomText style={styles.progressHint}>
                  Daily target: {formatStepsShort(item.dailyStepTarget)} steps
                </CustomText>
              ) : null}
            </View>
          ) : item.progressLabel ? (
            <CustomText style={styles.challengeHighlightBlue}>{item.progressLabel}</CustomText>
          ) : null
        ) : null}
      </PressableScale>

      <View style={styles.challengeBottomRow}>
        <PressableScale
          style={styles.organizerInfoGroup}
          onPress={() => openEvent(item.eventKey, item.role, item.eventStatus)}
        >
          <View style={styles.organizerAvatarCircle}>
            <Image
              source={getProfileImageSource(
                item.organizerLogoUrl,
                item.organizerUid || item.creatorUid || item.userId || item.id,
              )}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          </View>
          <View>
            <CustomText style={styles.organizerLabel}>Organized By</CustomText>
            <CustomText style={styles.organizerName}>{organizerName}</CustomText>
          </View>
        </PressableScale>

        <PressableScale style={styles.rulesButton} onPress={() => openRulesModal(item)}>
          <CustomText style={styles.rulesButtonText}>Rules</CustomText>
          <Feather name="info" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  challengeCard: {
    backgroundColor: "#212121",
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
    minHeight: 157,
  },
  challengeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  challengeTitle: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  challengeSubRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
    marginBottom: 12,
  },
  challengeSubText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  challengeDot: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.4)",
    marginHorizontal: 6,
  },
  challengeStatGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  challengeStatBox: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  statBoxLabel: {
    ...fontTextStyles.tenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 2,
  },
  statBoxValue: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  challengeHighlightBlue: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#2a80ff",
    marginVertical: 12,
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  progressCurrentText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.5)",
    flex: 1,
  },
  progressTargetText: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
  },
  progressHint: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.45)",
    marginTop: -4,
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 17,
    backgroundColor: "#d9d9d9",
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 17,
  },
  challengeBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  organizerInfoGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  organizerAvatarCircle: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  organizerLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.75)",
  },
  organizerName: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  rulesButton: {
    backgroundColor: "#2a80ff",
    borderRadius: 23,
    height: 29,
    width: 104,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  rulesButtonText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFFFFF",
  },
});

export default ActivityChallengeCard;

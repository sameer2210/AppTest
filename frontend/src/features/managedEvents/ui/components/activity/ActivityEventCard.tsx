import React from "react";
import { View, Image, Linking, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import { Ionicons, Feather } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import {
  type ActivityItem,
  formatEventSubtitle,
  isLiveOrFinished,
  mapUrlForItem,
} from "./activity.types";

interface ActivityEventCardProps {
  item: ActivityItem;
  openEvent: (
    eventKey: string,
    role?: "participant" | "organizer",
    eventStatus?: string | null,
  ) => void;
  openContactModal: (item: ActivityItem) => void;
  openRulesModal: (item: ActivityItem) => void;
}

export const ActivityEventCard: React.FC<ActivityEventCardProps> = ({
  item,
  openEvent,
  openContactModal,
  openRulesModal,
}) => {
  const subtitle = formatEventSubtitle(item);
  const mapTarget = mapUrlForItem(item);
  const showProgress = item.role === "participant" && isLiveOrFinished(item.eventStatus);
  const percent =
    item.progressPercent != null && Number.isFinite(item.progressPercent)
      ? Math.max(0, Math.min(100, Math.round(item.progressPercent)))
      : item.targetSteps && item.targetSteps > 0 && item.coveredSteps != null
        ? Math.max(0, Math.min(100, Math.round((item.coveredSteps / item.targetSteps) * 100)))
        : null;
  const progressLabel =
    item.progressLabel?.trim() ||
    (item.coveredSteps != null && item.targetSteps
      ? `${item.coveredSteps.toLocaleString("en-US")} / ${item.targetSteps.toLocaleString("en-US")} steps`
      : null);

  const avatarSource = getProfileImageSource(
    item.organizerLogoUrl,
    item.organizerUid || item.creatorUid || item.userId || item.id,
  );

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventCardBody}>
        <View style={styles.eventLeftCol}>
          <PressableScale
            onPress={() => openEvent(item.eventKey, item.role, item.eventStatus)}
            scale={0.98}
          >
            <CustomText style={styles.eventCardTitle} numberOfLines={1}>
              {item.title}
            </CustomText>
            {subtitle ? <CustomText style={styles.eventCardSubtitle}>{subtitle}</CustomText> : null}

            <View style={styles.eventOrganizerRow}>
              <View style={styles.organizerAvatarCircleSmall}>
                <Image
                  source={avatarSource}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              </View>
              <CustomText style={styles.eventOrganizerText} numberOfLines={1}>
                Organized By{" "}
                <CustomText style={[fontTextStyles.sixteenBoldBlack, { color: "#FFFFFF" }]}>
                  {item.organizerName || "Organizer"}
                </CustomText>
              </CustomText>
            </View>
          </PressableScale>

          <View style={styles.eventButtonsGroup}>
            <PressableScale
              style={styles.eventActionButton}
              onPress={() => void openContactModal(item)}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
              <CustomText style={styles.eventActionButtonText}>Contact Organizer</CustomText>
            </PressableScale>

            {mapTarget ? (
              <PressableScale
                style={styles.eventActionButton}
                onPress={() => {
                  Linking.openURL(mapTarget).catch(() => {
                    showToastMessage("Could not open map");
                  });
                }}
              >
                <Ionicons name="location" size={15} color="#EA4335" />
                <CustomText style={styles.eventActionButtonText}>Map Link</CustomText>
              </PressableScale>
            ) : null}

            <PressableScale style={styles.eventRulesButton} onPress={() => openRulesModal(item)}>
              <CustomText style={styles.eventRulesButtonText}>Rules</CustomText>
              <Feather name="info" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </PressableScale>
          </View>
        </View>

        <PressableScale
          style={styles.eventRightCol}
          onPress={() => {
            captureEvent("ticket_qr_expanded", {
              event_key: item.eventKey || undefined,
            });
            openEvent(item.eventKey, item.role, item.eventStatus);
          }}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color="rgba(255,255,255,0.7)"
            style={styles.cardChevronRight}
          />
          <View style={styles.qrWhiteBox}>
            <QRCode
              value={`STRON|${item.eventKey}|${item.id}`}
              size={94}
              color="#0B0C0E"
              backgroundColor="#FFFFFF"
              quietZone={4}
              ecl="M"
              logo={avatarSource}
              logoSize={26}
              logoMargin={2}
              logoBorderRadius={13}
              logoBackgroundColor="#FFFFFF"
            />
          </View>
        </PressableScale>
      </View>

      {showProgress && (progressLabel || percent != null) ? (
        <View style={styles.eventProgressSection}>
          <View style={styles.progressTextRow}>
            <CustomText style={styles.progressCurrentText} numberOfLines={1}>
              {progressLabel || "Progress"}
            </CustomText>
            {percent != null ? (
              <CustomText style={styles.progressTargetText}>{percent}%</CustomText>
            ) : null}
          </View>
          {percent != null ? (
            <View style={styles.progressBarTrack}>
              <LinearGradient
                colors={["#003dcf", "#4e92ff"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBarFill, { width: `${percent}%` }]}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: "#191919",
    borderWidth: 1,
    borderColor: "#323232",
    borderRadius: 13,
    padding: 14,
    marginBottom: 14,
    minHeight: 168,
  },
  eventCardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  eventLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  eventCardTitle: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  eventCardSubtitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 12,
  },
  eventOrganizerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  organizerAvatarCircleSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#333333",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  eventOrganizerText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.75)",
  },
  eventButtonsGroup: {
    gap: 8,
  },
  eventActionButton: {
    backgroundColor: "#373737",
    borderWidth: 1,
    borderColor: "#474747",
    borderRadius: 8,
    minHeight: 38,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  eventActionButtonText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#FFFFFF",
  },
  eventRulesButton: {
    backgroundColor: "#2a80ff",
    borderRadius: 8,
    minHeight: 32,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  eventRulesButtonText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  eventRightCol: {
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  cardChevronRight: {
    marginBottom: 10,
  },
  qrWhiteBox: {
    width: 120,
    height: 120,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  eventProgressSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  progressTextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressCurrentText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255,255,255,0.9)",
    flex: 1,
    marginRight: 8,
  },
  progressTargetText: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#4e92ff",
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
});

export default ActivityEventCard;

import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import LivePulseDot from "./LivePulseDot";

type Props = {
  title: string;
  subtitle: string;
  progress?: number | null;
  progressLabel?: string | null;
  tag?: string | null;
  format?: string | null;
  coveredSteps?: number | null;
  targetSteps?: number | null;
  currentDistanceKm?: number | null;
  targetDistanceKm?: number | null;
  totalKingSeconds?: number | null;
  totalWins?: number | null;
  isOrganizer?: boolean;
  registrationCount?: number;
  onPress: () => void;
};

const formatKingClock = (seconds?: number | null) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
};

const getProgressDetails = (props: Props) => {
  if (props.isOrganizer) {
    const count = props.registrationCount ?? 0;
    return {
      line: `${count} ${count === 1 ? "Registration" : "Registrations"} • Tap to manage`,
      percent: 100,
    };
  }

  const fmt = (props.format || "").toLowerCase();

  // 1. MARATHON -> KM
  if (fmt === "marathon") {
    const curKm =
      props.currentDistanceKm != null
        ? props.currentDistanceKm
        : props.coveredSteps != null
          ? Number((props.coveredSteps / 1300).toFixed(1))
          : 0;
    const targetKm = props.targetDistanceKm != null ? props.targetDistanceKm : null;

    let percent = props.progress != null ? props.progress : 0;
    if (targetKm && targetKm > 0) {
      percent = Math.min(100, Math.max(0, (curKm / targetKm) * 100));
      return {
        line: `${curKm} / ${targetKm} km`,
        percent,
      };
    }
    return {
      line: `${curKm} km`,
      percent,
    };
  }

  // 2. KING OF THE HILL -> KING TIME & WINS
  if (fmt === "king_of_the_hill") {
    const kingTimeStr = formatKingClock(props.totalKingSeconds);
    const wins = props.totalWins != null ? props.totalWins : 0;
    const percent = props.progress != null ? Math.min(100, Math.max(0, props.progress)) : 0;
    return {
      line: `King Time: ${kingTimeStr}${wins > 0 ? ` • Wins: ${wins}` : ""}`,
      percent,
    };
  }

  // 3. FACE OFF -> WINS & STEPS
  if (fmt === "face_off") {
    const wins = props.totalWins != null ? props.totalWins : 0;
    const curSteps = props.coveredSteps != null ? props.coveredSteps : 0;
    const tgtSteps = props.targetSteps != null ? props.targetSteps : null;
    if (tgtSteps && tgtSteps > 0) {
      const percent = Math.min(100, Math.max(0, (curSteps / tgtSteps) * 100));
      return {
        line: `${curSteps.toLocaleString("en-US")} / ${tgtSteps.toLocaleString("en-US")} steps`,
        percent,
      };
    }
    return {
      line: `Wins: ${wins} • ${curSteps.toLocaleString("en-US")} steps`,
      percent: props.progress != null ? Math.min(100, Math.max(0, props.progress)) : 0,
    };
  }

  // 4. VIRTUAL STEP CHALLENGE -> STEPS
  if (fmt === "virtual_step_challenge" || (props.targetSteps != null && props.targetSteps > 0)) {
    const curSteps = props.coveredSteps != null ? props.coveredSteps : 0;
    const tgtSteps = props.targetSteps != null ? props.targetSteps : 0;
    let percent = props.progress != null ? props.progress : 0;
    if (tgtSteps > 0) {
      percent = Math.min(100, Math.max(0, (curSteps / tgtSteps) * 100));
      return {
        line: `${curSteps.toLocaleString("en-US")} / ${tgtSteps.toLocaleString("en-US")} steps`,
        percent,
      };
    }
    return {
      line: `${curSteps.toLocaleString("en-US")} steps`,
      percent,
    };
  }

  // Fallback
  const percent = props.progress != null ? Math.min(100, Math.max(0, props.progress)) : 0;
  return {
    line: props.progressLabel || `${Math.round(percent)}% completed`,
    percent,
  };
};

/** Home active-event card — dynamic metric formatting per format (km, time, steps). */
const HomeLiveEventCard = (props: Props) => {
  const { title, subtitle, tag, format, isOrganizer, onPress } = props;
  const { line, percent } = getProgressDetails(props);

  if (isOrganizer) {
    return (
      <PressableScale style={styles.cardPressable} onPress={onPress}>
        <LinearGradient
          colors={["#0D2040", "#0B1830", "#081020"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.organizerGradient}
        >
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <LivePulseDot color="#2B82F6" size={8} />
              <View style={styles.titleCol}>
                <CustomText style={styles.title} numberOfLines={1}>
                  {title}
                </CustomText>
                <CustomText style={styles.organizerSubtitle} numberOfLines={1}>
                  Organizing Event
                </CustomText>
              </View>
            </View>
            <View style={styles.organizerBadge}>
              <CustomText style={styles.organizerBadgeText}>
                ORGANIZER
              </CustomText>
            </View>
          </View>

          <View style={styles.organizerFooter}>
            <CustomText style={styles.organizerFooterLine} numberOfLines={1}>
              {line}
            </CustomText>
            <CustomText style={styles.manageLink}>Manage →</CustomText>
          </View>
        </LinearGradient>
      </PressableScale>
    );
  }

  const chip = (format || tag || "LIVE")
    .replace(/virtual_step_challenge/g, "STEP CHALLENGE")
    .replace(/_/g, " ")
    .toUpperCase();

  return (
    <PressableScale style={styles.cardPressable} onPress={onPress}>
      <LinearGradient
        colors={["#041538", "#0A1A33", "#0B1018"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.participantGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <LivePulseDot color="#086CFF" size={7} />
            <View style={styles.titleCol}>
              <CustomText style={styles.title} numberOfLines={1}>
                {title}
              </CustomText>
              <CustomText style={styles.participantSubtitle} numberOfLines={1}>
                {subtitle}
              </CustomText>
            </View>
          </View>
          <View style={styles.participantBadge}>
            <CustomText style={styles.participantBadgeText}>
              {chip}
            </CustomText>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressLabelsRow}>
            <CustomText style={styles.progressLine} numberOfLines={1}>
              {line}
            </CustomText>
            <CustomText style={styles.percentText}>
              {Math.round(percent)}%
            </CustomText>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${percent}%`,
                },
              ]}
            />
          </View>
        </View>
      </LinearGradient>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  cardPressable: {
    marginBottom: 10,
    overflow: "hidden",
    borderRadius: 14,
  },
  organizerGradient: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(43, 130, 246, 0.3)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  participantGradient: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  titleCol: {
    marginLeft: 8,
    minWidth: 0,
    flex: 1,
  },
  title: {
    ...fontTextStyles.bodyMedium,
    fontSize: 15,
    color: "#FFFFFF",
  },
  organizerSubtitle: {
    marginTop: 2,
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "#60A5FA",
  },
  participantSubtitle: {
    marginTop: 2,
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
  },
  organizerBadge: {
    borderRadius: 6,
    backgroundColor: "rgba(43, 130, 246, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(43, 130, 246, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  organizerBadgeText: {
    ...fontTextStyles.labelSmall,
    fontSize: 10,
    letterSpacing: 0.5,
    color: "#93C5FD",
    fontWeight: "700",
  },
  participantBadge: {
    borderRadius: 6,
    backgroundColor: "rgba(8, 108, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  participantBadgeText: {
    ...fontTextStyles.labelSmall,
    fontSize: 10,
    letterSpacing: 0.5,
    color: "#4E92FF",
    fontWeight: "600",
  },
  organizerFooter: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  organizerFooterLine: {
    ...fontTextStyles.bodyMedium,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  manageLink: {
    ...fontTextStyles.bodyBold,
    fontSize: 12,
    color: "#2B82F6",
    fontWeight: "700",
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabelsRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressLine: {
    ...fontTextStyles.bodySmall,
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
  },
  percentText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: "#086CFF",
  },
});

export default memo(HomeLiveEventCard);

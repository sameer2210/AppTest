import { Image, StyleSheet, View } from "react-native";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  title: string;
  subtitle: string;
  leftValue?: string | null;
  rightValue?: string | null;
  progress?: number | null;
  tone?: "light" | "blue";
  onPress: () => void;
  organizerName?: string | null;
  organizerAvatar?: any;
};

const HomeEventCard = ({
  title,
  subtitle,
  leftValue,
  rightValue,
  progress,
  tone = "light",
  onPress,
  organizerName,
  organizerAvatar,
}: Props) => {
  const isBlue = tone === "blue";
  const safeProgress = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <PressableScale
      style={[
        styles.card,
        isBlue ? styles.cardBlue : styles.cardLight,
      ]}
      onPress={onPress}
    >
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <CustomText
              style={[
                styles.title,
                isBlue ? styles.titleBlue : styles.titleLight,
              ]}
              numberOfLines={1}
            >
              {title}
            </CustomText>
            <CustomText
              style={[
                styles.subtitle,
                isBlue ? styles.subtitleBlue : styles.subtitleLight,
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </CustomText>
          </View>
          <View style={[styles.badge, isBlue ? styles.badgeBlue : styles.badgeLight]}>
            <CustomText style={[styles.badgeText, isBlue ? styles.badgeTextBlue : styles.badgeTextLight]}>
              Live
            </CustomText>
          </View>
        </View>

        {isBlue ? (
          <View style={styles.organizerRow}>
            {organizerAvatar ? (
              <Image source={organizerAvatar} style={styles.organizerAvatar} />
            ) : null}
            <View>
              <CustomText style={styles.organizedByLabel}>Organized By</CustomText>
              <CustomText style={styles.organizerName}>
                {organizerName || "Alpha Gym"}
              </CustomText>
            </View>
          </View>
        ) : (
          <View>
            {(leftValue || rightValue) && (
              <View style={styles.statsRow}>
                <CustomText style={styles.leftValueText}>
                  {leftValue}
                </CustomText>
                <CustomText style={styles.rightValueText}>
                  {rightValue}
                </CustomText>
              </View>
            )}

            {progress != null && (
              <View style={styles.progressTrack}>
                <View
                  style={[styles.progressBar, { width: `${safeProgress}%` }]}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
  },
  cardBlue: {
    borderColor: "#2F78FF",
    backgroundColor: "#1670FF",
  },
  cardLight: {
    borderColor: "rgba(255, 255, 255, 0.6)",
    backgroundColor: "#FFFFFF",
  },
  cardInner: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
  },
  titleBlue: {
    color: "#FFFFFF",
  },
  titleLight: {
    color: "#18202B",
  },
  subtitle: {
    ...fontTextStyles.bodyText,
    fontSize: 14,
    marginTop: 2,
  },
  subtitleBlue: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  subtitleLight: {
    color: "#8C95A1",
  },
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  badgeBlue: {
    backgroundColor: "#FFFFFF",
  },
  badgeLight: {
    backgroundColor: "#1670FF",
  },
  badgeText: {
    ...fontTextStyles.labelSmall,
    fontSize: 12,
  },
  badgeTextBlue: {
    color: "#1670FF",
  },
  badgeTextLight: {
    color: "#FFFFFF",
  },
  organizerRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  organizedByLabel: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  organizerName: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 2,
    fontWeight: "600",
  },
  statsRow: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  leftValueText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 13,
    color: "#8C95A1",
    paddingBottom: 4,
  },
  rightValueText: {
    ...fontTextStyles.headingSmall,
    fontSize: 22,
    color: "#18202B",
    letterSpacing: -0.5,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 9999,
    backgroundColor: "#E2E8F0",
  },
  progressBar: {
    height: "100%",
    borderRadius: 9999,
    backgroundColor: "#1670FF",
  },
});

export default HomeEventCard;

import { Image, StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";

type Props = {
  name?: string | null;
  avatarUri?: string | null;
  badgeText: string;
  primaryLabel?: string;
  primaryValue?: string | number | null;
  secondaryLabel?: string;
  secondaryValue?: string | number | null;
  emptyText?: string;
};

/** White highlight card — current King, top runner, etc. */
const LiveHighlightPersonCard = ({
  name,
  avatarUri,
  badgeText,
  primaryLabel,
  primaryValue,
  secondaryLabel = "Rank",
  secondaryValue,
  emptyText,
}: Props) => {
  if (!name && emptyText) {
    return (
      <View style={styles.card}>
        <CustomText style={styles.emptyText}>{emptyText}</CustomText>
      </View>
    );
  }

  const avatar = getProfileImageSource(avatarUri, name || "Athlete");

  return (
    <View style={styles.cardWithGap}>
      <View style={styles.avatarBorder}>
        <View style={styles.avatarWrap}>
          <Image source={avatar} style={styles.avatarImg} resizeMode="cover" />
        </View>
      </View>
      <View style={styles.infoCol}>
        <View style={styles.nameRow}>
          <CustomText style={styles.nameText} numberOfLines={1}>
            {name || "Athlete"}
          </CustomText>
          <View style={styles.badgePill}>
            <CustomText style={styles.badgeText}>{badgeText}</CustomText>
          </View>
        </View>
        <View style={styles.statsRow}>
          {primaryLabel != null && primaryValue != null ? (
            <>
              <CustomText style={styles.statLabel}>{primaryLabel} </CustomText>
              <CustomText style={styles.statValue}>{primaryValue}</CustomText>
            </>
          ) : null}
          {secondaryLabel != null && secondaryValue != null ? (
            <>
              <CustomText style={[styles.statLabel, styles.statLabelSecondary]}>{secondaryLabel} </CustomText>
              <CustomText style={styles.statValue}>
                {typeof secondaryValue === "number" ? `#${secondaryValue}` : secondaryValue}
              </CustomText>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 99,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  cardWithGap: {
    minHeight: 99,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  emptyText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(0, 0, 0, 0.55)",
  },
  avatarBorder: {
    width: 86,
    height: 86,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 43,
    borderWidth: 3,
    borderColor: "#1B77FF",
  },
  avatarWrap: {
    width: 78,
    height: 78,
    overflow: "hidden",
    borderRadius: 39,
    backgroundColor: "#C8C8C8",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  nameText: {
    maxWidth: "48%",
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  badgePill: {
    height: 24,
    justifyContent: "center",
    borderRadius: 47,
    backgroundColor: "#D9D9D9",
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
  },
  statsRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#000000",
  },
  statLabelSecondary: {
    marginLeft: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1B77FF",
  },
});

export default LiveHighlightPersonCard;

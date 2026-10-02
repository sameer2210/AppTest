import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { normalizeRemoteImageUri } from "@/utils/resolveRemoteImageUri";
import type { MembershipPlan } from "@/types/gym/plan.types";

interface PlanPreviewHeroCardProps {
  plan?: MembershipPlan | null;
  bannerUrl?: string | null;
  logoUrl?: string | null;
}

export const PlanPreviewHeroCard: React.FC<PlanPreviewHeroCardProps> = ({
  plan,
  bannerUrl,
  logoUrl,
}) => {
  const planName = plan?.name || "";
  const isStopped = plan?.status === "STOPPED";
  const statusLabel = isStopped ? "Stopped" : "Started";
  const perks = Array.isArray(plan?.perks) ? plan.perks : [];
  const heroImageUri = normalizeRemoteImageUri(bannerUrl || logoUrl || null);

  return (
    <LinearGradient
      colors={["#2A80FF", "#186ADB", "#0B4CB5"]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroImageContainer}>
        {heroImageUri ? (
          <Image
            source={{ uri: heroImageUri }}
            style={styles.heroImage}
            resizeMode="cover"
          />
        ) : null}

        <View style={styles.statusBadge}>
          <CustomText style={styles.statusBadgeText}>{statusLabel}</CustomText>
        </View>
      </View>

      {planName ? <CustomText style={styles.heroTitle}>{planName}</CustomText> : null}

      {perks.length > 0 ? (
        <View style={styles.perksContainer}>
          {perks.map((perk, index) => (
            <View key={`${perk}-${index}`} style={styles.perkPill}>
              <CustomText style={styles.perkText}>{perk}</CustomText>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 28,
    padding: 14,
    paddingBottom: 20,
    marginBottom: 16,
    shadowColor: "#086CFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroImageContainer: {
    width: "100%",
    height: 185,
    borderRadius: 22,
    overflow: "hidden",
    position: "relative",
    marginBottom: 14,
    backgroundColor: "#111111",
  },
  heroImage: {
    width: "100%",
    height: 185,
    borderRadius: 22,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadgeText: {
    ...fontTextStyles.twelveBoldBlack,
    color: "#000000",
  },
  heroTitle: {
    ...headingTextStyles.thirtyBoldBlack,
    color: "#FFFFFF",
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  perksContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 4,
  },
  perkPill: {
    backgroundColor: "#2C2C2C",
    borderWidth: 1,
    borderColor: "#3F3F3F",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  perkText: {
    ...fontTextStyles.twelveMediumBlack,
    color: "rgba(255, 255, 255, 0.75)",
  },
});

export default PlanPreviewHeroCard;

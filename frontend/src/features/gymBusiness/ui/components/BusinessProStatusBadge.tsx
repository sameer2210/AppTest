import { View, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

type Props = {
  isPro?: boolean;
  /** When false, hide the badge for free partners instead of showing PARTNER. Default true. */
  showPartnerFallback?: boolean;
};

/**
 * Compact status chip for STRON Business chrome.
 * Shows PRO when subscribed; otherwise PARTNER (unless showPartnerFallback is false).
 */
export const BusinessProStatusBadge = ({
  isPro = false,
  showPartnerFallback = true,
}: Props) => {
  if (!isPro && !showPartnerFallback) {
    return null;
  }

  return (
    <View style={[styles.badge, isPro ? styles.badgePro : styles.badgePartner]}>
      <CustomText style={styles.label}>{isPro ? "PRO" : "PARTNER"}</CustomText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  badgePro: {
    backgroundColor: "#2A80FF",
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  badgePartner: {
    backgroundColor: "#1D77FF",
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  label: {
    ...fontTextStyles.tenBoldBlack,
    color: "#FFFFFF",
    textTransform: "uppercase",
  },
});

export default BusinessProStatusBadge;

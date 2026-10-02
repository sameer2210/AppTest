import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import type { PayoutAccountSummary } from "@/types/gym/businessPlan.types";

interface PayoutAccountCardProps {
  payoutAccount?: PayoutAccountSummary | null;
  onPress?: () => void;
}

export const PayoutAccountCard: React.FC<PayoutAccountCardProps> = ({ payoutAccount, onPress }) => {
  const isConfigured = Boolean(payoutAccount?.isConfigured && payoutAccount?.maskedAccountNumber);
  const isVerified = payoutAccount?.verificationStatus === "VERIFIED";
  const isPending = payoutAccount?.verificationStatus === "PENDING";

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.cardContainer}
    >
      {/* Left: Icon & Text */}
      <View style={styles.leftRow}>
        <View style={styles.iconCircle}>
          <Feather name="credit-card" size={18} color="#2A80FF" />
        </View>

        <View style={styles.infoCol}>
          <View style={styles.titleRow}>
            <CustomText style={styles.titleText}>Payout Account</CustomText>
            {isVerified ? (
              <View style={[styles.badge, styles.badgeVerified]}>
                <View style={[styles.badgeDot, styles.badgeDotVerified]} />
                <CustomText style={[styles.badgeText, styles.badgeTextVerified]}>Verified</CustomText>
              </View>
            ) : isPending ? (
              <View style={[styles.badge, styles.badgePending]}>
                <View style={[styles.badgeDot, styles.badgeDotPending]} />
                <CustomText style={[styles.badgeText, styles.badgeTextPending]}>Pending</CustomText>
              </View>
            ) : (
              <View style={[styles.badge, styles.badgeNotAdded]}>
                <View style={[styles.badgeDot, styles.badgeDotNotAdded]} />
                <CustomText style={[styles.badgeText, styles.badgeTextNotAdded]}>Not Added</CustomText>
              </View>
            )}
          </View>
          <CustomText style={styles.subtitleText} numberOfLines={1}>
            {isConfigured
              ? `${payoutAccount?.bankName || "Bank"} · ${payoutAccount?.maskedAccountNumber} · Razorpay KYC`
              : "Add bank account for direct payouts"}
          </CustomText>
        </View>
      </View>

      {/* Right: Chevron */}
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#1C1C1C",
    borderRadius: 14,
    padding: 16,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(8, 108, 255, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  badgeVerified: {
    backgroundColor: "rgba(97, 220, 96, 0.2)",
    borderColor: "rgba(97, 220, 96, 0.4)",
  },
  badgePending: {
    backgroundColor: "rgba(255, 184, 0, 0.2)",
    borderColor: "rgba(255, 184, 0, 0.4)",
  },
  badgeNotAdded: {
    backgroundColor: "rgba(255, 127, 127, 0.2)",
    borderColor: "rgba(255, 127, 127, 0.4)",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeDotVerified: {
    backgroundColor: "#61DC60",
  },
  badgeDotPending: {
    backgroundColor: "#FFB800",
  },
  badgeDotNotAdded: {
    backgroundColor: "#FF7F7F",
  },
  badgeText: {
    fontFamily: "SpaceGrotesk-SemiBold",
    fontSize: 10,
  },
  badgeTextVerified: {
    color: "#61DC60",
  },
  badgeTextPending: {
    color: "#FFB800",
  },
  badgeTextNotAdded: {
    color: "#FF7F7F",
  },
  subtitleText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 2,
  },
});

export default PayoutAccountCard;

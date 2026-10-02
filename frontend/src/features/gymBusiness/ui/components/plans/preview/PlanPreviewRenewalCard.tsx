import React from "react";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import type { MembershipPlan } from "@/types/gym/plan.types";

interface PlanPreviewRenewalCardProps {
  plan?: MembershipPlan | null;
  isTogglingStatus?: boolean;
  onEdit: () => void;
  onStopOrContinuePress: () => void;
}

export const PlanPreviewRenewalCard: React.FC<PlanPreviewRenewalCardProps> = ({
  plan,
  isTogglingStatus = false,
  onEdit,
  onStopOrContinuePress,
}) => {
  const planPrice = plan?.price !== undefined ? `₹${plan.price.toLocaleString("en-IN")}` : "₹2,999";
  const isStopped = plan?.status === "STOPPED";

  // Dynamic Validity / Days Left
  const getValidityText = (): string => {
    if (!plan) return "30 Days Left";
    const duration = Number(plan.duration) || 1;
    const unit = (plan.durationUnit || "MONTHS").toUpperCase();
    if (unit === "DAYS") {
      return `${duration} ${duration === 1 ? "Day" : "Days"} Left`;
    }
    if (unit === "YEARS" || unit === "YEAR") {
      return `${duration * 365} Days Left`;
    }
    return `${duration * 30} Days Left`;
  };

  const validityText = getValidityText();
  const renewalStatusText = isStopped ? "Renewal Inactive" : "Renewal Active";
  const renewalStatusColor = isStopped ? "#FF5151" : "#9CFF8F";

  return (
    <View style={styles.card}>
      {/* Top Row: Renewal Price + Validity */}
      <View style={styles.renewalTopRow}>
        {/* Left Column */}
        <View>
          <CustomText style={styles.renewalHeading}>Renewal</CustomText>
          <CustomText style={styles.renewalPrice}>{planPrice}</CustomText>
          <CustomText style={[styles.renewalActiveText, { color: renewalStatusColor }]}>
            {renewalStatusText}
          </CustomText>
        </View>

        {/* Right Column */}
        <View style={styles.validityCol}>
          <CustomText style={styles.validityLabel}>Validity</CustomText>
          <CustomText style={styles.validityValue}>{validityText}</CustomText>
        </View>
      </View>

      {/* Bottom Row: [Edit] [Stop Plan / Continue Plan] */}
      <View style={styles.actionButtonsRow}>
        <TouchableOpacity activeOpacity={0.7} onPress={onEdit} style={styles.editButton}>
          <CustomText style={styles.editButtonText}>Edit</CustomText>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStopOrContinuePress}
          disabled={isTogglingStatus}
          style={isStopped ? styles.continueButton : styles.stopButton}
        >
          {isTogglingStatus ? (
            <ActivityIndicator size="small" color={isStopped ? "#63FF61" : "#FF5151"} />
          ) : (
            <CustomText style={isStopped ? styles.continueButtonText : styles.stopButtonText}>
              {isStopped ? "Continue Plan" : "Stop Plan"}
            </CustomText>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#191919",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  renewalTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  renewalHeading: {
    ...headingTextStyles.twentyBoldBlack,
    color: "#FFFFFF",
  },
  renewalPrice: {
    ...fontTextStyles.thirteenRegularBlack,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  renewalActiveText: {
    ...fontTextStyles.fourteenMediumBlack,
    marginTop: 4,
  },
  validityCol: {
    alignItems: "flex-end",
  },
  validityLabel: {
    ...fontTextStyles.fifteenRegularBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "right",
  },
  validityValue: {
    ...headingTextStyles.twentyBoldBlack,
    color: "#FFFFFF",
    textAlign: "right",
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#616161",
    borderWidth: 1,
    borderColor: "#6A6A6A",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  stopButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(255, 81, 81, 0.13)",
    borderWidth: 1,
    borderColor: "#FF5151",
    alignItems: "center",
    justifyContent: "center",
  },
  stopButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#FF5151",
  },
  continueButton: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: "rgba(99, 255, 97, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(99, 255, 97, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: "#63FF61",
  },
});

export default PlanPreviewRenewalCard;

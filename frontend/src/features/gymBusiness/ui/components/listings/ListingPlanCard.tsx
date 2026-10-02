import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { MembershipPlan } from "@/types/gym/plan.types";

interface ListingPlanCardProps {
  plan: MembershipPlan;
  onManagePlanPress?: (plan: MembershipPlan) => void;
  onPlanPreviewPress?: (plan: MembershipPlan) => void;
  onSharePlanPress?: (plan: MembershipPlan) => void;
  onViewPlanMembers?: (plan: MembershipPlan) => void;
}

const formatMemberCount = (count?: number): string => {
  if (!count || count <= 0) return "0";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
};

export const ListingPlanCard: React.FC<ListingPlanCardProps> = ({
  plan,
  onManagePlanPress,
  onPlanPreviewPress,
  onSharePlanPress,
  onViewPlanMembers,
}) => {
  const isStopped = plan.status === "STOPPED";
  const isDraft = plan.status === "DRAFT";
  const statusLabel = isDraft ? "Draft" : isStopped ? "Stopped" : "Live";

  const durationText = `${plan.duration} ${
    plan.durationUnit?.toLowerCase() === "month" || plan.durationUnit?.toLowerCase() === "months"
      ? "Monthly"
      : plan.durationUnit || "Month"
  }`;

  const membersCount = formatMemberCount(plan.activeMembersCount ?? plan.totalSold ?? 0);

  const handleCardPress = () => {
    if (onPlanPreviewPress) {
      onPlanPreviewPress(plan);
    } else {
      onManagePlanPress?.(plan);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handleCardPress}
      style={styles.card}
    >
      {/* Top Row: Title + Status Pill */}
      <View style={styles.headerRow}>
        <CustomText style={styles.title} numberOfLines={1}>
          {plan.name}
        </CustomText>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCardPress}
          style={[
            styles.statusPill,
            isStopped ? styles.statusStopped : styles.statusDefault,
          ]}
        >
          <CustomText
            style={[
              styles.statusText,
              isStopped ? styles.statusTextStopped : styles.statusTextDefault,
            ]}
          >
            {statusLabel}
          </CustomText>
        </TouchableOpacity>
      </View>

      {/* Subtitle / Price & Duration */}
      <View style={styles.subtitleRow}>
        <CustomText style={styles.priceText}>
          ₹{plan.price.toLocaleString("en-IN")}
        </CustomText>
        <View style={styles.dot} />
        <CustomText style={styles.durationText}>{durationText}</CustomText>
      </View>

      {/* Bottom Row: [Edit] [Share] + Member Stats & Chevron */}
      <View style={styles.bottomRow}>
        {/* Left Action Buttons */}
        <View style={styles.leftActions}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onManagePlanPress?.(plan)}
            style={styles.actionButton}
          >
            <CustomText style={styles.actionButtonText}>Edit</CustomText>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onSharePlanPress?.(plan)}
            style={styles.actionButton}
          >
            <CustomText style={styles.actionButtonText}>Share</CustomText>
          </TouchableOpacity>
        </View>

        {/* Right Side: Users count + Chevron */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onViewPlanMembers?.(plan)}
          style={styles.membersButton}
        >
          <Feather name="users" size={16} color="#FFFFFF" />
          <CustomText style={styles.membersCountText}>
            {membersCount}
          </CustomText>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#191919",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    borderRadius: 23,
    paddingHorizontal: 14,
    paddingVertical: 2,
    elevation: 1,
  },
  statusStopped: {
    backgroundColor: "rgba(255, 81, 81, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 81, 81, 0.4)",
  },
  statusDefault: {
    backgroundColor: "#FFFFFF",
  },
  statusText: {
    ...fontTextStyles.labelSmall,
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextStopped: {
    color: "#FF5151",
  },
  statusTextDefault: {
    color: "#000000",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  priceText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
    marginRight: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginRight: 8,
  },
  durationText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.75)",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  leftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionButton: {
    backgroundColor: "#434343",
    borderWidth: 1,
    borderColor: "#565656",
    borderRadius: 7,
    height: 34,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
  },
  membersButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  membersCountText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
    marginRight: 4,
  },
});

export default ListingPlanCard;

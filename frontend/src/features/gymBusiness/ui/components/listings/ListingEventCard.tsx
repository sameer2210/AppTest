import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";

export interface ListingEventItem {
  id: string;
  eventKey?: string;
  title: string;
  dateText?: string;
  format?: string;
  status: "LIVE" | "DRAFT" | "COMPLETED" | "CANCELLED";
  registrationsCount?: number;
  totalEarnings?: number;
  formattedEarnings?: string;
  actionLabel?: "Manage" | "View Stats" | "Edit" | string;
}

interface ListingEventCardProps {
  event: ListingEventItem;
  onPress?: (event: ListingEventItem) => void;
}

const formatMemberCount = (count?: number): string => {
  if (!count || count <= 0) return "0";
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(count);
};

const formatEarningsInLakhs = (amount?: number): string => {
  if (!amount || amount <= 0) return "0";
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1).replace(/\.0$/, "")} L`;
  }
  return amount.toLocaleString("en-IN");
};

export const ListingEventCard: React.FC<ListingEventCardProps> = ({ event, onPress }) => {
  const statusLabel =
    event.status === "COMPLETED"
      ? "Completed"
      : event.status === "DRAFT"
        ? "Draft"
        : event.status === "CANCELLED"
          ? "Cancelled"
          : "Live";

  const actionText =
    event.actionLabel ||
    (event.status === "COMPLETED"
      ? "View Stats"
      : event.status === "CANCELLED"
        ? "Cancelled"
        : "Edit / Manage");

  const regCountText = formatMemberCount(event.registrationsCount);
  const earningsText = event.formattedEarnings || `₹ ${formatEarningsInLakhs(event.totalEarnings)}`;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress?.(event)}
      style={styles.card}
    >
      {/* Top Row: Event Title + Status Pill */}
      <View style={styles.headerRow}>
        <CustomText style={styles.title} numberOfLines={1}>
          {event.title}
        </CustomText>
        <View
          style={[
            styles.statusPill,
            event.status === "CANCELLED" ? styles.statusCancelled : styles.statusDefault,
          ]}
        >
          <CustomText
            style={[
              styles.statusText,
              event.status === "CANCELLED" ? styles.statusTextCancelled : styles.statusTextDefault,
            ]}
          >
            {statusLabel}
          </CustomText>
        </View>
      </View>

      {/* Subtitle: Date • Format */}
      <View style={styles.subtitleRow}>
        <CustomText style={styles.dateText}>
          {event.dateText || "Active Event"}
        </CustomText>
        <View style={styles.dot} />
        <CustomText style={styles.formatText}>{event.format || "Virtual"}</CustomText>
      </View>

      {/* Bottom Metrics Row (Registrations | Total Earnings | Manage >) */}
      <View style={styles.metricsRow}>
        {/* Column 1: Registrations */}
        <View style={styles.colLeft}>
          <View style={styles.metricValueRow}>
            <Feather name="users" size={16} color="#FFFFFF" />
            <CustomText style={styles.regCountText}>{regCountText}</CustomText>
          </View>
          <CustomText style={styles.metricLabel}>Registrations</CustomText>
        </View>

        {/* Column 2: Total Earnings */}
        <View style={styles.colCenter}>
          <CustomText style={styles.earningsText}>{earningsText}</CustomText>
          <CustomText style={styles.metricLabel}>Total Earnings</CustomText>
        </View>

        {/* Column 3: Action Link (Manage > / View Stats >) */}
        <View style={styles.colRight}>
          <View style={styles.actionRow}>
            <CustomText style={styles.actionText}>{actionText}</CustomText>
            <Ionicons name="chevron-forward" size={14} color="#2A80FF" />
          </View>
        </View>
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
  statusCancelled: {
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
  statusTextCancelled: {
    color: "#FF5151",
  },
  statusTextDefault: {
    color: "#000000",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    marginRight: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    marginRight: 8,
  },
  formatText: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingTop: 4,
  },
  colLeft: {
    flex: 1,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  regCountText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 6,
  },
  metricLabel: {
    ...fontTextStyles.bodySmall,
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.75)",
    marginTop: 2,
  },
  colCenter: {
    flex: 1,
    alignItems: "center",
  },
  earningsText: {
    ...fontTextStyles.headingSmall,
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  colRight: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 12,
    color: "#2A80FF",
    marginRight: 4,
  },
});

export default ListingEventCard;

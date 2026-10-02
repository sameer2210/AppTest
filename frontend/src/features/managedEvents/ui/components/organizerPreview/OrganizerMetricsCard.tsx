import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";

const formatRevenue = (paiseOrRupees: number) => {
  const rupees = Number(paiseOrRupees) || 0;
  if (rupees >= 100000) {
    return `${(rupees / 100000).toFixed(1)} L`;
  }
  if (rupees >= 1000) {
    return `${(rupees / 1000).toFixed(1)}k`;
  }
  return `₹${Math.round(rupees)}`;
};

const formatCount = (n: number) => {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(n);
};

interface OrganizerMetricsCardProps {
  participantCount: number;
  grossTicketSales: number;
}

export const OrganizerMetricsCard = React.memo(
  ({ participantCount, grossTicketSales }: OrganizerMetricsCardProps) => {
    return (
      <View style={styles.card}>
        <View style={styles.metricColumn}>
          <View style={styles.valueRow}>
            <Ionicons name="people-outline" size={24} color="#FFFFFF" />
            <CustomText style={styles.valueText}>
              {formatCount(participantCount)}
            </CustomText>
          </View>
          <CustomText style={styles.label}>Registrations</CustomText>
        </View>

        <View style={styles.divider} />

        <View style={styles.metricColumn}>
          <View style={styles.valueRow}>
            <CustomText style={styles.currencySymbol}>₹</CustomText>
            <CustomText style={styles.valueText}>
              {formatRevenue(grossTicketSales).replace("₹", "")}
            </CustomText>
          </View>
          <CustomText style={styles.label}>Total Revenue</CustomText>
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#0081FA",
    paddingHorizontal: 16,
  },
  metricColumn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  valueText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  label: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  divider: {
    height: 40,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
});

export default OrganizerMetricsCard;

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import type { ListingCustomerMetrics } from "@/types/gym/businessPlan.types";

interface ListingCustomersCardProps {
  metrics: ListingCustomerMetrics;
  isPro?: boolean;
  onTilePress?: (filterType: string) => void;
  onHeaderPress?: () => void;
  onProPress?: () => void;
  onAddListingPress?: () => void;
}

export const ListingCustomersCard: React.FC<ListingCustomersCardProps> = ({
  metrics,
  onTilePress,
  onHeaderPress,
  onAddListingPress,
}) => {
  const totalCount = metrics.totalListings ?? metrics.totalCustomers ?? 0;
  const isEmpty = totalCount === 0;

  // Empty state when user has no active listings
  if (isEmpty) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onAddListingPress || onHeaderPress}
        style={styles.emptyContainer}
      >
        <View style={styles.emptyTextCol}>
          <CustomText style={styles.emptyTitle}>Listing Customers</CustomText>
          <CustomText style={styles.emptySubtitle}>
            You don’t have any active listings.{"\n"}Create games, challenges, events or more
          </CustomText>
        </View>

        {/* Big White Circular + Button */}
        <View style={styles.plusButton}>
          <Ionicons name="add" size={30} color="#000000" />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.cardContainer}>
      {/* Header */}
      <View style={styles.headerRow}>
        <CustomText style={styles.headerTitle}>Listing Customers</CustomText>
      </View>

      {/* 4 Metric Tiles with Equal Horizontal Spacing */}
      <View style={styles.metricsGrid}>
        {/* 1. Active Customers */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("active_customers")}
          style={styles.metricTileDark}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.activeCustomers}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              Active{"\n"}Customers
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 2. Active Listing */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("active_listing")}
          style={styles.metricTileDark}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.activeListing}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              Active{"\n"}Listing
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 3. Conversion Rate (Vibrant Blue) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("conversion_rate")}
          style={styles.metricTileBlue}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.8)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.conversionRate}
            <CustomText style={styles.percentSymbol}>%</CustomText>
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              Conversion{"\n"}Rate
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 4. Repeat User Rate (Vibrant Blue) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("repeat_rate")}
          style={styles.metricTileBlue}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.8)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.repeatUserRate}
            <CustomText style={styles.percentSymbol}>%</CustomText>
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              Repeat User{"\n"}Rate
            </CustomText>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    backgroundColor: "#191919",
    borderRadius: 12,
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
    minHeight: 130,
  },
  emptyTextCol: {
    flex: 1,
    paddingRight: 12,
  },
  emptyTitle: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    lineHeight: 20,
  },
  plusButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  cardContainer: {
    backgroundColor: "#191919",
    borderRadius: 14,
    padding: 8,
    paddingTop: 14,
    paddingBottom: 12,
    width: "100%",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 6,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 20,
    color: "#FFFFFF",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  activeText: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 12,
    color: "#FFFFFF",
    marginRight: 4,
  },
  metricsGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricTileDark: {
    flex: 1,
    height: 111,
    backgroundColor: "#313131",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  metricTileBlue: {
    flex: 1,
    height: 111,
    backgroundColor: "#096BFC",
    borderRadius: 4,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileHeader: {
    alignItems: "flex-end",
  },
  tileValue: {
    fontFamily: "SpaceGrotesk-Bold",
    fontWeight: "bold",
    fontSize: 25,
    color: "#FFFFFF",
    lineHeight: 28,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  percentSymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tileLabelWrapper: {
    marginTop: "auto",
    height: 28,
    justifyContent: "center",
  },
  tileLabel: {
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "500",
    lineHeight: 13,
  },
});

export default ListingCustomersCard;

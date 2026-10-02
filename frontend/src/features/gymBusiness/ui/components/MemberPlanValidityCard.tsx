import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import type { MemberValidityMetrics } from "@/types/gym/businessPlan.types";

interface MemberPlanValidityCardProps {
  metrics: MemberValidityMetrics;
  onTilePress?: (filterType: string) => void;
  onHeaderPress?: () => void;
  onAddPlanPress?: () => void;
}

export const MemberPlanValidityCard: React.FC<MemberPlanValidityCardProps> = ({
  metrics,
  onTilePress,
  onHeaderPress,
  onAddPlanPress,
}) => {
  const hasPlans = Boolean(metrics.hasPlans) || (metrics.activePlansCount ?? 0) > 0;
  const isEmpty = !hasPlans;

  // Figma Node 1629:2154 - Empty state only when gym has no plans created
  if (isEmpty) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onAddPlanPress || onHeaderPress}
        style={styles.emptyContainer}
      >
        <View style={styles.emptyTextCol}>
          <CustomText style={styles.emptyTitle}>Member Plan Validity</CustomText>
          <CustomText style={styles.emptySubtitle}>
            You don’t have any active plans.{"\n"}Create 1, 3, 6 or 12 month membership plans
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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onHeaderPress}
        style={styles.headerRow}
      >
        <CustomText style={styles.headerTitle}>Member Plan Validity</CustomText>
        <View style={styles.headerRight}>
          <CustomText style={styles.membersCount}>
            {metrics.totalMembers} Members
          </CustomText>
          <Ionicons name="chevron-forward" size={13} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* 4 Metric Tiles with Equal Horizontal Spacing */}
      <View style={styles.metricsGrid}>
        {/* 1. New Leads */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("new_leads")}
          style={styles.metricTile}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="person-add" size={15} color="#4E92FF" />
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.newLeads}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              New Leads{"\n"}(New to Old)
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 2. Expired */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("expired")}
          style={styles.metricTile}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="close-circle" size={15} color="#FF5252" />
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.expired}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              Expired{"\n"}(New to Old)
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 3. About to Expire */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("about_to_expire")}
          style={styles.metricTile}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="warning" size={15} color="#FFB800" />
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.aboutToExpire}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              About to{"\n"}Expire
            </CustomText>
          </View>
        </TouchableOpacity>

        {/* 4. More than a week left */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onTilePress?.("more_than_week")}
          style={styles.metricTile}
        >
          <View style={styles.tileHeader}>
            <Ionicons name="shield-checkmark" size={15} color="#61DC60" />
            <Ionicons name="chevron-forward" size={11} color="rgba(255,255,255,0.35)" />
          </View>
          <CustomText
            style={styles.tileValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {metrics.moreThanWeekLeft}
          </CustomText>
          <View style={styles.tileLabelWrapper}>
            <CustomText style={styles.tileLabel} numberOfLines={2}>
              More than a{"\n"}week left
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
  membersCount: {
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
  metricTile: {
    flex: 1,
    height: 111,
    backgroundColor: "#313131",
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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

export default MemberPlanValidityCard;

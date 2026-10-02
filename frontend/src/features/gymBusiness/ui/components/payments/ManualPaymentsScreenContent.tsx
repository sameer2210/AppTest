import React, { useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { screenContentContainerWideStyle, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";

import type { MemberPaymentSummary } from "@/types/gym/payment.types";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

export type PaymentFilterTab = "ALL" | "DUE" | "MONTHLY" | "QUARTERLY";

interface ManualPaymentsScreenContentProps {
  members: MemberPaymentSummary[];
  totalMembersCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onMemberPress: (member: MemberPaymentSummary) => void;
  onRecordPayment: () => void;
  onBack: () => void;
}

export const ManualPaymentsScreenContent: React.FC<ManualPaymentsScreenContentProps> = ({
  members,
  totalMembersCount,
  isLoading,
  isRefreshing,
  onRefresh,
  onMemberPress,
  onRecordPayment,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PaymentFilterTab>("ALL");

  const filterTabs: { key: PaymentFilterTab; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "DUE", label: "Due" },
    { key: "MONTHLY", label: "Monthly" },
    { key: "QUARTERLY", label: "Quarterly" },
  ];

  const filteredMembers = members.filter((member) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = member.memberName.toLowerCase().includes(q);
      const matchPhone = member.phone ? member.phone.includes(q) : false;
      if (!matchName && !matchPhone) return false;
    }

    // Filter tab
    if (activeTab === "ALL") return true;
    if (activeTab === "DUE") return member.totalDue > 0;
    if (activeTab === "MONTHLY") return member.billingCycleText.toLowerCase().includes("month");
    if (activeTab === "QUARTERLY")
      return (
        member.billingCycleText.toLowerCase().includes("quat") ||
        member.billingCycleText.toLowerCase().includes("quart")
      );
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: topInset + 8 }]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <CustomText style={styles.headerTitle}>{totalMembersCount || members.length} Members</CustomText>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search in your Members"
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSearchQuery("")}
              style={{ padding: 4 }}
            >
              <Ionicons name="close-circle" size={18} color="rgba(255, 255, 255, 0.6)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Filter Tabs: All, Due, Monthly, Quarterly */}
      <View style={styles.filterTabsRow}>
        {filterTabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.filterTabButton,
                isSelected ? styles.filterTabActive : styles.filterTabInactive,
              ]}
            >
              <CustomText
                style={[
                  styles.filterTabText,
                  isSelected ? styles.filterTextActive : styles.filterTextInactive,
                ]}
              >
                {tab.label}
              </CustomText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#086CFF"
            colors={["#086CFF"]}
          />
        }
      >
        {isLoading && !isRefreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#086CFF" />
          </View>
        ) : filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CustomText style={styles.emptyText}>No member payment records found.</CustomText>
          </View>
        ) : (
          filteredMembers.map((member) => {
            const isFullyPaid = member.totalDue === 0;
            const progressRatio =
              member.totalPrice > 0 ? Math.min(1, member.totalPaid / member.totalPrice) : 1;

            return (
              <TouchableOpacity
                key={member.memberId}
                activeOpacity={0.7}
                onPress={() => onMemberPress(member)}
                style={styles.memberCard}
              >
                {/* Top Row: Avatar + Info + Time Left Tag */}
                <View style={styles.cardTopRow}>
                  <View style={styles.memberInfoLeft}>
                    {/* Avatar */}
                    <View style={styles.avatarCircle}>
                      <Image
                        source={getProfileImageSource(
                          member.profileImage,
                          member.memberId || member.memberName,
                        )}
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    </View>

                    {/* Member Name + Plan */}
                    <View style={{ flex: 1 }}>
                      <CustomText style={styles.memberNameText} numberOfLines={1}>
                        {member.memberName}
                      </CustomText>
                      <CustomText style={styles.memberPlanText} numberOfLines={1}>
                        {member.billingCycleText}
                      </CustomText>
                    </View>
                  </View>

                  {/* Expiry Tag */}
                  <CustomText style={styles.daysLeftText}>{member.daysLeftText}</CustomText>
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressRatio * 100}%` }]} />
                </View>

                {/* Bottom Row: Paid vs Total */}
                <View style={styles.cardBottomRow}>
                  <CustomText style={styles.paidRatioText}>
                    ₹{member.totalPaid.toLocaleString("en-IN")}/₹
                    {member.totalPrice.toLocaleString("en-IN")}
                  </CustomText>
                  <CustomText
                    style={[
                      styles.dueStatusText,
                      isFullyPaid ? styles.duePaidText : styles.dueRemainingText,
                    ]}
                  >
                    {isFullyPaid ? "Fully Paid" : `₹${member.totalDue.toLocaleString("en-IN")} Due`}
                  </CustomText>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <View
        style={[
          styles.bottomBarContainer,
          { bottom: Math.max(insets.bottom, 16) },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRecordPayment}
          style={styles.recordPaymentButton}
          accessibilityRole="button"
          accessibilityLabel="Record payment"
        >
          <Ionicons name="add" size={22} color="#FFFFFF" style={styles.plusIcon} />
          <CustomText style={styles.recordPaymentText}>Record payment</CustomText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  headerRow: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...fontTextStyles.size30BoldBlack,
    color: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    marginBottom: 16,
  },
  searchBar: {
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    marginLeft: 12,
    color: "#FFFFFF",
  },
  filterTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    marginBottom: 20,
    gap: 10,
  },
  filterTabButton: {
    height: 36,
    paddingHorizontal: 18,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabActive: {
    backgroundColor: "#FFFFFF",
  },
  filterTabInactive: {
    backgroundColor: "#303030",
    borderWidth: 1,
    borderColor: "#404040",
  },
  filterTabText: {
    ...fontTextStyles.twelveNormalBlack,
  },
  filterTextActive: {
    color: "#000000",
  },
  filterTextInactive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollContent: {
    ...screenContentContainerWideStyle,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.4)",
  },
  memberCard: {
    backgroundColor: "#191919",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  memberInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2A2A2A",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  memberNameText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
  memberPlanText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  daysLeftText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#2A80FF",
    borderRadius: 3,
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paidRatioText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
  },
  dueStatusText: { ...fontTextStyles.sixteenSemiBoldBlack },
  duePaidText: {
    color: "#63FF61",
  },
  dueRemainingText: {
    color: "#FF5151",
  },
  bottomBarContainer: {
    position: "absolute",
    left: SCREEN_HORIZONTAL_PADDING_WIDE,
    right: SCREEN_HORIZONTAL_PADDING_WIDE,
  },
  recordPaymentButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#086CFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  plusIcon: {
    marginRight: 6,
  },
  recordPaymentText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: "#FFFFFF",
  },
});

export default ManualPaymentsScreenContent;

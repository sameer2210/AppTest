import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { images } from "@/utils/images";
import type { MembershipPlan } from "@/types/gym/plan.types";
import { StronProCard } from "../pro/StronProCard";
import { BusinessProStatusBadge } from "../BusinessProStatusBadge";
import { sharePlan } from "@/utils/sharePlan";
import { ListingEventCard, type ListingEventItem } from "./ListingEventCard";
import { ListingPlanCard } from "./ListingPlanCard";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

export type ListingScreenMode = "events" | "plans";
export type ListingFilterTab = "ALL" | "LIVE" | "DRAFT" | "COMPLETED" | "CANCELLED" | "STOPPED";

export interface ListingsScreenContentProps {
  mode?: ListingScreenMode;
  title?: string;
  searchPlaceholder?: string;
  // Events mode
  events?: ListingEventItem[];
  onManageEventPress?: (event: ListingEventItem) => void;
  // Plans mode
  plans?: MembershipPlan[];
  isPro?: boolean;
  renewalDateText?: string | null;
  onManagePlanPress?: (plan: MembershipPlan) => void;
  onPlanPreviewPress?: (plan: MembershipPlan) => void;
  onUpgradeToPro?: () => void;
  onViewPlanMembers?: (plan: MembershipPlan) => void;
  // Common
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh: () => void;
  onCreateNewPress: () => void;
  onBack: () => void;
}

export const ListingsScreenContent: React.FC<ListingsScreenContentProps> = ({
  mode = "events",
  title,
  searchPlaceholder,
  events = [],
  onManageEventPress,
  plans = [],
  isPro = false,
  renewalDateText,
  onManagePlanPress,
  onPlanPreviewPress,
  onUpgradeToPro,
  onViewPlanMembers,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onCreateNewPress,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<ListingFilterTab>("ALL");
  const isEventsMode = mode === "events";
  const headerTitle = title || (isEventsMode ? "Listings" : "Plans");
  const placeholderText =
    searchPlaceholder || (isEventsMode ? "Search in your Events" : "Search my plans");

  const filterTabs: { key: ListingFilterTab; label: string }[] = isEventsMode
    ? [
        { key: "ALL", label: "All" },
        { key: "LIVE", label: "Active" },
        { key: "DRAFT", label: "Draft" },
        { key: "COMPLETED", label: "Completed" },
        { key: "CANCELLED", label: "Cancelled" },
      ]
    : [
        { key: "ALL", label: "All" },
        { key: "LIVE", label: "Active" },
        { key: "DRAFT", label: "Draft" },
        { key: "STOPPED", label: "Inactive" },
      ];

  // Filter Events
  const filteredEvents = events.filter((e) => {
    if (activeTab !== "ALL" && e.status !== activeTab) return false;
    if (searchQuery.trim()) {
      return e.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Filter Plans
  const filteredPlans = plans.filter((p) => {
    if (activeTab === "LIVE" && p.status !== "ACTIVE") return false;
    if (activeTab === "DRAFT" && p.status !== "DRAFT") return false;
    if (activeTab === "STOPPED" && p.status !== "STOPPED") return false;
    if (searchQuery.trim()) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const handleSharePlan = async (plan: MembershipPlan) => {
    await sharePlan(plan);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Screen Background Image */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient matching Figma */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Header and Content Wrapper */}
      <View style={styles.contentWrapper}>
        <View style={[styles.header, { paddingTop: topInset + 8 }]}>
          <GlassBackButton onPress={onBack} size={48} iconSize={24} />

          <View style={styles.headerRight}>
            <BusinessProStatusBadge isPro={isPro} showPartnerFallback={false} />
            <CustomText style={styles.headerTitle}>
              {headerTitle}
            </CustomText>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="rgba(255,255,255,0.7)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={placeholderText}
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filterSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {filterTabs.map((tab) => {
              const isSelected = activeTab === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  activeOpacity={0.7}
                  onPress={() => setActiveTab(tab.key)}
                  style={[
                    styles.filterChip,
                    isSelected ? styles.filterChipActive : styles.filterChipInactive,
                  ]}
                >
                  <CustomText
                    style={[
                      styles.filterChipText,
                      isSelected ? styles.filterChipTextActive : styles.filterChipTextInactive,
                    ]}
                  >
                    {tab.label}
                  </CustomText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
          {/* STRON PRO Card (Dynamic Active Pro vs Upgrade states) */}
          <StronProCard isPro={isPro} renewalDateText={renewalDateText} onPress={onUpgradeToPro} />

          {/* Hero Card: "Create New listing" (Events) OR "Add New Plan" (Plans) */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onCreateNewPress}
            style={styles.heroCard}
          >
            <View style={styles.addCircle}>
              <Ionicons name="add" size={28} color="#000000" />
            </View>
            <CustomText style={styles.heroCardText}>
              {isEventsMode ? "Create New listing" : "Add New Plan"}
            </CustomText>
          </TouchableOpacity>

          {/* EVENTS LIST */}
          {isEventsMode ? (
            isLoading && !isRefreshing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#086CFF" />
              </View>
            ) : filteredEvents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <CustomText style={styles.emptyText}>
                  No event listings found. Tap above to create a new listing!
                </CustomText>
              </View>
            ) : (
              filteredEvents.map((event) => (
                <ListingEventCard key={event.id} event={event} onPress={onManageEventPress} />
              ))
            )
          ) : /* PLANS LIST */
          isLoading && !isRefreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#086CFF" />
            </View>
          ) : filteredPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <CustomText style={styles.emptyText}>
                No plans found. Tap above to create a new plan!
              </CustomText>
            </View>
          ) : (
            filteredPlans.map((plan) => (
              <ListingPlanCard
                key={plan._id || plan.id || plan.name}
                plan={plan}
                onManagePlanPress={onManagePlanPress}
                onPlanPreviewPress={onPlanPreviewPress}
                onSharePlanPress={handleSharePlan}
                onViewPlanMembers={onViewPlanMembers}
              />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  contentWrapper: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 28,
    lineHeight: 38,
    paddingBottom: 4,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  searchWrapper: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  searchBar: {
    height: 52,
    borderRadius: 50,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  searchInput: {
    ...fontTextStyles.bodyMedium,
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  clearButton: {
    padding: 4,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    gap: 10,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#FFFFFF",
  },
  filterChipInactive: {
    backgroundColor: "#303030",
    borderWidth: 1,
    borderColor: "#404040",
  },
  filterChipText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 13,
  },
  filterChipTextActive: {
    color: "#000000",
    fontWeight: "600",
  },
  filterChipTextInactive: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollContent: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
  },
  heroCard: {
    backgroundColor: "#212121",
    borderWidth: 1,
    borderColor: "#373737",
    borderRadius: 16,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    elevation: 3,
  },
  addCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    elevation: 2,
  },
  heroCardText: {
    ...fontTextStyles.bodyMedium,
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "500",
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
    ...fontTextStyles.bodySmall,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
  },
});

export default ListingsScreenContent;

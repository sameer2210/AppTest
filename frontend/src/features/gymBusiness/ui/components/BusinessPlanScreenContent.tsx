import React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Platform,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";

import type { BusinessPlanScreenProps } from "@/types/gym/businessPlan.types";
import { EarningsProBannerCard } from "./EarningsProBannerCard";
import { GymProfileOverviewCard } from "./GymProfileOverviewCard";
import { QuickActionHub } from "./QuickActionHub";
import { MemberPlanValidityCard } from "./MemberPlanValidityCard";
import { ListingCustomersCard } from "./ListingCustomersCard";
import { MyCouponsCard } from "./MyCouponsCard";
import { BusinessAnalyticsGrid } from "./BusinessAnalyticsGrid";
import { BusinessFaqCard } from "./BusinessFaqCard";
import { BusinessProStatusBadge } from "./BusinessProStatusBadge";

const GRADIENT_COLORS = [
  "rgba(18, 128, 255, 0.65)",
  "rgba(8, 55, 140, 0.35)",
  "rgba(4, 12, 26, 0.85)",
  "#04060A",
] as const;
const GRADIENT_LOCATIONS = [0, 0.28, 0.62, 1] as const;

export const BusinessPlanScreenContent: React.FC<BusinessPlanScreenProps> = ({
  data,
  renewalDateText,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onEditProfile,
  onShareProfile,
  onProBannerPress,
  onListingsPress,
  onManualPaymentsPress,
  onPlansPress,
  onAddPlanPress,
  onAddListingPress,
  onMemberValidityPress,
  onListingCustomersPress,
  onManageCouponsPress,
  onAnalyticsPress,
  onPayoutPress,
  onFaqPress,
  onRegisterGymPress,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  if (isLoading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#086CFF" />
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const isStandardUser = data.role === "user" || !data.isGymOwner;
  const isPro = Boolean(data.hasPro || data.earnings?.isPro);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Home Background Image with light color on top & dark at bottom */}
      <ScreenImageBackground source={images.HOME_V2.BG} flipY={false} edgeToEdge={true} />

      {/* Full-screen Linear Gradient: Light electric blue on top -> Pure dark black on bottom */}
      <LinearGradient
        colors={GRADIENT_COLORS}
        locations={GRADIENT_LOCATIONS}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topInset + 8 },
        ]}
        scrollEventThrottle={16}
        removeClippedSubviews={Platform.OS === "android"}
        overScrollMode="never"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#086CFF"
              colors={["#086CFF"]}
            />
          ) : undefined
        }
      >
        {/* Screen Header: STRON Business + PRO / Partner Badge & Subtitle */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <BusinessProStatusBadge isPro={isPro} />
            <CustomText style={styles.headerTitle}>
              STRON Business
            </CustomText>
          </View>
          <CustomText style={styles.headerSubtitle}>
            {isPro ? "All PRO features unlocked" : "Grow your fitness business & revenue"}
          </CustomText>
        </View>

        {/* 1. Monthly Earnings & STRON PRO Banner Card */}
        <EarningsProBannerCard
          earnings={data.earnings}
          renewalDateText={renewalDateText}
          onPress={onProBannerPress}
        />

        {/* 2. Gym Profile & Operating Hours Card (Figma Node 1629:2110) */}
        <GymProfileOverviewCard
          gymProfile={data.gymProfile}
          payoutAccount={data.payoutAccount}
          isPro={isPro}
          onEditPress={isStandardUser ? onRegisterGymPress || onEditProfile : onEditProfile}
          onSharePress={onShareProfile}
          onPayoutAccountPress={isStandardUser ? onRegisterGymPress : onPayoutPress}
        />

        {/* 3. Quick Action Hub (Listings, Manual Payments, Plans) */}
        <QuickActionHub
          onListingsPress={onListingsPress}
          onManualPaymentsPress={onManualPaymentsPress}
          onPlansPress={onPlansPress}
        />

        {/* 4. Member Plan Validity (Figma Node 1629:2154) */}
        <MemberPlanValidityCard
          metrics={data.memberValidity}
          onTilePress={onMemberValidityPress}
          onHeaderPress={() => onMemberValidityPress?.()}
          onAddPlanPress={onAddPlanPress}
        />

        {/* 5. Listing Customers (Figma Node 1629:2163) */}
        <ListingCustomersCard
          metrics={data.listingCustomers}
          isPro={isPro}
          onTilePress={onListingCustomersPress}
          onProPress={onProBannerPress}
          onAddListingPress={onAddListingPress}
        />

        {/* 6. My Coupons — Pro only */}
        {!isStandardUser && isPro && (
          <MyCouponsCard coupons={data.coupons} onManagePress={onManageCouponsPress} />
        )}

        {/* 7. Business Analytics (Figma Node 1629:1979 - Locked Preview when !isPro) */}
        <BusinessAnalyticsGrid
          isPro={isPro}
          onAnalyticsPress={onAnalyticsPress}
          onProPress={onProBannerPress}
        />

        {/* 9. FAQs Card (Figma Node 1629:2089) */}
        <BusinessFaqCard onPress={onFaqPress} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#04060A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#04060A",
    alignItems: "center",
    justifyContent: "center",
  },
  headerContainer: {
    marginBottom: 20,
    alignItems: "flex-end",
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 13.5,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
    textAlign: "right",
  },
  scrollContent: {
    paddingBottom: 110,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
});

export default BusinessPlanScreenContent;

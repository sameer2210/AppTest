import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity, StatusBar, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { screenContentContainerStyle } from "@/utils/screen-layout";
import type { MembershipPlan } from "@/types/gym/plan.types";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import { OrganizerContactSheet } from "@/components/sheets/OrganizerContactSheet";
import {
  PlanPreviewHeroCard,
  PlanPreviewRenewalCard,
  PlanPreviewGymCard,
  type PlanPreviewBusinessData,
} from "./preview";

export interface PlanPreviewScreenContentProps {
  plan?: MembershipPlan | null;
  business?: PlanPreviewBusinessData | null;
  isLoading?: boolean;
  isTogglingStatus?: boolean;
  onBack: () => void;
  onShare: () => void;
  onEdit: () => void;
  onTogglePlanStatus: () => void;
}

export const PlanPreviewScreenContent: React.FC<PlanPreviewScreenContentProps> = ({
  plan,
  business,
  isTogglingStatus = false,
  onBack,
  onShare,
  onEdit,
  onTogglePlanStatus,
}) => {
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [contactSheetVisible, setContactSheetVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const isStopped = plan?.status === "STOPPED";
  const phone = business?.phone;
  const email = business?.email;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={styles.contentWrapper}>
        {/* Top Header Bar */}
        <View style={[styles.headerBar, { paddingTop: topInset + 8 }]}>
          <GlassBackButton onPress={onBack} size={48} iconSize={24} />

          {/* Share Button Pill */}
          <TouchableOpacity activeOpacity={0.7} onPress={onShare} style={styles.shareButton}>
            <CustomText style={styles.shareText}>Share</CustomText>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. HERO PLAN CARD */}
          <PlanPreviewHeroCard
            plan={plan}
            bannerUrl={business?.bannerUrl}
            logoUrl={business?.logo}
          />

          {/* 2. RENEWAL & VALIDITY CARD */}
          <PlanPreviewRenewalCard
            plan={plan}
            isTogglingStatus={isTogglingStatus}
            onEdit={onEdit}
            onStopOrContinuePress={() => setConfirmModalVisible(true)}
          />

          {/* 3. GYM BUSINESS PROFILE CARD & OPENING HOURS */}
          <PlanPreviewGymCard
            business={business}
            onContactPress={() => setContactSheetVisible(true)}
          />
        </ScrollView>
      </View>

      {/* Contact Sheet */}
      <OrganizerContactSheet
        visible={contactSheetVisible}
        onClose={() => setContactSheetVisible(false)}
        seed={{
          phone: phone || "",
          email: email || "",
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModalVisible}
        title={isStopped ? "Continue this plan?" : "You're about to stop this plan. Continue?"}
        message={
          isStopped
            ? "This plan will be activated and moved back to Live packs. New members will be able to purchase it."
            : "This pack will be moved to stopped packs and no new members can purchase it. All past records and active memberships will be preserved."
        }
        titleColor={isStopped ? "#63FF61" : "#FF5454"}
        cancelText="No"
        confirmText={isStopped ? "Yes, Continue" : "Yes, Stop Plan"}
        onCancel={() => setConfirmModalVisible(false)}
        onConfirm={() => {
          setConfirmModalVisible(false);
          onTogglePlanStatus();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },
  contentWrapper: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    height: 34,
    paddingHorizontal: 22,
    borderRadius: 17,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    ...fontTextStyles.fifteenMediumBlack,
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    ...screenContentContainerStyle,
    paddingTop: 8,
  },
});

export default PlanPreviewScreenContent;

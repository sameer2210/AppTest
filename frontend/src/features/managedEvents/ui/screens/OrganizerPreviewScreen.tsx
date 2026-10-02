import React, { useCallback } from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EventDetailSkeleton } from "@/components/skeletons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_HORIZONTAL_PADDING_WIDE,
} from "@/utils/screen-layout";
import { href } from "@/navigation/href";
import PreviewHeroCard from "../components/preview/components/PreviewHeroCard";
import CancelledEventBanner from "../shared/CancelledEventBanner";
import { DeletedEventState } from "../shared/DeletedEventState";
import { StronProMarketingBanner } from "@/components/stronPro/StronProMarketingBanner";
import { useProSubscription } from "@/features/gymBusiness";

import {
  OrganizerStatusCard,
  OrganizerMetricsCard,
  OrganizerRulesCard,
  OrganizerBottomBar,
  OrganizerPreviewModals,
  useOrganizerPreview,
} from "../components/organizerPreview";

export const OrganizerPreviewScreen = React.memo(() => {
  const router = useRouter();
  const params = useLocalSearchParams<{ key?: string; eventKey?: string }>();
  const rawKey = params.key || params.eventKey;
  const eventKey = typeof rawKey === "string" ? rawKey.trim() : "";

  const handleSafeBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.tabs as never);
    }
  }, [router]);

  const {
    isPro,
    isTrialEligible,
    isSubmitting: isSubmittingPro,
    offeringsPrices,
    startFreeTrial,
    subscribe,
  } = useProSubscription();

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const vm = useOrganizerPreview(eventKey);

  if (vm.loading) {
    return (
      <View style={[styles.root, { paddingTop: headerTopPadding + 20 }]}>
        <EventDetailSkeleton />
      </View>
    );
  }

  if (!vm.event) {
    return (
      <View style={[styles.root, { paddingTop: headerTopPadding }]}>
        <DeletedEventState onBack={handleSafeBack} />
      </View>
    );
  }

  const topBarHeight = 50;
  const scrollTopPadding = headerTopPadding + topBarHeight + 8;
  const event = vm.event;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingTop: scrollTopPadding,
          paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 90,
          paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInDown.duration(360)}
          layout={LinearTransition}
          style={styles.heroCardWrapper}
        >
          <PreviewHeroCard
            dateLabel={vm.dateLabel}
            bannerUri={vm.bannerUri}
            format={event.format}
            listingType={vm.isExternalListing ? "external" : event.listingType}
            isLive={vm.isLive && !vm.isDuelFormat}
            statusBadge={vm.heroStatusBadge}
            statusBadgeTone={vm.heroStatusBadgeTone}
            tabs={[]}
            activeTab="Overview"
            onTabChange={() => {}}
            onUploadPress={() => void vm.onUploadBanner()}
            showUpload={!vm.bannerUri}
            hideTabs={true}
            titleOverride={vm.titleOverride}
          />
        </Animated.View>

        {vm.isCancelled ? (
          <View style={styles.cancelledBannerWrap}>
            <CancelledEventBanner />
          </View>
        ) : null}

        <Animated.View
          key="organizer-overview"
          entering={FadeIn.duration(280)}
          exiting={FadeOut.duration(180)}
          style={styles.overviewSection}
        >
          <OrganizerStatusCard
            title={event.title}
            isCancelled={vm.isCancelled}
            isCompleted={vm.isCompleted}
            isSoldOut={vm.isSoldOut}
            isLive={vm.isLive}
            isTicketSaleStopped={vm.isTicketSaleStopped}
            rawStatus={event.status}
            shortDateRange={vm.shortDateRange}
            startingPriceLabel={vm.startingPriceLabel}
            onOpenStartSale={() => vm.setStartSaleModalVisible(true)}
            onOpenStopSale={() => vm.setStopSaleModalVisible(true)}
            onOpenCancel={() => vm.setCancelModalVisible(true)}
            onOpenDelete={() => vm.setDeleteModalVisible(true)}
          />

          {/* STRON PRO Marketing Banner */}
          <StronProMarketingBanner
            isPro={isPro}
            isTrialEligible={isTrialEligible}
            isSubmitting={isSubmittingPro}
            offeringsPrices={offeringsPrices}
            onCtaPress={async () => {
              if (isTrialEligible) await startFreeTrial();
              else await subscribe();
            }}
            containerStyle={{ marginBottom: 14 }}
          />

          <OrganizerRulesCard rules={vm.gameRulesList} />

          {vm.isLive ? (
            <OrganizerMetricsCard
              participantCount={vm.dashboard?.totals?.participantCount ?? event.registrationCount ?? 0}
              grossTicketSales={vm.dashboard?.totals?.grossTicketSales ?? 0}
            />
          ) : null}

          <PressableScale
            onPress={() => {
              router.push({
                pathname: href.app.stronEvent,
                params: { key: event.key, asParticipant: "true" },
              });
            }}
            style={styles.viewParticipantBtn}
          >
            <CustomText style={styles.viewParticipantText}>
              View as Participant
            </CustomText>
            <Ionicons name="chevron-forward" size={22} color="#000000" />
          </PressableScale>
        </Animated.View>
      </ScrollView>

      {/* Floating Top Bar (Back + Share) */}
      <View
        pointerEvents="box-none"
        style={[styles.floatingTopBar, { paddingTop: headerTopPadding }]}
      >
        <View style={styles.topBarRow}>
          <PressableScale
            onPress={handleSafeBack}
            style={styles.backCircleBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 36 : 50}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={styles.btnGlassBorder}
            />
            <Ionicons name="chevron-back" size={22} color="#D9D9D9" />
          </PressableScale>

          <PressableScale
            onPress={vm.share}
            style={styles.sharePillBtn}
            accessibilityRole="button"
            accessibilityLabel="Share"
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 36 : 50}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View
              pointerEvents="none"
              style={styles.btnGlassBorder}
            />
            <CustomText style={styles.shareBtnText}>Share</CustomText>
          </PressableScale>
        </View>
      </View>

      <OrganizerBottomBar
        showEdit={!vm.isCancelled && !vm.isCompleted}
        onEditPress={() => vm.setEditTicketModalVisible(true)}
        onLeaderboardPress={() => {
          if (event.key) {
            router.push({
              pathname: href.app.organizeLeaderboard,
              params: { key: event.key },
            });
          }
        }}
      />

      <OrganizerPreviewModals
        event={event}
        editTicketModalVisible={vm.editTicketModalVisible}
        onCloseEditTicket={() => vm.setEditTicketModalVisible(false)}
        onSaveTicket={(t) => void vm.handleSaveEditTickets(t)}
        stopSaleModalVisible={vm.stopSaleModalVisible}
        onCloseStopSale={() => vm.setStopSaleModalVisible(false)}
        onConfirmStopSale={() => void vm.handleStopSale()}
        startSaleModalVisible={vm.startSaleModalVisible}
        onCloseStartSale={() => vm.setStartSaleModalVisible(false)}
        onConfirmStartSale={() => void vm.handleStartSale()}
        deleteModalVisible={vm.deleteModalVisible}
        onCloseDelete={() => vm.setDeleteModalVisible(false)}
        onConfirmDelete={() => void vm.handleDeleteEvent()}
        cancelModalVisible={vm.cancelModalVisible}
        onCloseCancel={() => vm.setCancelModalVisible(false)}
        onConfirmCancel={() => void vm.handleCancelEvent()}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#090909",
  },
  scroll: {
    flex: 1,
  },
  heroCardWrapper: {
    marginBottom: 16,
  },
  cancelledBannerWrap: {
    marginBottom: 16,
  },
  overviewSection: {
    marginBottom: 12,
  },
  viewParticipantBtn: {
    marginBottom: 12,
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
  },
  viewParticipantText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  floatingTopBar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  backCircleBtn: {
    position: "relative",
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 25,
  },
  btnGlassBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(217, 217, 217, 0.2)",
    backgroundColor: "rgba(217, 217, 217, 0.1)",
  },
  sharePillBtn: {
    position: "relative",
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 20,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF",
  },
});

export default OrganizerPreviewScreen;

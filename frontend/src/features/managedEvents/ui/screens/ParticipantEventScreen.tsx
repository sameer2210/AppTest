import React, { useCallback } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PressableScale, GlassShareButton, GlassBackButton } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { showToastMessage } from "@/utils/app-utils";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { href } from "@/navigation/href";
import { EventHeroBlueCard } from "../components/EventHeroBlueCard";
import CancelledEventBanner from "../shared/CancelledEventBanner";
import { DeletedEventState } from "../shared/DeletedEventState";
import { formatLabelForEvent } from "../shared/formatters";
import { isEventOrganizer } from "@/utils/isEventOrganizer";
import { screenContentContainerWideStyle } from "@/utils/screen-layout";

import {
  ParticipantEventTabs,
  ParticipantEventFooter,
  ParticipantEventModals,
  useParticipantEvent,
} from "../components/participantEvent";

export const ParticipantEventScreen = React.memo(() => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const floatingBarHeight = 58;
  const floatingBarBottomGap = 20;
  const scrollTopPadding = headerTopPadding + floatingBarHeight + floatingBarBottomGap;

  const user = useAppSelector(selectAuthUser);
  const params = useLocalSearchParams<{
    key?: string;
    eventKey?: string;
    asParticipant?: string;
  }>();
  const rawKey = params.key || params.eventKey;
  const eventKey = typeof rawKey === "string" ? rawKey.trim() : "";
  const isExplicitParticipantView = params.asParticipant === "true";

  const handleSafeBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.tabs as never);
    }
  }, [router]);

  const vm = useParticipantEvent(eventKey, isExplicitParticipantView);
  const isOrganizer = isEventOrganizer(user, vm.event?.organizerUid);

  if (vm.loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: headerTopPadding }]}>
        <StatusBar barStyle="light-content" backgroundColor="#090909" translucent />
        <ActivityIndicator color="#086CFF" size="large" />
      </View>
    );
  }

  if (!vm.event) {
    return (
      <View style={[styles.container, { paddingTop: headerTopPadding }]}>
        <StatusBar barStyle="light-content" backgroundColor="#090909" translucent />
        <DeletedEventState onBack={handleSafeBack} />
      </View>
    );
  }

  const event = vm.event;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: scrollTopPadding,
            paddingBottom: Math.max(insets.bottom, 24) + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeInDown.duration(360)} layout={LinearTransition}>
          {isOrganizer ? (
            <View style={styles.previewModeBanner}>
              <View style={styles.previewModeLeft}>
                <Ionicons name="eye-outline" size={18} color="#086CFF" />
                <CustomText style={styles.previewModeText}>
                  Organizer Preview Mode
                </CustomText>
              </View>
              <PressableScale onPress={() => router.back()}>
                <CustomText style={styles.exitPreviewText}>Exit Preview</CustomText>
              </PressableScale>
            </View>
          ) : null}
          <EventHeroBlueCard
            title={event.title || formatLabelForEvent(event.format)}
            subtitle={
              event.description ? event.description.split("\n")[0] : "Win most 1v1 step battles"
            }
            bannerUri={resolveEventBannerUri(event.bannerName)}
            format={event.format}
            listingType={vm.isExternalListing ? "external" : event.listingType}
            statusBadgeText={vm.statusBadge.text}
            statusBadgeTextColor={vm.statusBadge.textColor}
            activeTab={vm.currentTab}
            onTabChange={vm.setCurrentTab}
            showLeaderboardTab={!vm.showExternalLivePanel}
          />
        </Animated.View>

        {vm.isCancelled ? <CancelledEventBanner /> : null}

        <ParticipantEventTabs
          currentTab={vm.currentTab}
          event={event}
          timeLabel={vm.timeLabel}
          dateRange={vm.dateRange}
          user={user}
          participation={vm.participation}
          progress={vm.progress}
          footerBuyTicket={vm.footerBuyTicket}
          isOwned={vm.isOwned}
          isClosed={vm.isClosed}
          isSoldOut={vm.isSoldOut}
          isCancelled={vm.isCancelled}
          isEffectivelyLive={vm.isEffectivelyLive}
          isEffectivelyCompleted={vm.isEffectivelyCompleted}
          hasRaceStarted={vm.hasRaceStarted}
          isMarathon={vm.isMarathon}
          isStepChallenge={vm.isStepChallenge}
          isKotH={vm.isKotH}
          isFaceOff={vm.isFaceOff}
          isDuel={vm.isDuel}
          ticketTargetKm={vm.ticketTargetKm}
          fallbackCovered={vm.fallbackCovered}
          fallbackTarget={vm.fallbackTarget}
          faceOffToday={vm.faceOffToday}
          faceOffTimeLeft={vm.faceOffTimeLeft || undefined}
          matches={vm.matches}
          leaderboardEntries={vm.leaderboardEntries}
          myRank={vm.myRank}
          rating={vm.rating}
          onRatingChange={vm.setRating}
          review={vm.review}
          onReviewChange={vm.setReview}
          reviewSubmitted={vm.reviewSubmitted}
          onSubmitReview={() => {
            if (vm.reviewSubmitted) return;
            if (!(vm.rating > 0)) {
              showToastMessage("Please select a star rating.");
              return;
            }
            vm.setReviewSubmitted(true);
            showToastMessage("Thanks for rating this event!");
          }}
          onContactOrganizer={() => vm.setContactSheetOpen(true)}
          onOpenOrganizerReview={() => vm.setOrganizerReviewOpen(true)}
          onBuyTicket={(t) => void vm.buyTicket(t)}
        />
      </ScrollView>

      {/* Floating Header */}
      <View
        pointerEvents="box-none"
        style={[styles.floatingHeader, { paddingTop: headerTopPadding }]}
      >
        <View
          pointerEvents="box-none"
          style={styles.floatingHeaderInner}
        >
          <GlassBackButton sticky={false} onPress={handleSafeBack} />
          <GlassShareButton onPress={vm.share} />
        </View>
      </View>

      {!isOrganizer ? (
        <ParticipantEventFooter
          event={event}
          footerBuyTicket={vm.footerBuyTicket}
          footerTicketIsFree={vm.footerTicketIsFree}
          showParticipantTerms={vm.showParticipantTerms}
          participantTermsAccepted={vm.participantTermsAccepted}
          onToggleParticipantTerms={() => vm.setParticipantTermsAccepted((v) => !v)}
          buying={vm.buying}
          ticketsLeft={vm.ticketsLeft}
          isExternalListing={vm.isExternalListing}
          showWaitlistFooter={vm.showWaitlistFooter}
          waitlistStatus={vm.waitlistStatus}
          showBuyFooter={vm.showBuyFooter}
          showExternalLivePanel={vm.showExternalLivePanel}
          showDuelBuyFooter={vm.showDuelBuyFooter}
          showDuelBlockedFooter={vm.showDuelBlockedFooter}
          showDuelContinue={vm.showDuelContinue}
          isCancelled={vm.isCancelled}
          onOpenExternalRegister={() => void vm.openExternalRegister()}
          onBuyTicket={(t) => void vm.buyTicket(t)}
          onContinue={() => router.replace(href.app.tabs as never)}
        />
      ) : null}

      <ParticipantEventModals
        event={event}
        user={user}
        phoneVerifyOpen={vm.phoneVerifyOpen}
        onClosePhoneVerify={() => {
          vm.setPhoneVerifyOpen(false);
          vm.setPendingTicketToBuy(null);
        }}
        onVerifiedPhone={() => {
          vm.setPhoneVerifyOpen(false);
          if (vm.pendingTicketToBuy) {
            void vm.buyTicket(vm.pendingTicketToBuy, { phoneJustVerified: true });
            vm.setPendingTicketToBuy(null);
          }
        }}
        contactSheetOpen={vm.contactSheetOpen}
        onCloseContactSheet={() => vm.setContactSheetOpen(false)}
        organizerContactSeed={vm.organizerContactSeed}
        organizerReviewOpen={vm.organizerReviewOpen}
        onCloseOrganizerReview={() => vm.setOrganizerReviewOpen(false)}
        rating={vm.rating}
        onRatingChange={vm.setRating}
        onSubmitRating={() => {
          if (!(vm.rating > 0)) {
            showToastMessage("Please select a star rating.");
            return;
          }
          vm.setReviewSubmitted(true);
          vm.setOrganizerReviewOpen(false);
          showToastMessage("Thank you for rating the organizer!");
        }}
        onViewLeaderboard={() => {
          vm.setOrganizerReviewOpen(false);
          vm.setCurrentTab("Leaderboard");
        }}
        onViewRewards={() => {
          vm.setOrganizerReviewOpen(false);
          vm.setCurrentTab("Overview");
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090909",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#090909",
  },
  scrollView: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: screenContentContainerWideStyle,
  previewModeBanner: {
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(8, 108, 255, 0.4)",
    backgroundColor: "rgba(8, 108, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewModeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewModeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  exitPreviewText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#086CFF",
  },
  floatingHeader: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 50,
    backgroundColor: "transparent",
  },
  floatingHeaderInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
});

export default ParticipantEventScreen;

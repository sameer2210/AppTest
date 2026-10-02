import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomText from "@/components/CustomText";
import { PressableScale } from "@/components/ui";
import EventWaitlistBar, { type EventWaitlistBarStatus } from "../EventWaitlistBar";
import PublishActionBar from "@/components/actionBar/PublishActionBar";
import { formatTicketPriceLabel, isFreeTicket } from "@/utils/stronFreeTicket";
import { showToastMessage } from "@/utils/app-utils";
import type { StronEvent, StronTicketType } from "@/models/stronManaged/event";

interface ParticipantEventFooterProps {
  event: StronEvent;
  footerBuyTicket?: StronTicketType;
  footerTicketIsFree: boolean;
  showParticipantTerms: boolean;
  participantTermsAccepted: boolean;
  onToggleParticipantTerms: () => void;
  buying: boolean;
  ticketsLeft: number | null;
  isExternalListing: boolean;
  showWaitlistFooter: boolean;
  waitlistStatus: EventWaitlistBarStatus | null;
  showBuyFooter: boolean;
  showExternalLivePanel: boolean;
  showDuelBuyFooter: boolean;
  showDuelBlockedFooter: boolean;
  showDuelContinue: boolean;
  isCancelled: boolean;
  onOpenExternalRegister: () => void;
  onBuyTicket: (ticket: StronTicketType) => void;
  onContinue: () => void;
}

export const ParticipantEventFooter = React.memo(
  ({
    event,
    footerBuyTicket,
    footerTicketIsFree,
    showParticipantTerms,
    participantTermsAccepted,
    onToggleParticipantTerms,
    buying,
    ticketsLeft,
    isExternalListing,
    showWaitlistFooter,
    waitlistStatus,
    showBuyFooter,
    showExternalLivePanel,
    showDuelBuyFooter,
    showDuelBlockedFooter,
    showDuelContinue,
    isCancelled,
    onOpenExternalRegister,
    onBuyTicket,
    onContinue,
  }: ParticipantEventFooterProps) => {
    const insets = useSafeAreaInsets();
    const bottomPadding = Math.max(insets.bottom, 20);

    return (
      <>
        {/* Closed / sold out — shared waitlist bar */}
        {showWaitlistFooter && waitlistStatus ? (
          <View style={[styles.waitlistFooterContainer, { paddingBottom: bottomPadding }]}>
            <EventWaitlistBar
              status={waitlistStatus}
              priceLabel={footerBuyTicket ? formatTicketPriceLabel(footerBuyTicket, event) : "₹—"}
              onJoinWaitlist={() => {
                showToastMessage(
                  waitlistStatus === "sold_out"
                    ? "You're on the waitlist. We'll notify you if a spot opens."
                    : "You're on the waitlist. We'll notify you if registration reopens.",
                );
              }}
            />
          </View>
        ) : null}

        {/* Marathon buy / external register footer */}
        {showBuyFooter && footerBuyTicket ? (
          <View style={[styles.footerContainer, { paddingBottom: bottomPadding }]}>
            {showParticipantTerms ? (
              <PressableScale
                onPress={onToggleParticipantTerms}
                style={styles.termsBox}
              >
                <View
                  style={[
                    styles.checkbox,
                    participantTermsAccepted ? styles.checkboxAccepted : styles.checkboxDefault,
                  ]}
                >
                  {participantTermsAccepted ? (
                    <CustomText style={styles.checkMark}>✓</CustomText>
                  ) : null}
                </View>
                <CustomText style={styles.termsText}>
                  I agree to STRON's Participant Terms and confirm the details above are accurate.
                </CustomText>
              </PressableScale>
            ) : null}
            <View style={styles.actionRow}>
              {isExternalListing || footerTicketIsFree ? null : (
                <View style={styles.priceChip}>
                  <CustomText style={styles.priceChipText}>
                    {formatTicketPriceLabel(footerBuyTicket, event)}
                  </CustomText>
                </View>
              )}
              <View style={styles.flex1}>
                <PublishActionBar
                  label={
                    buying
                      ? "Processing…"
                      : isExternalListing
                        ? "Register Now"
                        : isFreeTicket(footerBuyTicket, event)
                          ? "Get Free Ticket"
                          : "Buy Now"
                  }
                  onPress={() => {
                    if (showParticipantTerms && !participantTermsAccepted) {
                      showToastMessage("Please accept the terms to continue.");
                      return;
                    }
                    void (isExternalListing ? onOpenExternalRegister() : onBuyTicket(footerBuyTicket));
                  }}
                  loading={buying}
                  disabled={buying}
                  arrow="right"
                  variant="blue"
                  circleVariant="white"
                />
              </View>
            </View>
          </View>
        ) : null}

        {!showBuyFooter && !showDuelBuyFooter && showExternalLivePanel ? (
          <View style={[styles.singleActionFooter, { paddingBottom: bottomPadding }]}>
            <PublishActionBar
              label="Join Event Link"
              onPress={onOpenExternalRegister}
              arrow="right"
              variant="blue"
              circleVariant="white"
            />
          </View>
        ) : null}

        {/* KotH / Face Off buy footer */}
        {showDuelBuyFooter && footerBuyTicket ? (
          <View style={[styles.footerContainer, { paddingBottom: bottomPadding }]}>
            {showParticipantTerms ? (
              <PressableScale
                onPress={onToggleParticipantTerms}
                style={styles.termsBox}
              >
                <View
                  style={[
                    styles.checkbox,
                    participantTermsAccepted ? styles.checkboxAccepted : styles.checkboxDefault,
                  ]}
                >
                  {participantTermsAccepted ? (
                    <CustomText style={styles.checkMark}>✓</CustomText>
                  ) : null}
                </View>
                <CustomText style={styles.termsText}>
                  I agree to STRON's Participant Terms and confirm the details above are accurate.
                </CustomText>
              </PressableScale>
            ) : null}
            <View style={styles.kothBar}>
              <View>
                <CustomText style={styles.kothPriceText}>
                  {formatTicketPriceLabel(footerBuyTicket, event)}
                </CustomText>
                <CustomText style={styles.kothSubText}>
                  {ticketsLeft} left Only
                </CustomText>
              </View>
              <PressableScale
                onPress={() => {
                  if (showParticipantTerms && !participantTermsAccepted) {
                    showToastMessage("Please accept the terms to continue.");
                    return;
                  }
                  void onBuyTicket(footerBuyTicket);
                }}
                disabled={buying}
                style={styles.kothBuyButton}
                accessibilityRole="button"
              >
                <CustomText style={styles.kothBuyButtonText}>
                  {buying
                    ? "…"
                    : isFreeTicket(footerBuyTicket, event)
                      ? "Get Free Ticket"
                      : "Buy Now"}
                </CustomText>
              </PressableScale>
            </View>
          </View>
        ) : null}

        {showDuelBlockedFooter ? (
          <View style={[styles.singleActionFooter, { paddingBottom: bottomPadding }]}>
            <PublishActionBar
              label={isCancelled ? "Event Cancelled" : "Event Ended"}
              onPress={() => {}}
              disabled={true}
              variant="glass"
            />
          </View>
        ) : null}

        {showDuelContinue ? (
          <View style={[styles.singleActionFooter, { paddingBottom: bottomPadding }]}>
            <PublishActionBar
              label="Continue"
              onPress={onContinue}
              arrow="right"
              variant="solid"
            />
          </View>
        ) : null}
      </>
    );
  },
);

const styles = StyleSheet.create({
  waitlistFooterContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    gap: 10,
  },
  singleActionFooter: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
  },
  termsBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    backgroundColor: "rgba(25, 25, 25, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  checkbox: {
    marginTop: 2,
    height: 20,
    width: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#086CFF",
  },
  checkboxAccepted: {
    backgroundColor: "#086CFF",
  },
  checkboxDefault: {
    backgroundColor: "transparent",
  },
  checkMark: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255, 255, 255, 0.7)",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceChip: {
    height: 50,
    minWidth: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 40,
    backgroundColor: "#191919",
    paddingHorizontal: 14,
  },
  priceChipText: {
    fontSize: 18,
    fontWeight: "500",
    color: "#D9D9D9",
  },
  flex1: {
    flex: 1,
  },
  kothBar: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 54,
    backgroundColor: "rgba(25, 25, 25, 0.92)",
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 24,
    paddingRight: 8,
  },
  kothPriceText: {
    fontSize: 24,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  kothSubText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  kothBuyButton: {
    height: 54,
    minWidth: 116,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 67,
    backgroundColor: "#086CFF",
    paddingHorizontal: 18,
  },
  kothBuyButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
  },
});

export default ParticipantEventFooter;

import { useCallback, useMemo, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import type { EventTab } from "../EventHeroBlueCard";
import {
  formatCompactEventDateRange,
  formatTime,
  formatTimeLeftLabel,
} from "../../shared/formatters";
import { myLeaderboardRank } from "../../shared/duelHelpers";
import { parseEventEndMs, resolveEventStatusBadge } from "../../shared/eventStatusBadge";
import { shareEvent } from "@/utils/shareEvent";
import { isFreeTicket } from "@/utils/stronFreeTicket";
import {
  useEventData,
  useEventLeaderboardPoll,
  useEventCheckout,
  useEventReview,
} from "./hooks";

export const useParticipantEvent = (eventKey?: string, isExplicitParticipantView = false) => {
  const user = useAppSelector(selectAuthUser);

  const [currentTab, setCurrentTab] = useState<EventTab>("Overview");
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  // 1. Core Event & Participation Data
  const {
    loading,
    event,
    setEvent,
    participation,
    setParticipation,
    progress,
    setProgress,
    expandedTicketId,
    load,
  } = useEventData({
    eventKey,
    isExplicitParticipantView,
    onMatchesLoaded: (matches) => leaderboardPoll.setMatches(matches),
    onLeaderboardNeeded: () => void leaderboardPoll.fetchInitialLeaderboard(),
  });

  // 2. Live Leaderboard & KotH Matches Polling
  const leaderboardPoll = useEventLeaderboardPoll({
    eventKey,
    event,
    onEventUpdated: setEvent,
    onParticipationUpdated: setParticipation,
    onProgressUpdated: setProgress,
  });

  // Computed Status Flags
  const isLive =
    event?.status === "live" || event?.status === "started" || event?.status === "in_progress";
  const isCompleted = event?.status === "completed" || event?.status === "settled";
  const isCancelled = event?.status === "cancelled";
  const endMs = parseEventEndMs(event?.endDate);
  const startMs = event?.startDate ? new Date(event.startDate).getTime() : NaN;
  const isEffectivelyCompleted =
    isCompleted || (!isCancelled && endMs != null && Date.now() > endMs);
  const isEffectivelyLive =
    !isCancelled &&
    !isEffectivelyCompleted &&
    (isLive || (Number.isFinite(startMs) && Date.now() >= startMs));
  const hasRaceStarted = isEffectivelyLive || isEffectivelyCompleted;
  const isOwned =
    !!participation && participation.status !== "cancelled" && participation.status !== "expired";
  const isSoldOut = event?.soldOut === true;
  const isEnded = isEffectivelyCompleted || isCancelled;

  let isClosed = false;
  if (event?.registrationEndDate && !isEnded && !isEffectivelyLive) {
    const regEndMs = parseEventEndMs(event.registrationEndDate);
    if (regEndMs !== null && Date.now() > regEndMs) {
      isClosed = true;
    }
  }
  if (!isEnded && !isCancelled && !isEffectivelyLive && event?.capacity === 0) {
    isClosed = true;
  }

  const isDuel = event?.format === "king_of_the_hill" || event?.format === "face_off";
  const isKotH = event?.format === "king_of_the_hill";
  const isExternalListing =
    event?.listingType === "external" ||
    /^External listing \(/i.test(String(event?.description || ""));

  // 3. Checkout & Registration Flow
  const checkout = useEventCheckout({
    event,
    isClosed,
    isSoldOut,
    isCancelled,
    isOwned,
    isExternalListing,
    onTicketPurchased: async (newParticipation) => {
      setParticipation(newParticipation);
      await load();
    },
  });

  // 4. Rating & Reviews
  const reviewForm = useEventReview();

  // Social Sharing
  const share = useCallback(async () => {
    if (!event) return;
    await shareEvent({ title: event.title, eventKey: event.key });
  }, [event]);

  // Derived UI & Ticket Calculations
  const tickets = event?.ticketTypes ?? [];
  const dateRange = formatCompactEventDateRange(
    event?.startDate,
    event?.endDate || event?.startDate,
  );
  const timeLabel = formatTime(event?.startDate);
  const organizerContactSeed = useMemo(
    () => ({
      organizerUid: event?.organizerUid || null,
      eventKey: event?.key || eventKey || null,
    }),
    [event?.organizerUid, event?.key, eventKey],
  );
  const footerBuyTicket = tickets.find((t) => t.id === expandedTicketId) || tickets[0];
  const footerTicketIsFree = footerBuyTicket ? isFreeTicket(footerBuyTicket, event) : false;
  const showParticipantTerms = !isExternalListing && footerBuyTicket != null && footerTicketIsFree;
  const ticketsLeft = footerBuyTicket
    ? event?.capacity != null
      ? Math.max(0, event.capacity - (footerBuyTicket.soldCount ?? 0))
      : null
    : 0;

  const myRank = participation?.resultRank ?? myLeaderboardRank(leaderboardPoll.leaderboard, user?.uid);

  const statusBadge = resolveEventStatusBadge({
    status: event?.status,
    soldOut: isSoldOut,
    registrationClosed: isClosed,
    format: event?.format,
    startDate: event?.startDate,
    endDate: event?.endDate,
    useDuelDayLabel: isDuel,
  });

  const isMarathon = event?.format === "marathon";
  const isStepChallenge = event?.format === "virtual_step_challenge";
  const isFaceOff = event?.format === "face_off";

  const faceOffToday = progress?.todayMatch;
  const faceOffTimeLeft = useMemo(() => {
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    return formatTimeLeftLabel(endOfDay.toISOString()) || formatTimeLeftLabel(event?.endDate);
  }, [event?.endDate]);

  const showExternalLivePanel = Boolean(
    isExternalListing && isEffectivelyLive && !isEnded && !isClosed,
  );
  const waitlistStatus =
    !isOwned && !isCancelled && !isEnded
      ? isSoldOut
        ? ("sold_out" as const)
        : isClosed
          ? ("closed" as const)
          : null
      : null;
  const showWaitlistFooter = waitlistStatus != null;
  const showDuelBuyFooter =
    isDuel && !isOwned && !isSoldOut && !isCancelled && !isEnded && !isClosed && !!footerBuyTicket;
  const showDuelBlockedFooter =
    isDuel && !isOwned && !showWaitlistFooter && (isCancelled || isEnded);
  const showDuelContinue = isDuel && isOwned && isEffectivelyCompleted;
  const showBuyFooter =
    !isDuel && !isOwned && !isSoldOut && !isCancelled && !isEnded && !isClosed && !!footerBuyTicket;
  const leaderboardEntries = !isOwned && (isClosed || isSoldOut) ? [] : leaderboardPoll.leaderboard;

  const ticketTargetKm =
    Number(progress?.distanceKm) ||
    Number(participation?.distanceKm) ||
    Number(footerBuyTicket?.distanceKm) ||
    null;

  const fallbackCovered = Number(progress?.coveredSteps) || 0;
  const fallbackTarget = Number(progress?.targetSteps) || 0;

  return {
    loading,
    buying: checkout.buying,
    event,
    participation,
    progress,
    pendingTicketToBuy: checkout.pendingTicketToBuy,
    setPendingTicketToBuy: checkout.setPendingTicketToBuy,
    phoneVerifyOpen: checkout.phoneVerifyOpen,
    setPhoneVerifyOpen: checkout.setPhoneVerifyOpen,
    leaderboard: leaderboardPoll.leaderboard,
    matches: leaderboardPoll.matches,
    currentTab,
    setCurrentTab,
    rating: reviewForm.rating,
    setRating: reviewForm.setRating,
    review: reviewForm.review,
    setReview: reviewForm.setReview,
    reviewSubmitted: reviewForm.reviewSubmitted,
    setReviewSubmitted: reviewForm.setReviewSubmitted,
    participantTermsAccepted: checkout.participantTermsAccepted,
    setParticipantTermsAccepted: checkout.setParticipantTermsAccepted,
    contactSheetOpen,
    setContactSheetOpen,
    organizerReviewOpen: reviewForm.organizerReviewOpen,
    setOrganizerReviewOpen: reviewForm.setOrganizerReviewOpen,
    isLive,
    isEffectivelyLive,
    isEffectivelyCompleted,
    hasRaceStarted,
    isCompleted,
    isCancelled,
    isSoldOut,
    isClosed,
    isEnded,
    isOwned,
    isDuel,
    isKotH,
    isMarathon,
    isStepChallenge,
    isFaceOff,
    isExternalListing,
    statusBadge,
    dateRange,
    timeLabel,
    footerBuyTicket,
    footerTicketIsFree,
    showParticipantTerms,
    ticketsLeft,
    myRank,
    faceOffToday,
    faceOffTimeLeft,
    showExternalLivePanel,
    waitlistStatus,
    showWaitlistFooter,
    showDuelBuyFooter,
    showDuelBlockedFooter,
    showDuelContinue,
    showBuyFooter,
    leaderboardEntries,
    ticketTargetKm,
    fallbackCovered,
    fallbackTarget,
    organizerContactSeed,
    load,
    share,
    openExternalRegister: checkout.openExternalRegister,
    buyTicket: checkout.buyTicket,
  };
};

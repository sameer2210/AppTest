import React from "react";
import { StyleSheet, View } from "react-native";
import CustomText from "@/components/CustomText";
import type { StronEvent, StronTicketType } from "@/models/stronManaged/event";
import type {
  StronKotHMatch,
  StronLeaderboardEntry,
  StronParticipation,
  StronProgress,
} from "@/models/stronManaged/participation";
import { EventOverviewTab } from "../EventOverviewTab";
import { EventLeaderboardTab } from "../EventLeaderboardTab";
import MarathonLeaderboardTab from "../MarathonLeaderboardTab";
import KotHLeaderboardTab from "../KotHLeaderboardTab";
import StepChallengeLeaderboardTab from "../StepChallengeLeaderboardTab";
import { LiveLeaderboardTable, LiveTrackingCard, mapLeaderboardRows } from "../liveLeaderboard";
import type { EventTab } from "../EventHeroBlueCard";
import type { CompactEventDateRange } from "../../shared/formatters";

interface ParticipantEventTabsProps {
  currentTab: EventTab;
  event: StronEvent;
  timeLabel: string;
  dateRange?: CompactEventDateRange;
  user: any;
  participation: StronParticipation | null;
  progress: StronProgress | null;
  footerBuyTicket?: StronTicketType;
  isOwned: boolean;
  isClosed: boolean;
  isSoldOut: boolean;
  isCancelled: boolean;
  isEffectivelyLive: boolean;
  isEffectivelyCompleted: boolean;
  hasRaceStarted: boolean;
  isMarathon: boolean;
  isStepChallenge: boolean;
  isKotH: boolean;
  isFaceOff: boolean;
  isDuel: boolean;
  ticketTargetKm: number | null;
  fallbackCovered: number;
  fallbackTarget: number;
  faceOffToday?: any;
  faceOffTimeLeft?: string;
  matches: StronKotHMatch[];
  leaderboardEntries: StronLeaderboardEntry[];
  myRank: number | null;
  rating: number;
  onRatingChange: (val: number) => void;
  review: string;
  onReviewChange: (val: string) => void;
  reviewSubmitted: boolean;
  onSubmitReview: () => void;
  onContactOrganizer: () => void;
  onOpenOrganizerReview: () => void;
  onBuyTicket: (ticket: StronTicketType) => void;
}

export const ParticipantEventTabs = React.memo(
  ({
    currentTab,
    event,
    timeLabel,
    dateRange,
    user,
    participation,
    progress,
    footerBuyTicket,
    isOwned,
    isClosed,
    isSoldOut,
    isCancelled,
    isEffectivelyLive,
    isEffectivelyCompleted,
    hasRaceStarted,
    isMarathon,
    isStepChallenge,
    isKotH,
    isFaceOff,
    isDuel,
    ticketTargetKm,
    fallbackCovered,
    fallbackTarget,
    faceOffToday,
    faceOffTimeLeft,
    matches,
    leaderboardEntries,
    myRank,
    rating,
    onRatingChange,
    review,
    onReviewChange,
    reviewSubmitted,
    onSubmitReview,
    onContactOrganizer,
    onOpenOrganizerReview,
    onBuyTicket,
  }: ParticipantEventTabsProps) => {
    if (currentTab === "Overview") {
      return (
        <EventOverviewTab
          event={event}
          timeLabel={timeLabel}
          dateRange={dateRange}
          organizerName={
            event.organizerName ||
            (event.organizerUid === user?.uid
              ? user?.username || (user as { name?: string }).name
              : null) ||
            "STRON Team"
          }
          organizerUid={event.organizerUid}
          organizerAvatar={
            event.organizerAvatar ||
            (event.organizerUid === user?.uid ? user?.profileImageUrl : null)
          }
          onContactOrganizer={onContactOrganizer}
          onOpenOrganizerReview={onOpenOrganizerReview}
          onBuyTicket={onBuyTicket}
          isOwned={isOwned}
          ticket={footerBuyTicket}
          showReview={isEffectivelyCompleted && isOwned && !isCancelled}
          showSpecialOffer={isOwned && !isCancelled && (isEffectivelyLive || isEffectivelyCompleted)}
          rating={rating}
          onRatingChange={onRatingChange}
          reviewComment={review}
          onReviewCommentChange={onReviewChange}
          reviewSubmitted={reviewSubmitted}
          onSubmitReview={onSubmitReview}
        />
      );
    }

    if (!isOwned && (isClosed || isSoldOut)) {
      return (
        <View style={styles.closedContainer}>
          <View style={styles.closedCard}>
            <CustomText style={styles.closedTitle}>
              Overall Leaderboard
            </CustomText>
            <View style={styles.tableHeaderRow}>
              <CustomText style={styles.colRank}>Rank</CustomText>
              <CustomText style={styles.colName}>Name</CustomText>
              <CustomText style={styles.colScore}>Score</CustomText>
            </View>
            <CustomText style={styles.emptyText}>
              {isSoldOut
                ? "No rankings yet. This event is sold out."
                : "No rankings yet. Registration is closed."}
            </CustomText>
          </View>
        </View>
      );
    }

    if (!hasRaceStarted) {
      return (
        <View style={styles.notStartedContainer}>
          <CustomText style={styles.notStartedText}>
            Event is not started yet
          </CustomText>
        </View>
      );
    }

    if (isMarathon) {
      return (
        <MarathonLeaderboardTab
          entries={leaderboardEntries}
          myUid={user?.uid}
          progress={progress}
          myRank={myRank}
          endDate={event.endDate}
          targetDistanceKm={ticketTargetKm}
        />
      );
    }

    if (isStepChallenge) {
      return (
        <StepChallengeLeaderboardTab
          entries={leaderboardEntries}
          myUid={user?.uid}
          progress={progress}
          myRank={myRank}
          endDate={event.endDate}
        />
      );
    }

    if (isKotH) {
      return (
        <KotHLeaderboardTab
          entries={leaderboardEntries}
          progress={progress}
          myUid={user?.uid}
          username={user?.username || "You"}
          avatarUri={user?.profileImageUrl}
          myRank={myRank}
        />
      );
    }

    if (isFaceOff) {
      return (
        <EventLeaderboardTab
          entries={leaderboardEntries}
          myUid={user?.uid}
          userName={user?.username || "You"}
          userAvatar={user?.profileImageUrl}
          userRank={myRank}
          userTotalSteps={
            Number(participation?.leaderboardSteps) ||
            Number(participation?.accumulatedSteps) ||
            0
          }
          userTotalWins={Number(progress?.totalWins) || Number(participation?.totalWins) || 0}
          opponentName={faceOffToday?.opponentUsername || null}
          opponentAvatar={faceOffToday?.opponentProfileImageUrl || null}
          opponentSteps={Number(faceOffToday?.opponentSteps) || 0}
          userMatchSteps={Number(faceOffToday?.mySteps) || 0}
          timeLeftFormatted={faceOffTimeLeft}
          stepDifference={
            faceOffToday?.stepDifference ??
            (Number(faceOffToday?.mySteps) || 0) - (Number(faceOffToday?.opponentSteps) || 0)
          }
          matches={!isOwned && (isClosed || isSoldOut) ? [] : matches}
        />
      );
    }

    if (isDuel) {
      return (
        <EventLeaderboardTab
          entries={leaderboardEntries}
          myUid={user?.uid}
          userName={user?.username || "You"}
          userAvatar={user?.profileImageUrl}
          userRank={myRank}
          userTotalWins={Number(progress?.totalWins) || 0}
          matches={!isOwned && (isClosed || isSoldOut) ? [] : matches}
        />
      );
    }

    return (
      <View style={styles.fallbackContainer}>
        <LiveTrackingCard
          title="Your Progress"
          currentLabel={`${fallbackCovered.toLocaleString("en-IN")} steps`}
          targetLabel={fallbackTarget > 0 ? fallbackTarget.toLocaleString("en-IN") : "—"}
          progressPercent={
            fallbackTarget > 0 ? Math.min(100, (fallbackCovered / fallbackTarget) * 100) : 0
          }
          currentTone="accent"
        />
        <LiveLeaderboardTable
          title="Overall Leaderboard"
          metricHeader="Score"
          myUid={user?.uid}
          rows={mapLeaderboardRows(leaderboardEntries, {
            formatMetric: (e) => String(Math.round(Number(e.score) || 0)),
          })}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  closedContainer: {
    marginTop: 16,
    gap: 14,
  },
  closedCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#141416",
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 18,
  },
  closedTitle: {
    marginBottom: 14,
    fontSize: 22,
    color: "#FFFFFF",
  },
  tableHeaderRow: {
    marginBottom: 4,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 10,
  },
  colRank: {
    width: 44,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  colName: {
    flex: 1,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  colScore: {
    width: 96,
    textAlign: "right",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.55)",
  },
  emptyText: {
    paddingVertical: 32,
    textAlign: "center",
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.45)",
  },
  notStartedContainer: {
    marginTop: 24,
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#191919",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  notStartedText: {
    textAlign: "center",
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.75)",
  },
  fallbackContainer: {
    marginTop: 14,
    gap: 14,
  },
});

export default ParticipantEventTabs;

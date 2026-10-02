import { Image, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import type { StronEvent, StronTicketType } from "@/models/stronManaged/event";
import { resolveEventRewardLabels } from "../shared/eventRewards";
import { buildFormatGameRules } from "../shared/formatGameRules";
import type { CompactEventDateRange } from "../shared/formatters";
import EventReviewCard from "./EventReviewCard";
import SpecialOfferCard from "./SpecialOfferCard";

type Props = {
  event: StronEvent;
  timeLabel?: string;
  /** @deprecated Prefer `dateRange` for compact same/cross-month layouts. */
  dateRangeLabel?: string;
  dateRange?: CompactEventDateRange;
  organizerName?: string;
  organizerAvatar?: string | null;
  organizerUid?: string | null;
  onContactOrganizer?: () => void;
  onOpenOrganizerReview?: () => void;
  onBuyTicket?: (ticket: StronTicketType) => void;
  isOwned?: boolean;
  ticket?: StronTicketType | null;
  /** Show post-event review (completed / settled + participant). */
  showReview?: boolean;
  rating?: number;
  onRatingChange?: (n: number) => void;
  reviewComment?: string;
  onReviewCommentChange?: (v: string) => void;
  onSubmitReview?: () => void;
  reviewSubmitted?: boolean;
  /** Show special offer card for registered participants during / after the event. */
  showSpecialOffer?: boolean;
};

export const EventOverviewTab = ({
  event,
  timeLabel = "—",
  dateRangeLabel = "—",
  dateRange,
  organizerName = "Organizer",
  organizerAvatar,
  organizerUid,
  onContactOrganizer,
  onOpenOrganizerReview,
  showReview = false,
  rating = 0,
  onRatingChange,
  reviewComment = "",
  onReviewCommentChange,
  onSubmitReview,
  reviewSubmitted = false,
  showSpecialOffer = false,
}: Props) => {
  // Same layout for every format — bullets come from format + event dates/targets.
  const bullets = buildFormatGameRules(event);

  // Organizer-selected rewards only (no hardcoded T-Shirt / Bib fallback).
  const rewards = resolveEventRewardLabels(event);

  const avatarSource = getProfileImageSource(
    organizerAvatar || event.organizerAvatar,
    organizerUid || event.organizerUid || organizerName,
  );

  return (
    <View style={styles.container}>
      {showReview && onRatingChange && onReviewCommentChange ? (
        <EventReviewCard
          rating={rating}
          onRatingChange={onRatingChange}
          comment={reviewComment}
          onCommentChange={onReviewCommentChange}
          onSubmit={onSubmitReview}
          submitted={reviewSubmitted}
        />
      ) : null}

      {/* Rewards Card */}
      <View style={styles.rewardsCard}>
        <View style={styles.rewardsHeader}>
          <Ionicons name="star-outline" size={20} color="#FFFFFF" />
          <CustomText style={styles.rewardsTitle}>Rewards</CustomText>
        </View>
        {rewards.length > 0 ? (
          <View style={styles.rewardsList}>
            {rewards.map((label) => (
              <View key={label} style={styles.rewardChip}>
                <CustomText style={styles.rewardChipText}>{label}</CustomText>
              </View>
            ))}
          </View>
        ) : (
          <CustomText style={styles.noRewardsText}>
            No rewards listed for this event.
          </CustomText>
        )}
      </View>

      {showSpecialOffer ? <SpecialOfferCard eventKey={event.key} /> : null}

      {/* Description / How it works */}
      <View style={styles.descriptionCard}>
        <CustomText style={styles.descriptionTitle}>Description</CustomText>
        <View style={styles.bulletsWrap}>
          {bullets.map((bullet, idx) => (
            <View key={`${idx}-${bullet.slice(0, 24)}`} style={styles.bulletRow}>
              <CustomText style={styles.bulletDot}>•</CustomText>
              <CustomText style={styles.bulletText}>{bullet}</CustomText>
            </View>
          ))}
        </View>
      </View>

      {/* Date & Time Grid Cards */}
      <View style={styles.gridRow}>
        <View style={styles.gridCard}>
          <CustomText style={styles.timeLabelText} numberOfLines={1}>
            {timeLabel}
          </CustomText>
          <CustomText style={styles.gridSubtitle}>The event will Start</CustomText>
        </View>

        <View style={[styles.gridCard, styles.justifyCenter]}>
          {dateRange?.variant === "bridge" ? (
            <View style={styles.bridgeWrap}>
              <CustomText style={styles.bridgeLabel} numberOfLines={1}>
                {dateRange.startLabel}
              </CustomText>
              <View style={styles.bridgeArrowRow}>
                <View style={styles.bridgeLineStart} />
                <Ionicons name="arrow-forward" size={12} color="#71BAFF" />
                <View style={styles.bridgeLineEnd} />
              </View>
              <CustomText style={styles.bridgeLabel} numberOfLines={1}>
                {dateRange.endLabel}
              </CustomText>
            </View>
          ) : (
            <CustomText
              style={styles.dateLabelText}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              {dateRange?.variant === "text" ? dateRange.label : dateRangeLabel}
            </CustomText>
          )}
          <CustomText style={styles.gridSubtitle}>Event Dates</CustomText>
        </View>
      </View>

      {/* Organized By Card */}
      <View style={styles.organizerCard}>
        <View style={styles.organizerTopRow}>
          <View style={styles.organizerAvatarWrap}>
            <Image source={avatarSource} style={styles.avatarImg} resizeMode="cover" />
          </View>
          <View style={styles.organizerInfoWrap}>
            <CustomText style={styles.organizedByLabel}>
              Organized By
            </CustomText>
            <CustomText style={styles.organizerNameText}>
              {organizerName}
            </CustomText>
          </View>
        </View>

        {(Boolean(onContactOrganizer) || Boolean(showReview || onOpenOrganizerReview)) && (
          <View style={styles.organizerActionsRow}>
            {onContactOrganizer && (
              <PressableScale
                style={styles.contactBtn}
                onPress={onContactOrganizer}
                accessibilityRole="button"
                accessibilityLabel="Contact Organizer"
              >
                <CustomText style={styles.contactBtnText}>
                  Contact Now
                </CustomText>
              </PressableScale>
            )}

            {(showReview || onOpenOrganizerReview) && (
              <PressableScale
                style={styles.reviewBtn}
                onPress={onOpenOrganizerReview || onContactOrganizer}
                accessibilityRole="button"
                accessibilityLabel="Review Organizer"
              >
                <CustomText style={styles.reviewBtnText}>Review</CustomText>
              </PressableScale>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    gap: 16,
  },
  rewardsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181A",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  rewardsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  rewardsTitle: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  rewardsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rewardChip: {
    borderRadius: 999,
    backgroundColor: "#D9D9D9",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  rewardChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  noRewardsText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.5)",
  },
  descriptionCard: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  descriptionTitle: {
    marginBottom: 12,
    fontSize: 22,
    color: "#000000",
  },
  bulletsWrap: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  bulletDot: {
    marginRight: 8,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(0, 0, 0, 0.8)",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    color: "rgba(0, 0, 0, 0.9)",
  },
  gridRow: {
    flexDirection: "row",
    gap: 12,
  },
  gridCard: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181A",
    padding: 16,
  },
  justifyCenter: {
    justifyContent: "center",
  },
  timeLabelText: {
    fontSize: 26,
    color: "#FFFFFF",
  },
  gridSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  bridgeWrap: {
    alignItems: "flex-start",
  },
  bridgeLabel: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  bridgeArrowRow: {
    marginVertical: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  bridgeLineStart: {
    height: 1,
    width: 12,
    marginRight: 6,
    backgroundColor: "rgba(113, 186, 255, 0.6)",
  },
  bridgeLineEnd: {
    height: 1,
    flex: 1,
    marginLeft: 6,
    backgroundColor: "rgba(113, 186, 255, 0.25)",
  },
  dateLabelText: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  organizerCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "#18181A",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  organizerTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  organizerAvatarWrap: {
    width: 44,
    height: 44,
    marginRight: 12,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  organizerInfoWrap: {
    flex: 1,
    justifyContent: "center",
  },
  organizedByLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.55)",
    marginBottom: 2,
  },
  organizerNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  organizerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  contactBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  reviewBtn: {
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#0070FF",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  reviewBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default EventOverviewTab;

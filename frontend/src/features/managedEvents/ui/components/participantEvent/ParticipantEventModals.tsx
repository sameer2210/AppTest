import React from "react";
import { PhoneVerifyModal } from "@/features/auth";
import { OrganizerContactSheet } from "@/components/sheets/OrganizerContactSheet";
import { OrganizerReviewModal } from "../OrganizerReviewModal";
import { formatLabelForEvent } from "../../shared/formatters";
import type { StronEvent } from "@/models/stronManaged/event";

interface ParticipantEventModalsProps {
  event: StronEvent;
  user: any;
  phoneVerifyOpen: boolean;
  onClosePhoneVerify: () => void;
  onVerifiedPhone: () => void;
  contactSheetOpen: boolean;
  onCloseContactSheet: () => void;
  organizerContactSeed: { organizerUid: string | null; eventKey: string | null };
  organizerReviewOpen: boolean;
  onCloseOrganizerReview: () => void;
  rating: number;
  onRatingChange: (val: number) => void;
  onSubmitRating: () => void;
  onViewLeaderboard: () => void;
  onViewRewards: () => void;
}

export const ParticipantEventModals = React.memo(
  ({
    event,
    user,
    phoneVerifyOpen,
    onClosePhoneVerify,
    onVerifiedPhone,
    contactSheetOpen,
    onCloseContactSheet,
    organizerContactSeed,
    organizerReviewOpen,
    onCloseOrganizerReview,
    rating,
    onRatingChange,
    onSubmitRating,
    onViewLeaderboard,
    onViewRewards,
  }: ParticipantEventModalsProps) => {
    return (
      <>
        <PhoneVerifyModal
          visible={phoneVerifyOpen}
          onClose={onClosePhoneVerify}
          onVerified={onVerifiedPhone}
        />

        <OrganizerContactSheet
          visible={contactSheetOpen}
          onClose={onCloseContactSheet}
          seed={organizerContactSeed}
        />

        <OrganizerReviewModal
          visible={organizerReviewOpen}
          onClose={onCloseOrganizerReview}
          eventTitle={
            event?.title || (event?.format ? formatLabelForEvent(event.format) : "Event Details")
          }
          organizerName={
            event?.organizerName ||
            (event?.organizerUid === user?.uid
              ? user?.username || (user as { name?: string }).name
              : null) ||
            "Organizer"
          }
          organizerAvatar={
            event?.organizerAvatar ||
            (event?.organizerUid === user?.uid ? user?.profileImageUrl : null)
          }
          organizerUid={event?.organizerUid}
          rating={rating}
          onRatingChange={onRatingChange}
          onSubmitRating={onSubmitRating}
          onViewLeaderboard={onViewLeaderboard}
          onViewRewards={onViewRewards}
        />
      </>
    );
  },
);

export default ParticipantEventModals;

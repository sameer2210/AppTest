import { useCallback, useState } from "react";
import { Linking } from "react-native";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser, useRequireAuth } from "@/features/auth";
import { href } from "@/navigation/href";
import { purchaseStronTicketThunk } from "@/features/payments";
import { captureEvent } from "@/analytics/posthog/events";
import type { StronEvent, StronTicketType } from "@/models/stronManaged/event";
import type { StronParticipation } from "@/models/stronManaged/participation";
import { isFreeTicket } from "@/utils/stronFreeTicket";
import { showToastMessage } from "@/utils/app-utils";

export interface UseEventCheckoutOptions {
  event: StronEvent | null;
  isClosed: boolean;
  isSoldOut: boolean;
  isCancelled: boolean;
  isOwned: boolean;
  isExternalListing: boolean;
  onTicketPurchased: (participation: StronParticipation) => Promise<void>;
}

export const useEventCheckout = ({
  event,
  isClosed,
  isSoldOut,
  isCancelled,
  isOwned,
  isExternalListing,
  onTicketPurchased,
}: UseEventCheckoutOptions) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const requireAuth = useRequireAuth();

  const [buying, setBuying] = useState(false);
  const [pendingTicketToBuy, setPendingTicketToBuy] = useState<StronTicketType | null>(null);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);
  const [participantTermsAccepted, setParticipantTermsAccepted] = useState(false);

  const openExternalRegister = useCallback(async () => {
    if (isClosed || isSoldOut) {
      showToastMessage(
        isSoldOut ? "This event is sold out." : "Registration is closed for this event.",
      );
      return;
    }
    const fromLink = String(event?.virtualLink || "").trim();
    const fromDestination = String(event?.destination || "").trim();
    const raw = fromLink || (/^https?:\/\//i.test(fromDestination) ? fromDestination : "");
    if (!raw) {
      showToastMessage("Registration link is not available.");
      return;
    }
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        showToastMessage("Could not open registration link.");
        return;
      }
      await Linking.openURL(url);
    } catch {
      showToastMessage("Could not open registration link.");
    }
  }, [event?.destination, event?.virtualLink, isClosed, isSoldOut]);

  const buyTicket = useCallback(
    async (ticket: StronTicketType, opts?: { phoneJustVerified?: boolean }) => {
      if (!event || buying) return;
      if (!user || user.isGuest) {
        requireAuth(() => {
          void buyTicket(ticket, opts);
        });
        return;
      }
      if (isClosed) {
        showToastMessage("Registration is closed for this event.");
        return;
      }
      const treatAsFree = isFreeTicket(ticket, event);
      if (!isExternalListing && treatAsFree && !participantTermsAccepted) {
        showToastMessage("Please accept the terms to continue.");
        return;
      }

      if (!opts?.phoneJustVerified && user?.phoneVerified !== true) {
        setPendingTicketToBuy(ticket);
        setPhoneVerifyOpen(true);
        return;
      }

      if (isExternalListing) {
        await openExternalRegister();
        return;
      }
      if (isSoldOut) {
        showToastMessage("This event is sold out.");
        return;
      }
      if (isCancelled) {
        showToastMessage("This event has been cancelled.");
        return;
      }
      if (isOwned) {
        showToastMessage("You already have a ticket for this event.");
        return;
      }

      const needsInfoForm = !treatAsFree || (event.participantInfoFields || []).length > 0;
      if (needsInfoForm) {
        captureEvent("ticket_checkout_started", {
          event_key: event.key,
          ticket_type: ticket.id,
          is_free: treatAsFree,
        });
        router.push({
          pathname: href.app.reviewPayment,
          params: {
            eventKey: event.key,
            ticketTypeId: ticket.id,
          },
        } as never);
        return;
      }

      setBuying(true);
      try {
        const result = await dispatch(
          purchaseStronTicketThunk({
            eventKey: event.key,
            ticketTypeId: ticket.id,
            prefillName: user?.username || undefined,
            prefillEmail: user?.email || undefined,
            prefillContact: user?.contactNo || undefined,
            treatAsFree: true,
          }),
        ).unwrap();

        if (!result.participation) {
          throw new Error("Free ticket could not be confirmed. Please try again.");
        }

        await onTicketPurchased(result.participation);
        showToastMessage(
          result.ticketNumber
            ? `Ticket confirmed · ${result.ticketNumber}`
            : "Free ticket confirmed.",
        );
      } catch (error) {
        showToastMessage(error instanceof Error ? error.message : "Could not claim ticket.");
      } finally {
        setBuying(false);
      }
    },
    [
      buying,
      dispatch,
      event,
      isCancelled,
      isClosed,
      isExternalListing,
      isOwned,
      isSoldOut,
      onTicketPurchased,
      openExternalRegister,
      participantTermsAccepted,
      requireAuth,
      router,
      user,
    ],
  );

  return {
    buying,
    setBuying,
    pendingTicketToBuy,
    setPendingTicketToBuy,
    phoneVerifyOpen,
    setPhoneVerifyOpen,
    participantTermsAccepted,
    setParticipantTermsAccepted,
    buyTicket,
    openExternalRegister,
  };
};

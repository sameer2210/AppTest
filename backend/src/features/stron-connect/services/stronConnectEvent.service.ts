import { StronEvent, StronParticipation } from "../../managed-events/index.js";
import { getErrorCode } from "../../../types/errors.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { EVENT_CHECKIN_STATUSES } from "../../../constants/index.js";


export const loadEventAndParticipation = (eventKey: string, uid: string) =>
  Promise.all([
    StronEvent.findOne({ key: eventKey, isDeleted: { $ne: true } }).lean(),
    StronParticipation.findOne({ eventKey, uid }),
  ]);

export const assertEventOpenForCheckIn = (event: ServiceParams) => {
  if (!EVENT_CHECKIN_STATUSES.has(event.status)) {
    throw codedError("invalid_state", "This event is not open for check-in.");
  }
  const inPerson =
    event.marathonMode === "in_person" || event.format === "in_person_listing";
  if (!inPerson) {
    throw codedError(
      "invalid_state",
      "Only in-person events support door check-in.",
    );
  }
};

export const applyEventCheckIn = async ({
  scannerUid,
  participation,
  participantUid,
  eventKey,
  ticketNumber = undefined,
  rawPayload = undefined,
  eventTitle,
  recordConnectScan,
}: {
  scannerUid: unknown;
  participation: {
    checkedInAt?: Date | null;
    checkedInByUid?: string | null;
    ticketNumber?: string | null;
    save: () => Promise<unknown>;
  };
  participantUid: unknown;
  eventKey: unknown;
  ticketNumber?: string | null;
  rawPayload?: string;
  eventTitle?: string;
  recordConnectScan: (fields: unknown) => Promise<unknown>;
}) => {
  if (participation.checkedInAt) {
    throw codedError(
      "already_checked_in",
      eventTitle
        ? `Already checked into ${eventTitle}.`
        : "Already checked in for this event.",
    );
  }

  participation.checkedInAt = new Date();
  participation.checkedInByUid = String(scannerUid);
  await participation.save();

  await recordConnectScan({
    scannerUid,
    eventKey,
    ticketNumber: ticketNumber || participation.ticketNumber,
    participantUid,
    kind: "event_check_in",
    rawPayload,
  });

  return {
    alreadyCheckedIn: false,
    checkedInAt: participation.checkedInAt,
    ticketNumber: participation.ticketNumber,
  };
};

export const checkInWithTicketQr = async ({
  scannerUid,
  ticket,
  rawPayload,
  findLiveUser,
  publicUserCard,
  recordConnectScan,
}: ServiceParams) => {
  const [event, participation] = await loadEventAndParticipation(ticket.eventKey, ticket.uid);
  if (!event) throw codedError("event_not_found", "Event not found for this ticket QR.");
  assertEventOpenForCheckIn(event);

  const isOrganizer = event.organizerUid === scannerUid;
  const isSelf = ticket.uid === scannerUid;
  if (!isOrganizer && !isSelf) {
    throw codedError("not_owner", "Only the organizer can check in this ticket.");
  }
  if (!participation) {
    throw codedError("participation_not_found", "No registration found for this ticket.");
  }
  if (
    ticket.ticketNumber &&
    participation.ticketNumber &&
    participation.ticketNumber !== ticket.ticketNumber
  ) {
    throw codedError("invalid_qr", "Ticket number does not match registration.");
  }

  let checkIn;
  let isAlreadyCheckedIn = false;
  try {
    checkIn = await applyEventCheckIn({
      scannerUid,
      participation,
      participantUid: ticket.uid,
      eventKey: ticket.eventKey,
      ticketNumber: ticket.ticketNumber,
      rawPayload,
      eventTitle: event.title,
      recordConnectScan,
    });
  } catch (err: unknown) {
    if (
      getErrorCode(err) === "already_checked_in" ||
      getErrorMessage(err).includes("Already checked in")
    ) {
      isAlreadyCheckedIn = true;
      checkIn = {
        alreadyCheckedIn: true,
        checkedInAt: participation.checkedInAt,
        ticketNumber: participation.ticketNumber,
      };
    } else {
      throw err;
    }
  }

  const participant = await findLiveUser(ticket.uid, {
    lean: true,
    select: "uid username name profileImageUrl connectCode",
  });

  return {
    kind: "event_check_in",
    alreadyCheckedIn: isAlreadyCheckedIn,
    eventKey: ticket.eventKey,
    eventTitle: event.title,
    ticketNumber: checkIn.ticketNumber,
    checkedInAt: checkIn.checkedInAt,
    participant: participant
      ? publicUserCard(participant)
      : { uid: ticket.uid, username: null, profileImageUrl: null, displayCode: null },
    message: isAlreadyCheckedIn
      ? `Already checked into ${event.title}.`
      : `Checked in ${participant?.username || "participant"}.`,
  };
};

export default {
  loadEventAndParticipation,
  assertEventOpenForCheckIn,
  applyEventCheckIn,
  checkInWithTicketQr,
};

import type { StronEvent } from "@/models/stronManaged/event";
import type { StronEventDashboard } from "@/features/managedEvents";
import { formatDayMonth, formatTicketBenefits, formatTime } from "../../../shared/formatters";

export type RegistrationTicketParams = {
  eventKey: string;
  registrationId: string;
  name: string;
  email?: string;
  contactNo?: string;
  ticketCode: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  benefits: string;
  avatarUri?: string;
  avatarUid?: string;
  qrUri?: string;
  participantInfo?: { field: string; value: string }[];
};

type RecentRow = NonNullable<StronEventDashboard["recentRegistrations"]>[number];

const timeAgo = (iso?: string | null) => {
  if (!iso) return "Recently";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "Recently";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

/** Map dashboard recent-registration rows into list + View ticket params. */
export const mapRecentRegistrations = (event: StronEvent, rows: RecentRow[] | undefined) => {
  const ticket = event.ticketTypes?.[0];
  const fallbackPrice = ticket ? `₹${Math.round(ticket.price)}` : "₹0";
  const fallbackBenefits = formatTicketBenefits(ticket || { label: "Entry ticket" });

  return (rows || []).map((row) => {
    const when = row.enrolledAt || event.startDate;
    const matchedTicket = event.ticketTypes?.find((t) => t.label === row.ticketLabel) || ticket;

    return {
      id: row.id,
      name: row.name,
      timeAgo: timeAgo(row.enrolledAt),
      avatarUri: row.avatarUri || null,
      avatarUid: row.uid || null,
      ticketParams: {
        eventKey: event.key,
        registrationId: row.id,
        name: row.name,
        ticketCode: row.ticketNumber ? `#${row.ticketNumber}` : `#${row.id.slice(-6)}`,
        dateLabel: formatDayMonth(when),
        timeLabel: formatTime(when),
        priceLabel: row.ticketPrice != null ? `₹${Math.round(row.ticketPrice)}` : fallbackPrice,
        benefits: formatTicketBenefits(
          matchedTicket || { label: row.ticketLabel || fallbackBenefits },
        ),
        ...(row.email ? { email: row.email } : {}),
        ...(row.contactNo ? { contactNo: row.contactNo } : {}),
        ...(Array.isArray(row.participantInfo) ? { participantInfo: row.participantInfo } : {}),
        ...(row.avatarUri ? { avatarUri: row.avatarUri } : {}),
        ...(row.uid ? { avatarUid: row.uid } : {}),
        ...(row.qrCode ? { qrUri: row.qrCode } : {}),
      } satisfies RegistrationTicketParams,
    };
  });
};

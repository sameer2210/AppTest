/** Free-ticket helpers — including apidev ₹1 placeholders stamped as free. */

export const STRON_FREE_TICKET_MARKER = "__STRON_FREE__";
export const STRON_FREE_EVENT_MARKER = "__STRON_FREE_EVENT__";

export type FreeTicketLike = {
  price?: number | null;
  label?: string | null;
  benefits?: string | null;
};

export type FreeEventLike = {
  description?: string | null;
  rules?: string[] | null;
  ticketTypes?: FreeTicketLike[] | null;
};

export const stripFreeTicketMarker = (benefits?: string | null): string =>
  String(benefits || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== STRON_FREE_TICKET_MARKER)
    .join("\n")
    .trim();

export const stripFreeEventMarker = (text?: string | null): string =>
  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== STRON_FREE_EVENT_MARKER)
    .join("\n")
    .trim();

const labelLooksFree = (label?: string | null) => {
  const value = String(label || "").trim();
  if (!value) return false;
  if (/^free(\b|[_\s-]|$)/i.test(value)) return true;
  if (/free\s+(entry|external|registration|ticket)/i.test(value)) return true;
  return false;
};

export const isFreeEvent = (event: FreeEventLike | null | undefined): boolean => {
  if (!event) return false;
  if (String(event.description || "").includes(STRON_FREE_EVENT_MARKER)) return true;
  if ((event.rules || []).some((rule) => String(rule).includes(STRON_FREE_EVENT_MARKER))) {
    return true;
  }
  const tickets = event.ticketTypes || [];
  return tickets.length > 0 && tickets.every((ticket) => isFreeTicket(ticket));
};

export const isFreeTicket = (
  ticket: FreeTicketLike | null | undefined,
  event?: FreeEventLike | null,
): boolean => {
  if (event && isFreeEvent({ ...event, ticketTypes: undefined })) return true;
  if (!ticket) return false;
  const price = Number(ticket.price);
  if (Number.isFinite(price) && price <= 0) return true;
  const benefits = String(ticket.benefits || "");
  if (benefits.includes(STRON_FREE_TICKET_MARKER)) return true;
  if (labelLooksFree(ticket.label)) return true;
  // apidev free workaround stored ₹1 with a Free* label
  if (price === 1 && labelLooksFree(ticket.label)) return true;
  return false;
};

export const formatTicketPriceLabel = (
  ticket: FreeTicketLike | null | undefined,
  event?: FreeEventLike | null,
): string => {
  if (!ticket || isFreeTicket(ticket, event)) return "Free";
  return `₹${Math.round(Number(ticket.price) || 0)}`;
};

/** Persist a free marker so participant UI stays Free even if API stores ₹1. */
export const stampFreeTicketFields = <T extends FreeTicketLike>(ticket: T): T => {
  const cleaned = stripFreeTicketMarker(ticket.benefits);
  const benefits = cleaned ? `${cleaned}\n${STRON_FREE_TICKET_MARKER}` : STRON_FREE_TICKET_MARKER;
  let label = String(ticket.label || "").trim();
  if (!labelLooksFree(label)) {
    label = label ? `Free ${label}` : "Free";
  }
  return { ...ticket, label, benefits };
};

export const stampFreeEventDescription = (description?: string | null): string => {
  const cleaned = stripFreeEventMarker(description);
  return cleaned ? `${cleaned}\n${STRON_FREE_EVENT_MARKER}` : STRON_FREE_EVENT_MARKER;
};

export const stampFreeEventRules = (rules?: string[] | string | null): string[] => {
  const list = Array.isArray(rules)
    ? rules.map((r) => String(r).trim()).filter(Boolean)
    : String(rules || "")
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
  const without = list.filter((r) => r !== STRON_FREE_EVENT_MARKER);
  return [...without, STRON_FREE_EVENT_MARKER];
};

export const eventLooksFree = (event: FreeEventLike | null | undefined): boolean =>
  isFreeEvent(event);

export const minPaidTicketPrice = (
  tickets: FreeTicketLike[] | null | undefined,
  event?: FreeEventLike | null,
): number => {
  const paid = (tickets || [])
    .filter((t) => !isFreeTicket(t, event))
    .map((t) => Number(t.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!paid.length) return 0;
  return Math.min(...paid);
};

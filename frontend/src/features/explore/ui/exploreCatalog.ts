import type { StronEvent } from "@/models/stronManaged/event";
import type { ExploreFilter } from "./components/ExploreFilterChips";
import { isFreeTicket, minPaidTicketPrice } from "@/utils/stronFreeTicket";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";

export type ExploreCatalogCard = {
  id: string;
  eventKey: string;
  organizerUid: string;
  /** Remote banner URL for ExploreEventImage (matches detail screen bannerName). */
  imageUrl?: string;
  title: string;
  date: string;
  price: string;
  category: string;
  subtitle?: string;
  location?: string;
  minPrice: number;
  format: StronEvent["format"];
  marathonMode?: StronEvent["marathonMode"];
  listingType?: string;
  isExternal?: boolean;
  /** True when users can still register. */
  registrationOpen?: boolean;
  startDateMs?: number;
  isEnded?: boolean;
};

const FORMAT_LABEL: Record<StronEvent["format"], string> = {
  marathon: "Marathon",
  virtual_step_challenge: "Step Challenge",
  king_of_the_hill: "King of the Hill",
  face_off: "Face-Off",
};

const shortDescription = (raw?: string | null, format?: StronEvent["format"]) => {
  const cleaned = String(raw || "")
    .replace(/^External listing \(/i, "")
    .replace(/\)\s*$/, "")
    .trim();
  if (cleaned && cleaned.length > 3 && !/^https?:\/\//i.test(cleaned)) {
    return cleaned.length > 42 ? `${cleaned.slice(0, 42).trim()}…` : cleaned;
  }
  if (format && FORMAT_LABEL[format]) return FORMAT_LABEL[format];
  return "Event";
};

const formatShortDate = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const minTicketPrice = (event: StronEvent) => minPaidTicketPrice(event.ticketTypes);

const startDateMs = (iso?: string | null) => {
  if (!iso) return Number.NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : Number.NaN;
};

/** Matches backend `isRegistrationOpen` — published/live, not sold out, before reg end. */
export const isRegistrationOpenForExplore = (event: StronEvent): boolean => {
  if (event.status !== "published" && event.status !== "live" && event.status !== "started")
    return false;
  if (event.soldOut === true) return false;

  if (event.registrationEndDate) {
    const end = new Date(event.registrationEndDate).getTime();
    if (Number.isFinite(end) && Date.now() > end) return false;
  }

  if (event.endDate) {
    const endMs = new Date(event.endDate).getTime();
    if (Number.isFinite(endMs) && Date.now() > endMs) return false;
  }

  return true;
};

/**
 * Bug 9: open registration first (nearest start to today), then closed (nearest start).
 */
export const sortCatalogEvents = (events: StronEvent[]): StronEvent[] => {
  const publicEvents = events.filter((e) => e.visibility !== "private");
  const now = Date.now();
  const proximity = (event: StronEvent) => {
    const t = startDateMs(event.startDate);
    return Number.isFinite(t) ? Math.abs(t - now) : Number.POSITIVE_INFINITY;
  };
  const recency = (event: StronEvent) => {
    const t = startDateMs(event.updatedAt || event.createdAt);
    return Number.isFinite(t) ? t : 0;
  };

  return [...publicEvents].sort((a, b) => {
    const aOpen = isRegistrationOpenForExplore(a) ? 0 : 1;
    const bOpen = isRegistrationOpenForExplore(b) ? 0 : 1;
    if (aOpen !== bOpen) return aOpen - bOpen;
    const byProximity = proximity(a) - proximity(b);
    if (byProximity !== 0) return byProximity;
    // Newer publishes surface first when start dates are equally close.
    return recency(b) - recency(a);
  });
};

const parseAnyDateToMs = (dateInput?: string | number | Date | null): number | null => {
  if (!dateInput) return null;
  if (typeof dateInput === "number" && Number.isFinite(dateInput)) return dateInput;
  if (dateInput instanceof Date) {
    const t = dateInput.getTime();
    return Number.isFinite(t) ? t : null;
  }
  if (typeof dateInput === "string") {
    const str = dateInput.trim();
    if (!str) return null;

    const directMs = new Date(str).getTime();
    if (Number.isFinite(directMs)) return directMs;

    const shortDateMatch = str.match(/^(\d{1,2})\s+([A-Za-z]+)(?:\s+(\d{4}))?$/);
    if (shortDateMatch) {
      const day = parseInt(shortDateMatch[1], 10);
      const monthStr = shortDateMatch[2].toLowerCase();
      const year = shortDateMatch[3] ? parseInt(shortDateMatch[3], 10) : new Date().getFullYear();

      const months: Record<string, number> = {
        jan: 0,
        january: 0,
        feb: 1,
        february: 1,
        mar: 2,
        march: 2,
        apr: 3,
        april: 3,
        may: 4,
        jun: 5,
        june: 5,
        jul: 6,
        july: 6,
        aug: 7,
        august: 7,
        sep: 8,
        sept: 8,
        september: 8,
        oct: 9,
        october: 9,
        nov: 10,
        november: 10,
        dec: 11,
        december: 11,
      };

      const monthIndex = months[monthStr.substring(0, 3)];
      if (monthIndex !== undefined) {
        const parsedDate = new Date(year, monthIndex, day);
        const t = parsedDate.getTime();
        if (Number.isFinite(t)) return t;
      }
    }
  }
  return null;
};

const calculateEffectiveEndTimeMs = (event: StronEvent): number | null => {
  const explicitEnd = event.completedAt || event.endDate || event.registrationEndDate;
  if (explicitEnd) {
    const endMs = parseAnyDateToMs(explicitEnd);
    if (endMs !== null) return endMs;
  }

  const startMs =
    parseAnyDateToMs(event.startDate) ??
    parseAnyDateToMs(event.registrationStartDate) ??
    parseAnyDateToMs(event.createdAt);

  if (startMs === null) return null;

  let days =
    typeof event.durationDays === "number" && event.durationDays > 0 ? event.durationDays : 0;
  if (!days && Array.isArray(event.ticketTypes) && event.ticketTypes.length > 0) {
    for (const t of event.ticketTypes) {
      if (t && typeof t.days === "number" && t.days > days) {
        days = t.days;
      }
    }
  }
  if (!days || days <= 0) {
    days = 1;
  }

  return startMs + days * 24 * 60 * 60 * 1000;
};

/** Map a STRON managed event into the Explore card shape. */
export const toExploreCatalogCard = (event: StronEvent): ExploreCatalogCard => {
  const minPrice = minTicketPrice(event);
  const imageUrl = resolveEventBannerUri(event.bannerName);
  const isExternal =
    event.listingType === "external" ||
    /^External listing \(/i.test(String(event.description || ""));
  const isFree =
    !isExternal &&
    (minPrice === 0 ||
      ((event.ticketTypes || []).length > 0 &&
        (event.ticketTypes || []).every((ticket) => isFreeTicket(ticket))));
  const startMs = parseAnyDateToMs(event.startDate);

  const status = (event.status || "").toLowerCase().trim();
  let isEnded =
    status === "completed" || status === "settled" || status === "cancelled" || status === "ended";

  const effectiveEndMs = calculateEffectiveEndTimeMs(event);
  if (!isEnded && effectiveEndMs !== null && effectiveEndMs < Date.now()) {
    isEnded = true;
  }

  let isClosed = false;
  if (!isEnded) {
    if (status === "closed") {
      isClosed = true;
    } else if (event.registrationEndDate) {
      const regEnd = parseAnyDateToMs(event.registrationEndDate);
      if (regEnd !== null && Date.now() > regEnd) {
        isClosed = true;
      }
    } else if (event.soldOut === true) {
      isClosed = true;
    }
  }

  return {
    id: event.key,
    eventKey: event.key,
    organizerUid: event.organizerUid,
    imageUrl,
    title: event.title,
    date: formatShortDate(event.startDate),
    price: isEnded
      ? "Ended"
      : isClosed
        ? "Closed"
        : isExternal
          ? "Register"
          : isFree
            ? "Free"
            : `₹${minPrice}`,
    category: isExternal ? "External" : FORMAT_LABEL[event.format] || "Event",
    subtitle: shortDescription(event.description, event.format),
    location: (event.destination || "").trim() || undefined,
    minPrice,
    format: event.format,
    marathonMode: event.marathonMode,
    listingType: event.listingType,
    isExternal,
    registrationOpen: isRegistrationOpenForExplore(event),
    startDateMs: startMs !== null ? startMs : undefined,
    isEnded,
  };
};

/** Normalize API/format aliases so Explore tabs stay mutually exclusive. */
const normalizeCatalogFormat = (format?: string | null): string | null => {
  if (!format) return null;
  const key = String(format)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (key === "marathon") return "marathon";
  if (key === "virtual_step_challenge" || key === "step_challenge") {
    return "virtual_step_challenge";
  }
  if (key === "king_of_the_hill" || key === "koth") return "king_of_the_hill";
  if (key === "face_off" || key === "faceoff") return "face_off";
  return key;
};

/** Matches Challenges: Virtual Step Challenges (no overlap with Marathons/Events). */
const isChallengeFormat = (c: ExploreCatalogCard) => {
  const fmt = normalizeCatalogFormat(c.format);
  return fmt === "virtual_step_challenge" && !c.isExternal && c.listingType !== "self_managed";
};

/** Matches Games: King of the Hill + Face-Off. */
const isGameFormat = (c: ExploreCatalogCard) => {
  const fmt = normalizeCatalogFormat(c.format);
  return fmt === "king_of_the_hill" || fmt === "face_off";
};

/** Matches Events: Marathons, external event listings, and self-managed events. */
const isEventListing = (c: ExploreCatalogCard) => {
  const fmt = normalizeCatalogFormat(c.format);
  return fmt === "marathon" || c.isExternal || c.listingType === "self_managed";
};

export const filterExploreCatalog = (
  cards: ExploreCatalogCard[],
  filter: ExploreFilter,
): ExploreCatalogCard[] => {
  // Always filter out ended events from the Explore feed
  const activeCards = cards.filter((c) => !c.isEnded);

  switch (filter) {
    case "Challenges":
      return activeCards.filter(isChallengeFormat);
    case "Events":
      return activeCards.filter(isEventListing);
    case "Games":
      return activeCards.filter(isGameFormat);
    case "Trainers":
      return activeCards.filter(
        (c) =>
          c.category.toLowerCase().includes("trainer") ||
          c.category.toLowerCase().includes("coach"),
      );
    case "Gyms":
      return activeCards.filter(
        (c) =>
          c.category.toLowerCase().includes("gym") ||
          c.category.toLowerCase().includes("hub") ||
          c.category.toLowerCase().includes("center"),
      );
    case "All":
    default:
      return activeCards;
  }
};

export const matchesSearchQuery = (card: ExploreCatalogCard, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    card.title.toLowerCase().includes(q) ||
    card.category.toLowerCase().includes(q) ||
    card.eventKey.toLowerCase().includes(q)
  );
};

export const chunkPairs = <T>(items: T[]): T[][] => {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
};

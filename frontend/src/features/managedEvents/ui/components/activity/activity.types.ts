import type { StronMedalTier } from "@/models/stronManaged/reward";

export const TICKET_FILTERS = ["All", "Challenges", "Events", "Games"] as const;
export type TicketFilter = (typeof TICKET_FILTERS)[number];

export type ActivityItem = {
  id: string;
  role: "participant" | "organizer";
  eventKey: string;
  title: string;
  tag: string;
  date: string;
  actionLabel: string;
  eventStatus?: string;
  participationStatus?: string | null;
  format?: string;
  progressPercent?: number | null;
  progressLabel?: string | null;
  rewardKind?: "medal" | "certificate" | null;
  medalTier?: StronMedalTier | null;
  rewardFormat?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  organizerPhone?: string | null;
  organizerEmail?: string | null;
  supportPhone?: string | null;
  supportEmail?: string | null;
  contactNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  organizerUid?: string | null;
  organizerId?: string | null;
  creatorUid?: string | null;
  creatorId?: string | null;
  userId?: string | null;
  coverImageUrl?: string | null;
  organizerName?: string | null;
  organizerLogoUrl?: string | null;
  registrationCount?: number;
  rank?: number | string | null;
  totalWins?: number | null;
  kingTime?: string | null;
  totalKingSeconds?: number | null;
  targetSteps?: number | null;
  currentSteps?: number | null;
  coveredSteps?: number | null;
  targetDistanceKm?: number | null;
  currentDistanceKm?: number | null;
  daysLeft?: number | string | null;
  successfulDays?: number | null;
  requiredDays?: number | null;
  targetDays?: number | null;
  dailyStepTarget?: number | null;
  mapUrl?: string | null;
  destination?: string | null;
  deadlineDate?: string | null;
  startDate?: string | null;
  isExternal?: boolean;
  listingType?: string | null;
  ticketTypes?: {
    id?: string;
    label?: string;
    price?: number;
    distanceKm?: number | null;
    targetSteps?: number | null;
    dailyStepTarget?: number | null;
    days?: number | null;
  }[];
};

export type SectionGroup = {
  key: string;
  title: string;
  items: ActivityItem[];
};

export const EVENT_FORMATS = new Set(["marathon"]);
export const CHALLENGE_FORMATS = new Set([
  "virtual_step_challenge",
  "king_of_the_hill",
  "face_off",
]);

export const isEventCompleted = (status?: string | null) =>
  status === "completed" || status === "settled";

export const isLiveOrFinished = (status?: string | null) => {
  const s = status?.trim().toLowerCase() ?? "";
  return s === "live" || s === "completed" || s === "settled";
};

export const formatKingSecondsLabel = (seconds?: number | null) => {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) {
    return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  }
  return `${m}m`;
};

export const formatDaysRemainingLabel = (deadlineIso?: string | null): string | null => {
  if (!deadlineIso) return null;
  const endMs = new Date(deadlineIso).getTime();
  if (!Number.isFinite(endMs)) return null;
  const diffMs = endMs - Date.now();
  if (diffMs <= 0) return "Ended";
  const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return `${days} Day${days === 1 ? "" : "s"} Left`;
};

export const formatStartsLabel = (startIso?: string | null): string | null => {
  if (!startIso) return null;
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getTime() <= Date.now()) return null;
  return `Starts ${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })}`;
};

export const formatEventSubtitle = (item: ActivityItem): string => {
  const parts: string[] = [];
  if (item.date?.trim()) parts.push(item.date.trim());
  if (item.destination?.trim()) parts.push(item.destination.trim());
  return parts.join(" · ");
};

export const mapUrlForItem = (item: ActivityItem): string | null => {
  if (item.mapUrl?.trim()) return item.mapUrl.trim();
  if (item.destination?.trim()) {
    return `https://maps.google.com/?q=${encodeURIComponent(item.destination.trim())}`;
  }
  return null;
};

export const formatStepsShort = (steps: number): string => {
  if (steps >= 1000) {
    const k = steps / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(steps);
};

export const getFormatSectionKey = (
  item: ActivityItem,
  _activeFilter: string,
): { key: string; title: string } => {
  const format = (item.format || "").toLowerCase();
  const isExternalEvent =
    item.isExternal ||
    item.listingType === "external" ||
    item.listingType === "self_managed" ||
    item.listingType === "redirect" ||
    format === "external" ||
    format === "redirect";

  if (format === "marathon") {
    return { key: "marathon", title: "Marathons & Races" };
  }
  if (format === "virtual_step_challenge") {
    return { key: "step_challenge", title: "Step Challenges" };
  }
  if (format === "king_of_the_hill") {
    return { key: "koth", title: "King of the Hill" };
  }
  if (format === "face_off") {
    return { key: "face_off", title: "Face Off Duels" };
  }
  if (isExternalEvent) {
    return { key: "external_event", title: "External Events & Redirects" };
  }
  return { key: "other_challenge", title: "Challenge Tickets & Passes" };
};

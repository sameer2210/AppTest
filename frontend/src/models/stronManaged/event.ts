export type StronEventFormat =
  "marathon" | "virtual_step_challenge" | "king_of_the_hill" | "face_off";

export type StronEventStatus =
  | "draft"
  | "published"
  | "live"
  | "started"
  | "in_progress"
  | "completed"
  | "closed"
  | "ended"
  | "cancelled"
  | "settled";

export type MarathonMode = "virtual" | "in_person";

export type ListingType = "stron_managed" | "self_managed" | "external";

export type StronTicketType = {
  id: string;
  label: string;
  price: number;
  distanceKm?: number | null;
  targetSteps?: number | null;
  days?: number | null;
  dailyStepTarget?: number | null;
  soldCount?: number;
  benefits?: string;
};

export type StronEvent = {
  key: string;
  organizerUid: string;
  format: StronEventFormat;
  title: string;
  description: string;
  rules: string[];
  bannerName?: string | null;
  marathonMode?: MarathonMode | null;
  destination?: string | null;
  virtualLink?: string | null;
  successfulDaysRequired?: number | null;
  ticketTypes: StronTicketType[];
  capacity?: number | null;
  registrationCount?: number;
  soldOut?: boolean;
  durationDays?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  registrationStartDate?: string | null;
  registrationEndDate?: string | null;
  completedAt?: string | null;
  /** Organizer-selected reward labels (STRON-managed always Certificate + Medal). */
  rewardLabels?: string[];
  /** Participant info fields collected at registration. */
  participantInfoFields?: string[];
  listingType?: string;
  visibility?: "public" | "private";
  status: StronEventStatus;
  organizerName?: string;
  organizerAvatar?: string | null;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateMarathonTicketInput = {
  id?: string;
  label: string;
  price: number;
  distanceKm?: number;
  targetSteps?: number;
  days: number;
  benefits?: string;
};

export type CreateMarathonPayload = {
  title: string;
  description?: string;
  rules?: string[] | string;
  organizerName?: string;
  capacity?: number | null;
  durationDays: number;
  startDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  marathonMode?: MarathonMode;
  listingType?: ListingType;
  visibility?: "public" | "private";
  destination?: string;
  virtualLink?: string;
  bannerName?: string;
  rewardLabels?: string[];
  participantInfoFields?: string[];
  tickets: CreateMarathonTicketInput[];
};

export type CreateStepChallengeTicketInput = {
  id?: string;
  label: string;
  price: number;
  dailyStepTarget: number;
  benefits?: string;
};

export type CreateStepChallengePayload = {
  title: string;
  description?: string;
  rules?: string[] | string;
  organizerName?: string;
  capacity?: number | null;
  durationDays: number;
  successfulDaysRequired: number;
  startDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  visibility?: "public" | "private";
  destination?: string;
  virtualLink?: string;
  bannerName?: string;
  rewardLabels?: string[];
  participantInfoFields?: string[];
  tickets: CreateStepChallengeTicketInput[];
};

export type CreateDuelTicketInput = {
  id?: string;
  label: string;
  price: number;
  benefits?: string;
};

/** Shared payload for King of the Hill + Face Off (exactly one ticket). */
export type CreateDuelPayload = {
  title: string;
  description?: string;
  rules?: string[] | string;
  capacity?: number | null;
  durationDays: number;
  startDate?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  organizerName?: string;
  bannerName?: string;
  visibility?: "public" | "private";
  rewardLabels?: string[];
  participantInfoFields?: string[];
  tickets: CreateDuelTicketInput[];
};

const asString = (value: unknown, fallback = ""): string =>
  value == null ? fallback : String(value);

const asNumberOrNull = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export const parseStronTicketType = (json: Record<string, unknown>): StronTicketType => ({
  id: asString(json.id),
  label: asString(json.label),
  price: Number(json.price) || 0,
  distanceKm: asNumberOrNull(json.distanceKm),
  targetSteps: asNumberOrNull(json.targetSteps),
  days: asNumberOrNull(json.days),
  dailyStepTarget: asNumberOrNull(json.dailyStepTarget),
  soldCount: asNumberOrNull(json.soldCount) ?? 0,
  benefits: asString(json.benefits),
});

export const parseStronEvent = (json: Record<string, unknown>): StronEvent => ({
  key: asString(json.key),
  organizerUid: asString(json.organizerUid),
  format: asString(json.format) as StronEventFormat,
  title: asString(json.title),
  description: asString(json.description),
  rules: Array.isArray(json.rules) ? json.rules.map((r) => String(r)) : [],
  bannerName:
    json.bannerName != null
      ? asString(json.bannerName)
      : json.banner != null
        ? asString(json.banner)
        : null,
  marathonMode: (json.marathonMode as MarathonMode | null) ?? null,
  destination: json.destination == null ? null : asString(json.destination),
  virtualLink: json.virtualLink == null ? null : asString(json.virtualLink),
  successfulDaysRequired: asNumberOrNull(json.successfulDaysRequired),
  ticketTypes: Array.isArray(json.ticketTypes)
    ? json.ticketTypes.map((t) => parseStronTicketType(t as Record<string, unknown>))
    : [],
  capacity: asNumberOrNull(json.capacity),
  registrationCount: asNumberOrNull(json.registrationCount) ?? 0,
  soldOut: json.soldOut === true,
  durationDays: asNumberOrNull(json.durationDays),
  startDate: json.startDate == null ? null : asString(json.startDate),
  endDate: json.endDate == null ? null : asString(json.endDate),
  registrationStartDate:
    json.registrationStartDate == null ? null : asString(json.registrationStartDate),
  registrationEndDate: json.registrationEndDate == null ? null : asString(json.registrationEndDate),
  completedAt: json.completedAt == null ? null : asString(json.completedAt),
  rewardLabels: Array.isArray(json.rewardLabels)
    ? json.rewardLabels.map((r) => String(r)).filter(Boolean)
    : [],
  participantInfoFields: Array.isArray(json.participantInfoFields)
    ? json.participantInfoFields.map((r) => String(r)).filter(Boolean)
    : [],
  listingType: json.listingType == null ? undefined : asString(json.listingType),
  visibility: json.visibility === "private" ? "private" : "public",
  status: asString(json.status, "draft") as StronEventStatus,
  organizerName: json.organizerName != null ? asString(json.organizerName) : undefined,
  organizerAvatar: json.organizerAvatar != null ? asString(json.organizerAvatar) : undefined,
  publishedAt: json.publishedAt == null ? null : asString(json.publishedAt),
  createdAt: json.createdAt == null ? undefined : asString(json.createdAt),
  updatedAt: json.updatedAt == null ? undefined : asString(json.updatedAt),
});

export interface StronEventResponse {
  success: boolean;
  event: Record<string, unknown>;
}

export interface StronEventsListResponse {
  success: boolean;
  events: Record<string, unknown>[];
}

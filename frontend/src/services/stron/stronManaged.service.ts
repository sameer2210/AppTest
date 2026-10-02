import { isAxiosError } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../core/apiClient.service";
import {
  parseStronEvent,
  type CreateMarathonPayload,
  type CreateStepChallengePayload,
  type CreateDuelPayload,
  type StronEvent,
  type StronEventResponse,
  type StronEventsListResponse,
} from "@/models/stronManaged/event";
import {
  parseKotHMatches,
  parseLeaderboard,
  parseStronParticipation,
  parseStronProgress,
  type StronKotHMatch,
  type StronLeaderboardEntry,
  type StronParticipation,
  type StronProgress,
  type StronParticipationResponse,
  type StronProgressResponse,
  type StronLeaderboardResponse,
  type StronMatchesResponse,
} from "@/models/stronManaged/participation";
import {
  parseStronReward,
  type StronReward,
  type StronRewardBadges,
  type StronMyRewardsResponse,
  type StronRewardPreviewsResponse,
} from "@/models/stronManaged/reward";
import type {
  MyActivityDto,
  MyActivityResponse,
} from "@/models/stronManaged/activity";
import type {
  StronEventDashboard,
  StronEventDashboardResponse,
} from "@/models/stronManaged/dashboard";
import {
  parseStronSettlement,
  type StronSettlement,
  type StronSettlementStatus,
  type StronSettlementResponse,
} from "@/models/stronManaged/settlement";
import type {
  CreateParticipationOrderExtras,
  CreateParticipationOrderResultDto,
  CreateParticipationOrderResponse,
  ValidateRegistrationCouponResultDto,
  ValidateRegistrationCouponResponse,
  ParticipantInfoPrefillItem,
  ParticipantInfoPrefillResponse,
} from "@/models/stronManaged/order";
import type {
  UpsertOrganizerPayload,
  StronOrganizerResponse,
} from "@/models/stronManaged/organizer";
import {
  stampFreeTicketFields,
  stampFreeEventDescription,
  stampFreeEventRules,
} from "@/utils/stronFreeTicket";

export type StronApiError = Error & {
  code?: string;
  message: string;
};

const CATALOG_CACHE_KEY = "stron_managed_catalog_cache";
let inMemoryCatalogCache: StronEvent[] | null = null;
let lastCatalogFetchTime = 0;
const CATALOG_CACHE_TTL_MS = 60_000;

export const invalidateCatalogCache = () => {
  inMemoryCatalogCache = null;
  lastCatalogFetchTime = 0;
  void AsyncStorage.removeItem(CATALOG_CACHE_KEY).catch(() => {});
};

const toApiError = (error: unknown): StronApiError => {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      { code?: string; message?: string; error?: string } | undefined;
    const err = new Error(
      data?.message || data?.error || error.message || "Request failed.",
    ) as StronApiError;
    err.code = data?.code;
    return err;
  }
  if (error instanceof Error) {
    return error as StronApiError;
  }
  return new Error("Something went wrong.") as StronApiError;
};

/** Older apidev builds still reject ₹0 tickets with this exact message. */
const isLegacyFreePriceRejection = (error: unknown) =>
  /price must be greater than 0/i.test(toApiError(error).message);

type TicketPriceFields = {
  price?: number;
  label?: string;
  benefits?: string;
};

const payloadHasFreeTicket = (tickets?: TicketPriceFields[]) =>
  Array.isArray(tickets) && tickets.some((t) => Number(t?.price) === 0);

const stampFreeCreatePayload = <
  T extends {
    tickets?: TicketPriceFields[];
    description?: string;
    rules?: string[] | string;
  },
>(
  payload: T,
): T => {
  if (!payloadHasFreeTicket(payload.tickets)) return payload;
  return {
    ...payload,
    description: stampFreeEventDescription(payload.description),
    rules: stampFreeEventRules(payload.rules),
    tickets: (payload.tickets || []).map((t) =>
      Number(t.price) === 0 ? stampFreeTicketFields(t) : t,
    ),
  };
};

const bumpFreeTicketPrices = <T extends TicketPriceFields>(tickets: T[]): T[] =>
  tickets.map((t) => (Number(t.price) === 0 ? stampFreeTicketFields({ ...t, price: 1 }) : t));

/**
 * Create/update with price 0 first. If a legacy API rejects free tickets,
 * retry once with ₹1 placeholders + free markers so the app can still treat them as free.
 */
const withLegacyFreeTicketRetry = async <
  TPayload extends {
    tickets?: TicketPriceFields[];
    description?: string;
    rules?: string[] | string;
  },
  TResult,
>(
  payload: TPayload,
  run: (next: TPayload) => Promise<TResult>,
): Promise<TResult> => {
  const stamped = stampFreeCreatePayload(payload);
  try {
    return await run(stamped);
  } catch (error) {
    if (!payloadHasFreeTicket(payload.tickets) || !isLegacyFreePriceRejection(error)) {
      throw error;
    }
    return run({
      ...stamped,
      tickets: bumpFreeTicketPrices(stamped.tickets || []),
    });
  }
};

export const StronManagedService = {
  async createMarathon(payload: CreateMarathonPayload): Promise<StronEvent> {
    try {
      return await withLegacyFreeTicketRetry(payload, async (next) => {
        const { data } = await apiClient.post<StronEventResponse>(
          "/api/stron/events/marathon",
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to create marathon draft.");
        }
        invalidateCatalogCache();
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async createStepChallenge(payload: CreateStepChallengePayload): Promise<StronEvent> {
    try {
      return await withLegacyFreeTicketRetry(payload, async (next) => {
        const { data } = await apiClient.post<StronEventResponse>(
          "/api/stron/events/step-challenge",
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to create step challenge draft.");
        }
        invalidateCatalogCache();
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async createKingOfTheHill(payload: CreateDuelPayload): Promise<StronEvent> {
    try {
      return await withLegacyFreeTicketRetry(payload, async (next) => {
        const { data } = await apiClient.post<StronEventResponse>(
          "/api/stron/events/king-of-the-hill",
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to create King of the Hill draft.");
        }
        invalidateCatalogCache();
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async createFaceOff(payload: CreateDuelPayload): Promise<StronEvent> {
    try {
      return await withLegacyFreeTicketRetry(payload, async (next) => {
        const { data } = await apiClient.post<StronEventResponse>(
          "/api/stron/events/face-off",
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to create Face Off draft.");
        }
        invalidateCatalogCache();
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async publishEvent(key: string): Promise<StronEvent> {
    try {
      const { data } = await apiClient.post<StronEventResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/publish`,
      );
      if (!data?.success || !data.event) {
        throw new Error("Failed to publish event.");
      }
      invalidateCatalogCache();
      return parseStronEvent(data.event);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async cancelEvent(key: string, reason?: string): Promise<StronEvent> {
    try {
      const { data } = await apiClient.post<StronEventResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/cancel`,
        { reason },
      );
      if (!data?.success || !data.event) {
        throw new Error("Failed to cancel event.");
      }
      invalidateCatalogCache();
      return parseStronEvent(data.event);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getEvent(key: string): Promise<StronEvent> {
    try {
      const { data } = await apiClient.get<StronEventResponse>(
        `/api/stron/events/${encodeURIComponent(key)}`,
      );
      if (!data?.success || !data.event) {
        throw new Error("Event not found.");
      }
      return parseStronEvent(data.event);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async deleteEvent(key: string): Promise<void> {
    try {
      await apiClient.delete(`/api/stron/events/${encodeURIComponent(key)}`);
      invalidateCatalogCache();
    } catch (error) {
      throw toApiError(error);
    }
  },

  async upsertOrganizer(payload: UpsertOrganizerPayload) {
    try {
      const { data } = await apiClient.post<StronOrganizerResponse>("/api/stron/organizer", payload);
      return data.organizer;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMyOrganizer() {
    try {
      const { data } = await apiClient.get<StronOrganizerResponse>("/api/stron/organizer/me");
      return data.organizer;
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getEventDashboard(key: string): Promise<StronEventDashboard> {
    try {
      const { data } = await apiClient.get<StronEventDashboardResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/dashboard`,
      );
      if (!data?.success || !data.event) {
        throw new Error("Failed to load event dashboard.");
      }
      return {
        event: data.event,
        ticketSales: data.ticketSales || [],
        totals: data.totals || {},
        recentRegistrations: data.recentRegistrations || [],
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Full/partial event edit for drafts (or title/description/rules/banner for published). */
  async updateEvent(
    key: string,
    patch: {
      title?: string;
      description?: string;
      rules?: string[];
      bannerName?: string | null;
      destination?: string | null;
      virtualLink?: string | null;
      marathonMode?: "virtual" | "in_person";
      startDate?: string | null;
      endDate?: string | null;
      durationDays?: number | null;
      successfulDaysRequired?: number | null;
      registrationStartDate?: string | null;
      registrationEndDate?: string | null;
      rewardLabels?: string[];
      participantInfoFields?: string[];
      tickets?: {
        id?: string;
        price?: number;
        label?: string;
        distanceKm?: number;
        targetSteps?: number;
        days?: number;
        dailyStepTarget?: number;
        benefits?: string;
      }[];
    },
  ): Promise<StronEvent> {
    try {
      return await withLegacyFreeTicketRetry(patch, async (next) => {
        const { data } = await apiClient.patch<StronEventResponse>(
          `/api/stron/events/${encodeURIComponent(key)}`,
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to update event.");
        }
        invalidateCatalogCache();
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Organizer ticket-only edits (price always; label/distance/days/dailyStepTarget while draft). */
  async updateEventTickets(
    key: string,
    tickets: {
      id: string;
      price?: number;
      label?: string;
      distanceKm?: number;
      days?: number;
      dailyStepTarget?: number;
      benefits?: string;
    }[],
    extra?: { successfulDaysRequired?: number },
  ): Promise<StronEvent> {
    try {
      const payload = {
        tickets,
        ...(extra?.successfulDaysRequired != null
          ? { successfulDaysRequired: extra.successfulDaysRequired }
          : {}),
      };
      return await withLegacyFreeTicketRetry(payload, async (next) => {
        const { data } = await apiClient.patch<StronEventResponse>(
          `/api/stron/events/${encodeURIComponent(key)}`,
          next,
        );
        if (!data?.success || !data.event) {
          throw new Error("Failed to update tickets.");
        }
        return parseStronEvent(data.event);
      });
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getCatalog(format?: string): Promise<StronEvent[]> {
    const isForce = format === "force";
    const actualFormat = isForce ? undefined : format;

    // 1. Return warm in-memory cache immediately if format is not filtered and not forced
    if (!isForce && !actualFormat && inMemoryCatalogCache && inMemoryCatalogCache.length > 0) {
      if (Date.now() - lastCatalogFetchTime > CATALOG_CACHE_TTL_MS) {
        void this.revalidateCatalogInBackground();
      }
      return inMemoryCatalogCache;
    }

    // 2. Return persistent storage cache on cold start (unless forced)
    if (!isForce && !actualFormat && !inMemoryCatalogCache) {
      try {
        const stored = await AsyncStorage.getItem(CATALOG_CACHE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as StronEvent[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            inMemoryCatalogCache = parsed;
            void this.revalidateCatalogInBackground();
            return parsed;
          }
        }
      } catch {
        // ignore
      }
    }

    try {
      const { data } = await apiClient.get<StronEventsListResponse>("/api/stron/events/catalog", {
        params: actualFormat ? { format: actualFormat } : undefined,
      });
      if (!data?.success) return [];
      const parsedEvents = (data.events || []).map((e) => parseStronEvent(e));
      if (!actualFormat) {
        inMemoryCatalogCache = parsedEvents;
        lastCatalogFetchTime = Date.now();
        void AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(parsedEvents));
      }
      return parsedEvents;
    } catch (error) {
      if (inMemoryCatalogCache && inMemoryCatalogCache.length > 0) {
        return inMemoryCatalogCache;
      }
      throw toApiError(error);
    }
  },

  async revalidateCatalogInBackground(): Promise<void> {
    try {
      const { data } = await apiClient.get<StronEventsListResponse>("/api/stron/events/catalog");
      if (data?.success && Array.isArray(data.events)) {
        const parsedEvents = data.events.map((e) => parseStronEvent(e));
        if (parsedEvents.length > 0) {
          inMemoryCatalogCache = parsedEvents;
          lastCatalogFetchTime = Date.now();
          void AsyncStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(parsedEvents));
        }
      }
    } catch {
      // silent background revalidation
    }
  },

  /** Official STRON events for Home Feed (Bug 14). */
  async getOfficialHomeFeed(): Promise<StronEvent[]> {
    try {
      const { data } = await apiClient.get<StronEventsListResponse>(
        "/api/stron/events/home-feed-official",
      );
      if (!data?.success) return [];
      return (data.events || []).map((e) => parseStronEvent(e));
    } catch (error) {
      throw toApiError(error);
    }
  },

  async createParticipationOrder(
    key: string,
    ticketTypeId: string,
    currentStepCount?: number,
    extras?: CreateParticipationOrderExtras,
  ): Promise<CreateParticipationOrderResultDto> {
    try {
      const { data } = await apiClient.post<CreateParticipationOrderResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/order`,
        {
          ticketTypeId,
          currentStepCount,
          participantInfo: extras?.participantInfo,
          couponCode: extras?.couponCode || undefined,
        },
      );
      if (!data?.success) {
        throw new Error(data?.message || "Failed to create ticket order.");
      }
      const amountNum = Number(data.amount);
      const claimedFree =
        data.free === true ||
        ((!data.orderId || data.orderId == null) && Number.isFinite(amountNum) && amountNum <= 0);
      if (claimedFree) {
        return {
          free: true,
          orderId: null,
          amount: 0,
          currency: data.currency || "INR",
          key: data.key || "",
          eventKey: data.eventKey || key,
          ticketTypeId: data.ticketTypeId || ticketTypeId,
          breakdown: data.breakdown,
          participation: data.participation || null,
          ticketNumber: data.ticketNumber || null,
          couponCode: data.couponCode || null,
        };
      }
      if (!data.orderId) {
        throw new Error(data?.message || "Failed to create ticket order.");
      }
      return {
        free: false,
        orderId: data.orderId,
        amount: data.amount,
        currency: data.currency,
        key: data.key,
        eventKey: data.eventKey,
        ticketTypeId: data.ticketTypeId,
        breakdown: data.breakdown,
        couponCode: data.couponCode || null,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async validateRegistrationCoupon(
    key: string,
    ticketTypeId: string,
    couponCode: string,
  ): Promise<ValidateRegistrationCouponResultDto> {
    try {
      const { data } = await apiClient.post<ValidateRegistrationCouponResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/validate-coupon`,
        {
          ticketTypeId,
          couponCode,
        },
      );
      if (!data?.success || !data.couponCode) {
        throw new Error(data?.message || "Invalid coupon code.");
      }
      return {
        couponCode: data.couponCode,
        discountRupees: Number(data.discountRupees) || 0,
        discountPercent: Number(data.discountPercent) || 0,
        breakdown: data.breakdown,
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMyParticipation(key: string): Promise<StronParticipation | null> {
    try {
      const { data } = await apiClient.get<StronParticipationResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/my-participation`,
      );
      if (!data?.success || !data.participation) return null;
      return parseStronParticipation(data.participation);
    } catch (error) {
      if (
        isAxiosError(error) &&
        (error.response?.status === 404 || error.response?.status === 403)
      ) {
        return null;
      }
      const apiError = toApiError(error);
      if (
        apiError.code === "participation_not_found" ||
        apiError.message?.toLowerCase().includes("not joined") ||
        apiError.message?.toLowerCase().includes("not found")
      ) {
        return null;
      }
      throw apiError;
    }
  },

  async getProgress(key: string): Promise<StronProgress | null> {
    try {
      const { data } = await apiClient.get<StronProgressResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/progress`,
      );
      if (!data?.success) return null;
      return parseStronProgress(data.progress);
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "participation_not_found") return null;
      throw apiError;
    }
  },

  async getLeaderboard(key: string): Promise<StronLeaderboardEntry[]> {
    try {
      const { data } = await apiClient.get<StronLeaderboardResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/leaderboard`,
      );
      if (!data?.success) return [];
      return parseLeaderboard(data.leaderboard);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMatches(key: string, myUid?: string | null): Promise<StronKotHMatch[]> {
    try {
      const { data } = await apiClient.get<StronMatchesResponse>(
        `/api/stron/events/${encodeURIComponent(key)}/matches`,
      );
      if (!data?.success) return [];
      return parseKotHMatches(data.matches, myUid);
    } catch (error) {
      throw toApiError(error);
    }
  },

  /** Latest participantInfo from a previous registration (checkout prefill). */
  async getMyParticipantInfoPrefill(): Promise<ParticipantInfoPrefillItem[]> {
    try {
      const { data } = await apiClient.get<ParticipantInfoPrefillResponse>(
        "/api/stron/events/my-participant-info-prefill",
      );
      if (!data?.success) return [];
      return (data.participantInfo || [])
        .map((row) => ({
          field: String(row.field || "").trim(),
          value: String(row.value || "").trim(),
        }))
        .filter((row) => row.field && row.value);
    } catch {
      return [];
    }
  },

  async getMyActivity(): Promise<MyActivityDto[]> {
    try {
      const { data } = await apiClient.get<MyActivityResponse>("/api/stron/events/my-activity");
      if (!data?.success) return [];
      return data.activity || [];
    } catch (error) {
      if (error instanceof Error && error.message.includes("Authentication required")) {
        return [];
      }
      throw toApiError(error);
    }
  },

  async getSettlement(eventKey: string): Promise<StronSettlement> {
    try {
      const { data } = await apiClient.get<StronSettlementResponse>(
        `/api/stron/settlements/${encodeURIComponent(eventKey)}`,
      );
      if (!data?.success || !data.settlement) {
        throw new Error("Could not load settlement.");
      }
      return parseStronSettlement(data.settlement);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async initSettlement(eventKey: string): Promise<StronSettlement> {
    try {
      const { data } = await apiClient.post<StronSettlementResponse>(
        `/api/stron/settlements/${encodeURIComponent(eventKey)}`,
      );
      if (!data?.success || !data.settlement) {
        throw new Error("Could not request payout.");
      }
      return parseStronSettlement(data.settlement);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async releaseSettlement(eventKey: string, reference?: string): Promise<StronSettlement> {
    try {
      const { data } = await apiClient.post<StronSettlementResponse>(
        `/api/stron/settlements/${encodeURIComponent(eventKey)}/release`,
        {
          ...(reference ? { reference } : {}),
        },
      );
      if (!data?.success || !data.settlement) {
        throw new Error("Could not release settlement.");
      }
      return parseStronSettlement(data.settlement);
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMyOrganizerEvents(): Promise<StronEvent[]> {
    try {
      const { data } = await apiClient.get<StronEventsListResponse>("/api/stron/events/mine");
      if (!data?.success) return [];
      return (data.events || []).map((e) => parseStronEvent(e));
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getMyRewards(): Promise<{
    rewards: StronReward[];
    badges: StronRewardBadges;
  }> {
    try {
      const { data } = await apiClient.get<StronMyRewardsResponse>("/api/stron/rewards");
      if (!data?.success) {
        return {
          rewards: [],
          badges: {
            gold: 0,
            silver: 0,
            bronze: 0,
            bounceBack: 0,
            closeCall: 0,
            knockout: 0,
          },
        };
      }
      return {
        rewards: (data.rewards || []).map((r) => parseStronReward(r)),
        badges: data.badges || {
          gold: 0,
          silver: 0,
          bronze: 0,
          bounceBack: 0,
          closeCall: 0,
          knockout: 0,
        },
      };
    } catch (error) {
      throw toApiError(error);
    }
  },

  async getRewardPreviews(): Promise<StronReward[]> {
    try {
      const { data } = await apiClient.get<StronRewardPreviewsResponse>(
        "/api/stron/rewards/previews",
      );
      if (!data?.success) return [];
      return (data.rewards || []).map((r) => parseStronReward(r));
    } catch (error) {
      throw toApiError(error);
    }
  },

  invalidateCatalogCache,
};

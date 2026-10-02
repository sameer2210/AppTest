import { apiClient } from "../core/apiClient.service";
import { captureEvent } from "@/analytics/posthog/events";
import type {
  ExploreCity,
  ExploreItem,
  ExplorePagination,
  ExploreQueryParams,
} from "@/models/explore";

const parseExploreItem = (raw: Record<string, unknown>): ExploreItem => ({
  id: String(raw.id ?? ""),
  entityType: (raw.entityType as ExploreItem["entityType"]) ?? "activity",
  title: String(raw.title ?? ""),
  imageUrl: raw.imageUrl ? String(raw.imageUrl) : null,
  city: raw.city ? String(raw.city) : null,
  category: raw.category ? String(raw.category) : null,
  eventType: raw.eventType ? String(raw.eventType) : null,
  priceType: raw.priceType === "paid" ? "paid" : "free",
  price: Number(raw.price) || 0,
  rating: Number(raw.rating) || 0,
  clubName: raw.clubName ? String(raw.clubName) : null,
  date: raw.date ? String(raw.date) : null,
  venue: raw.venue ? String(raw.venue) : null,
  distance: raw.distance != null ? Number(raw.distance) : null,
  formattedDistance: raw.formattedDistance ? String(raw.formattedDistance) : null,
  coordinates:
    raw.coordinates && typeof raw.coordinates === "object"
      ? {
          latitude: Number((raw.coordinates as Record<string, unknown>).latitude),
          longitude: Number((raw.coordinates as Record<string, unknown>).longitude),
        }
      : null,
  popularityScore: Number(raw.popularityScore) || 0,
  isBookmarked: raw.isBookmarked === true,
});

const parseCity = (raw: Record<string, unknown>): ExploreCity => ({
  id: String(raw.id ?? raw.name ?? ""),
  name: String(raw.name ?? ""),
  state: raw.state ? String(raw.state) : null,
  country: raw.country ? String(raw.country) : null,
  latitude: Number(raw.latitude),
  longitude: Number(raw.longitude),
  label: String(raw.label ?? raw.name ?? ""),
});

export const ExploreService = {
  async searchCities(q: string, limit = 15): Promise<ExploreCity[]> {
    const { data } = await apiClient.get<{ cities?: Record<string, unknown>[] }>(
      "/api/explore/cities",
      { params: { q, limit } },
    );
    return (data.cities ?? []).map((c) => parseCity(c));
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<ExploreCity> {
    const { data } = await apiClient.get<{ city?: Record<string, unknown> }>(
      "/api/explore/reverse-geocode",
      { params: { latitude, longitude } },
    );
    if (!data.city) {
      throw new Error("Reverse geocoding failed.");
    }
    return parseCity(data.city);
  },

  async fetchResults(params: ExploreQueryParams): Promise<{
    items: ExploreItem[];
    pagination: ExplorePagination;
    message: string | null;
  }> {
    const { data } = await apiClient.get<Record<string, unknown>>("/api/explore", {
      params,
    });
    const items = ((data.items as Record<string, unknown>[] | undefined) ?? []).map(
      parseExploreItem,
    );
    return {
      items,
      pagination: {
        page: Number(data.page) || 1,
        limit: Number(data.limit) || 20,
        total: Number(data.total) || 0,
        hasMore: data.hasMore === true,
      },
      message: data.message ? String(data.message) : null,
    };
  },

  async toggleBookmark(
    entityType: ExploreItem["entityType"],
    entityId: string,
    bookmarked: boolean,
  ) {
    if (bookmarked) {
      await apiClient.delete(`/api/explore/bookmarks/${entityType}/${entityId}`);
    } else {
      await apiClient.post("/api/explore/bookmarks", { entityType, entityId });
    }
    captureEvent("bookmark_toggled", {
      entity_type: entityType,
      entity_id: entityId,
      added: !bookmarked,
    });
  },
};

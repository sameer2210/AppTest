export type ExploreEntityType = "event" | "activity";

export type ExploreSort = "nearest" | "popular" | "recent" | "upcoming" | "rating";

export type LocationPermissionStatus = "never_asked" | "granted" | "denied" | "blocked";

export type ExploreLocationMode = "gps" | "city";

export interface ExploreCoordinates {
  latitude: number;
  longitude: number;
}

export interface ExploreCity {
  id: string;
  name: string;
  state?: string | null;
  country?: string | null;
  /** Omit when city is known by name only (e.g. profile sync) until user picks a location. */
  latitude?: number;
  longitude?: number;
  label: string;
}

export interface ExploreFilters {
  category: string | null;
  eventType: string | null;
  date: string | null;
  priceType: "free" | "paid" | null;
  minRating: number | null;
}

export interface ExploreItem {
  id: string;
  entityType: ExploreEntityType;
  title: string;
  imageUrl: string | null;
  city: string | null;
  category: string | null;
  eventType: string | null;
  priceType: "free" | "paid";
  price: number;
  rating: number;
  clubName: string | null;
  date: string | null;
  venue: string | null;
  distance: number | null;
  formattedDistance: string | null;
  coordinates: ExploreCoordinates | null;
  popularityScore: number;
  isBookmarked: boolean;
}

export interface ExplorePagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface ExploreQueryParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
  city?: string;
  category?: string;
  eventType?: string;
  date?: string;
  priceType?: string;
  sort?: ExploreSort;
  search?: string;
  page?: number;
  limit?: number;
}

export const EXPLORE_RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

export const EXPLORE_SORT_OPTIONS: { value: ExploreSort; label: string }[] = [
  { value: "nearest", label: "Nearest" },
  { value: "popular", label: "Popular" },
  { value: "recent", label: "Recent" },
  { value: "upcoming", label: "Upcoming" },
  { value: "rating", label: "Rating" },
];

export const DEFAULT_EXPLORE_CITY: ExploreCity = {
  id: "indore",
  name: "Indore",
  state: "Madhya Pradesh",
  country: "IN",
  latitude: 22.7196,
  longitude: 75.8577,
  label: "Indore, Madhya Pradesh, India",
};

export const DEFAULT_EXPLORE_FILTERS: ExploreFilters = {
  category: null,
  eventType: null,
  date: null,
  priceType: null,
  minRating: null,
};

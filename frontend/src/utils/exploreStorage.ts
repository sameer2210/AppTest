import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  ExploreCity,
  ExploreFilters,
  ExploreItem,
  ExploreLocationMode,
  ExploreSort,
} from "../models/explore";

const LAST_LOCATION_KEY = "stron_explore_last_location";
const LAST_CITY_KEY = "stron_explore_last_city";
const RECENT_CITIES_KEY = "stron_explore_recent_cities";
const FILTERS_KEY = "stron_explore_filters";
const RESULTS_CACHE_KEY = "stron_explore_results_cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Plain copies safe for JSON.stringify (Redux/Immer proxies cannot be stringified). */
const toPlainCity = (city: ExploreCity): ExploreCity => ({
  id: String(city.id),
  name: String(city.name),
  state: city.state ?? null,
  country: city.country ?? null,
  ...(typeof city.latitude === "number" && Number.isFinite(city.latitude)
    ? { latitude: Number(city.latitude) }
    : {}),
  ...(typeof city.longitude === "number" && Number.isFinite(city.longitude)
    ? { longitude: Number(city.longitude) }
    : {}),
  label: String(city.label),
});

const toPlainFilters = (filters: ExploreFilters): ExploreFilters => ({
  category: filters.category ?? null,
  eventType: filters.eventType ?? null,
  date: filters.date ?? null,
  priceType: filters.priceType ?? null,
  minRating: filters.minRating ?? null,
});

const toPlainCoords = (coords: { latitude: number; longitude: number }) => ({
  latitude: Number(coords.latitude),
  longitude: Number(coords.longitude),
});

const toPlainExploreItem = (item: ExploreItem): ExploreItem => ({
  id: String(item.id),
  entityType: item.entityType,
  title: String(item.title),
  imageUrl: item.imageUrl ?? null,
  city: item.city ?? null,
  category: item.category ?? null,
  eventType: item.eventType ?? null,
  priceType: item.priceType,
  price: Number(item.price),
  rating: Number(item.rating),
  clubName: item.clubName ?? null,
  date: item.date ?? null,
  venue: item.venue ?? null,
  distance: item.distance ?? null,
  formattedDistance: item.formattedDistance ?? null,
  coordinates: item.coordinates
    ? { latitude: Number(item.coordinates.latitude), longitude: Number(item.coordinates.longitude) }
    : null,
  popularityScore: Number(item.popularityScore),
  isBookmarked: Boolean(item.isBookmarked),
});

export type StoredExplorePreferences = {
  mode: ExploreLocationMode;
  coordinates: { latitude: number; longitude: number } | null;
  selectedCity: ExploreCity | null;
  radiusKm: number;
  filters: ExploreFilters;
  sort: ExploreSort;
};

export const saveLastLocation = async (coords: { latitude: number; longitude: number }) => {
  await AsyncStorage.setItem(LAST_LOCATION_KEY, JSON.stringify({ ...coords, savedAt: Date.now() }));
};

export const loadLastLocation = async (): Promise<{
  latitude: number;
  longitude: number;
} | null> => {
  const raw = await AsyncStorage.getItem(LAST_LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { latitude: number; longitude: number };
    if (Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
      return { latitude: parsed.latitude, longitude: parsed.longitude };
    }
  } catch {
    return null;
  }
  return null;
};

export const saveLastCity = async (city: ExploreCity) => {
  await AsyncStorage.setItem(LAST_CITY_KEY, JSON.stringify(toPlainCity(city)));
};

export const loadLastCity = async (): Promise<ExploreCity | null> => {
  const raw = await AsyncStorage.getItem(LAST_CITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ExploreCity;
  } catch {
    return null;
  }
};

export const addRecentCity = async (city: ExploreCity) => {
  const plain = toPlainCity(city);
  const existing = await loadRecentCities();
  const filtered = existing.filter((c) => c.id !== plain.id && c.name !== plain.name);
  const next = [plain, ...filtered].slice(0, 10);
  await AsyncStorage.setItem(RECENT_CITIES_KEY, JSON.stringify(next));
  return next;
};

export const loadRecentCities = async (): Promise<ExploreCity[]> => {
  const raw = await AsyncStorage.getItem(RECENT_CITIES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as ExploreCity[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveExplorePreferences = async (prefs: StoredExplorePreferences) => {
  try {
    await AsyncStorage.setItem(
      FILTERS_KEY,
      JSON.stringify({
        mode: prefs.mode,
        radiusKm: prefs.radiusKm,
        filters: toPlainFilters(prefs.filters),
        sort: prefs.sort,
      }),
    );
    if (prefs.selectedCity) await saveLastCity(prefs.selectedCity);
    if (prefs.coordinates) await saveLastLocation(toPlainCoords(prefs.coordinates));
  } catch (error) {
    console.warn("[exploreStorage] Failed to save preferences:", error);
  }
};

export const loadExplorePreferences = async (): Promise<Partial<StoredExplorePreferences>> => {
  const [filtersRaw, city, coords] = await Promise.all([
    AsyncStorage.getItem(FILTERS_KEY),
    loadLastCity(),
    loadLastLocation(),
  ]);
  let radiusKm = 10;
  let filters = {
    category: null,
    eventType: null,
    date: null,
    priceType: null,
    minRating: null,
  } as ExploreFilters;
  let sort: ExploreSort = "nearest";
  let mode: ExploreLocationMode = city ? "city" : coords ? "gps" : "city";

  if (filtersRaw) {
    try {
      const parsed = JSON.parse(filtersRaw) as Partial<StoredExplorePreferences>;
      if (parsed.radiusKm) radiusKm = parsed.radiusKm;
      if (parsed.filters) filters = parsed.filters;
      if (parsed.sort) sort = parsed.sort;
      if (parsed.mode) mode = parsed.mode;
    } catch {
      // ignore
    }
  }

  if (!city && !coords) {
    return {
      mode: "city",
      coordinates: null,
      selectedCity: null,
      radiusKm,
      filters,
      sort,
    };
  }

  return {
    mode,
    coordinates: coords,
    selectedCity: city,
    radiusKm,
    filters,
    sort,
  };
};

export const cacheExploreResults = async (cacheKey: string, items: ExploreItem[]) => {
  await AsyncStorage.setItem(
    RESULTS_CACHE_KEY,
    JSON.stringify({ cacheKey, items: items.map(toPlainExploreItem), savedAt: Date.now() }),
  );
};

export const loadCachedExploreResults = async (cacheKey: string): Promise<ExploreItem[] | null> => {
  const raw = await AsyncStorage.getItem(RESULTS_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as {
      cacheKey: string;
      items: ExploreItem[];
      savedAt: number;
    };
    if (parsed.cacheKey !== cacheKey) return null;
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.items;
  } catch {
    return null;
  }
};

export const buildExploreCacheKey = (params: Record<string, unknown>) => JSON.stringify(params);

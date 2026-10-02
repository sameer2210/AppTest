import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/store/store";
import type {
  ExploreCity,
  ExploreFilters,
  ExploreItem,
  ExploreLocationMode,
  ExplorePagination,
  ExploreSort,
  LocationPermissionStatus,
} from "@/models/explore";
import { DEFAULT_EXPLORE_FILTERS } from "@/models/explore";
import { ExploreApi } from "../api/explore.api";
import {
  addRecentCity,
  buildExploreCacheKey,
  cacheExploreResults,
  loadCachedExploreResults,
  loadExplorePreferences,
  loadRecentCities,
  saveExplorePreferences,
  saveLastLocation,
} from "@/utils/exploreStorage";

export interface ExploreState {
  mode: ExploreLocationMode;
  coordinates: { latitude: number; longitude: number } | null;
  selectedCity: ExploreCity | null;
  radiusKm: number;
  filters: ExploreFilters;
  exploreCategory: string;
  sort: ExploreSort;
  searchQuery: string;
  results: ExploreItem[];
  pagination: ExplorePagination;
  recentCities: ExploreCity[];
  permissionStatus: LocationPermissionStatus;
  isLoadingLocation: boolean;
  isLoadingResults: boolean;
  error: string | null;
  message: string | null;
  hydrated: boolean;
  locationInitialized: boolean;
}

const initialState: ExploreState = {
  mode: "city",
  coordinates: null,
  selectedCity: null,
  radiusKm: 10,
  filters: DEFAULT_EXPLORE_FILTERS,
  exploreCategory: "All",
  sort: "nearest",
  searchQuery: "",
  results: [],
  pagination: { page: 1, limit: 20, total: 0, hasMore: false },
  recentCities: [],
  permissionStatus: "never_asked",
  isLoadingLocation: false,
  isLoadingResults: false,
  error: null,
  message: null,
  hydrated: false,
  locationInitialized: false,
};

const buildQueryParams = (state: ExploreState, page = 1) => {
  const params: Record<string, string | number> = {
    radius: state.radiusKm,
    sort: state.sort,
    page,
    limit: state.pagination.limit,
  };

  const lat =
    state.mode === "gps"
      ? state.coordinates?.latitude
      : (state.selectedCity?.latitude ?? state.coordinates?.latitude);
  const lng =
    state.mode === "gps"
      ? state.coordinates?.longitude
      : (state.selectedCity?.longitude ?? state.coordinates?.longitude);

  if (lat != null && lng != null) {
    params.latitude = lat;
    params.longitude = lng;
  }

  if (state.mode === "city" && state.selectedCity?.name) {
    params.city = state.selectedCity.name;
  }

  if (state.filters.category) params.category = state.filters.category;
  if (state.filters.eventType) params.eventType = state.filters.eventType;
  if (state.filters.date) params.date = state.filters.date;
  if (state.filters.priceType) params.priceType = state.filters.priceType;
  if (state.searchQuery.trim()) params.search = state.searchQuery.trim();
  return params;
};

const mapLocationError = (error: unknown): string => {
  if (!(error instanceof Error)) return "Unable to get your location. Please try again.";
  switch (error.message) {
    case "LOCATION_SERVICES_DISABLED":
      return "Location services are turned off. Enable GPS or search for a city.";
    case "LOCATION_TIMEOUT":
      return "Location request timed out. Try again or search for a city.";
    default:
      return "Unable to get your location. Please try again.";
  }
};

const resolveGpsLocation = async () => {
  const permissionStatus = await ExploreApi.ensurePermission();
  if (permissionStatus !== "granted") {
    const message =
      permissionStatus === "blocked"
        ? "Location permission is blocked. Open settings to enable."
        : "Location permission denied. Search for a city instead.";
    throw Object.assign(new Error(message), { permissionStatus });
  }

  const coords = await ExploreApi.getCurrentPosition();
  let city: ExploreCity | null = null;
  try {
    city = await ExploreApi.reverseGeocode(coords.latitude, coords.longitude);
    if (city?.name) {
      await addRecentCity(city);
    }
  } catch {
    city = null;
  }

  await saveLastLocation({ latitude: coords.latitude, longitude: coords.longitude });

  return { coords, city, permissionStatus };
};

export const hydrateExplorePreferences = createAsyncThunk("explore/hydrate", async () => {
  const [prefs, recentCities, permissionStatus] = await Promise.all([
    loadExplorePreferences(),
    loadRecentCities(),
    ExploreApi.getPermissionStatus(),
  ]);
  return { prefs, recentCities, permissionStatus };
});

export const initializeExploreLocation = createAsyncThunk(
  "explore/initializeLocation",
  async (options: { requestPermission?: boolean } | undefined, { rejectWithValue }) => {
    try {
      let permissionStatus = await ExploreApi.getPermissionStatus();
      if (
        options?.requestPermission &&
        (permissionStatus === "never_asked" || permissionStatus === "denied")
      ) {
        permissionStatus = await ExploreApi.requestPermission();
      }
      if (permissionStatus !== "granted") {
        return { permissionStatus, skipped: true as const };
      }
      const result = await resolveGpsLocation();
      return { ...result, skipped: false as const };
    } catch (error) {
      const err = error as Error & { permissionStatus?: LocationPermissionStatus };
      if (err.permissionStatus) {
        return rejectWithValue({
          message: err.message,
          permissionStatus: err.permissionStatus,
        });
      }
      return rejectWithValue({
        message: mapLocationError(error),
        permissionStatus: await ExploreApi.getPermissionStatus(),
      });
    }
  },
);

export const resolveCurrentLocation = createAsyncThunk(
  "explore/resolveCurrentLocation",
  async (_, { rejectWithValue }) => {
    try {
      const result = await resolveGpsLocation();
      return result;
    } catch (error) {
      const err = error as Error & { permissionStatus?: LocationPermissionStatus };
      if (err.permissionStatus) {
        return rejectWithValue({
          message: err.message,
          permissionStatus: err.permissionStatus,
        });
      }
      return rejectWithValue({
        message: mapLocationError(error),
        permissionStatus: await ExploreApi.getPermissionStatus(),
      });
    }
  },
);

export const fetchExploreResults = createAsyncThunk(
  "explore/fetchResults",
  async (options: { page?: number; append?: boolean } | undefined, { getState }) => {
    const state = getState() as RootState;
    const explore = state.explore;
    const page = options?.page ?? 1;
    const params = buildQueryParams(explore, page);
    const cacheKey = buildExploreCacheKey(params);

    if (page === 1 && !options?.append) {
      const cached = await loadCachedExploreResults(cacheKey);
      if (cached) {
        return {
          items: cached,
          pagination: { ...explore.pagination, page: 1 },
          message: null,
          fromCache: true,
          append: false,
          page: 1,
        };
      }
    }

    const response = await ExploreApi.fetchResults(params);
    if (page === 1) {
      await cacheExploreResults(cacheKey, response.items);
    }
    return { ...response, fromCache: false, append: options?.append ?? false, page };
  },
);

export const searchExploreCities = createAsyncThunk("explore/searchCities", async (q: string) =>
  ExploreApi.searchCities(q),
);

export const toggleExploreBookmark = createAsyncThunk(
  "explore/toggleBookmark",
  async (item: ExploreItem) => {
    await ExploreApi.toggleBookmark(item.entityType, item.id, item.isBookmarked);
    return { id: item.id, entityType: item.entityType };
  },
);

const applyGpsPayload = (
  state: ExploreState,
  payload: {
    coords: { latitude: number; longitude: number };
    city: ExploreCity | null;
    permissionStatus: LocationPermissionStatus;
  },
) => {
  state.mode = "gps";
  state.coordinates = {
    latitude: payload.coords.latitude,
    longitude: payload.coords.longitude,
  };
  state.selectedCity = payload.city;
  state.permissionStatus = payload.permissionStatus;
  state.isLoadingLocation = false;
  state.locationInitialized = true;
  if (payload.city) {
    state.sort = state.sort === "popular" ? "nearest" : state.sort;
  }
};

const exploreSlice = createSlice({
  name: "explore",
  initialState,
  reducers: {
    setSelectedCity(state, action: PayloadAction<ExploreCity | null>) {
      const city = action.payload;
      state.selectedCity = city;
      state.mode = city ? "city" : state.mode;
      if (
        city &&
        typeof city.latitude === "number" &&
        typeof city.longitude === "number" &&
        Number.isFinite(city.latitude) &&
        Number.isFinite(city.longitude)
      ) {
        state.coordinates = { latitude: city.latitude, longitude: city.longitude };
        state.sort = state.sort === "popular" && state.mode === "city" ? "nearest" : state.sort;
      }
      state.error = null;
    },
    setRadiusKm(state, action: PayloadAction<number>) {
      state.radiusKm = action.payload;
    },
    setExploreFilters(state, action: PayloadAction<ExploreFilters>) {
      state.filters = action.payload;
    },
    setExploreSort(state, action: PayloadAction<ExploreSort>) {
      state.sort = action.payload;
    },
    setSearchQuery(state, action: PayloadAction<string>) {
      state.searchQuery = action.payload;
    },
    setExploreCategory(state, action: PayloadAction<string>) {
      state.exploreCategory = action.payload;
    },
    resetExploreFilters(state) {
      state.filters = DEFAULT_EXPLORE_FILTERS;
    },
    clearExploreError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateExplorePreferences.fulfilled, (state, action) => {
        const { prefs, recentCities, permissionStatus } = action.payload;
        if (prefs.mode) state.mode = prefs.mode;
        if (prefs.coordinates) state.coordinates = prefs.coordinates;
        if (prefs.selectedCity) state.selectedCity = prefs.selectedCity;
        if (prefs.radiusKm) state.radiusKm = prefs.radiusKm;
        if (prefs.filters) state.filters = prefs.filters;
        if (prefs.sort) state.sort = prefs.sort;
        state.recentCities = recentCities;
        state.permissionStatus = permissionStatus;
        state.hydrated = true;
      })
      .addCase(initializeExploreLocation.pending, (state) => {
        state.isLoadingLocation = true;
        state.error = null;
      })
      .addCase(initializeExploreLocation.fulfilled, (state, action) => {
        state.isLoadingLocation = false;
        state.permissionStatus = action.payload.permissionStatus;
        state.locationInitialized = true;
        if (!action.payload.skipped && action.payload.coords) {
          applyGpsPayload(state, {
            coords: action.payload.coords,
            city: action.payload.city ?? null,
            permissionStatus: action.payload.permissionStatus,
          });
        }
      })
      .addCase(initializeExploreLocation.rejected, (state, action) => {
        state.isLoadingLocation = false;
        state.locationInitialized = true;
        const payload = action.payload as {
          message?: string;
          permissionStatus?: LocationPermissionStatus;
        };
        state.error = payload?.message || "Unable to get your location.";
        if (payload?.permissionStatus) state.permissionStatus = payload.permissionStatus;
      })
      .addCase(resolveCurrentLocation.pending, (state) => {
        state.isLoadingLocation = true;
        state.error = null;
      })
      .addCase(resolveCurrentLocation.fulfilled, (state, action) => {
        applyGpsPayload(state, action.payload);
      })
      .addCase(resolveCurrentLocation.rejected, (state, action) => {
        state.isLoadingLocation = false;
        const payload = action.payload as {
          message?: string;
          permissionStatus?: LocationPermissionStatus;
        };
        state.error = payload?.message || "Unable to get your location.";
        if (payload?.permissionStatus) state.permissionStatus = payload.permissionStatus;
      })
      .addCase(fetchExploreResults.pending, (state) => {
        state.isLoadingResults = true;
        state.error = null;
      })
      .addCase(fetchExploreResults.fulfilled, (state, action) => {
        state.isLoadingResults = false;
        const { items, pagination, message, append, page } = action.payload;
        state.results = append ? [...state.results, ...items] : items;
        state.pagination = {
          ...pagination,
          page: page ?? pagination.page,
        };
        state.message = message;
        void saveExplorePreferences({
          mode: state.mode,
          coordinates: state.coordinates,
          selectedCity: state.selectedCity,
          radiusKm: state.radiusKm,
          filters: state.filters,
          sort: state.sort,
        });
      })
      .addCase(fetchExploreResults.rejected, (state, action) => {
        state.isLoadingResults = false;
        state.error = action.error.message || "Failed to load explore results.";
      })
      .addCase(toggleExploreBookmark.fulfilled, (state, action) => {
        const { id } = action.payload;
        const item = state.results.find((r) => r.id === id);
        if (item) item.isBookmarked = !item.isBookmarked;
      });
  },
});

export const {
  setSelectedCity,
  setRadiusKm,
  setExploreFilters,
  setExploreSort,
  setSearchQuery,
  setExploreCategory,
  resetExploreFilters,
  clearExploreError,
} = exploreSlice.actions;

export default exploreSlice.reducer;

export { addRecentCity };

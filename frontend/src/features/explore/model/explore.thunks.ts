import { createAsyncThunk } from "@reduxjs/toolkit";
import type { LocationSuggestion } from "@/features/core";
import { ExploreApi } from "../api/explore.api";

export const searchLocationSuggestions = createAsyncThunk(
  "explore/searchLocationSuggestions",
  async (q: string) => ExploreApi.searchLocations(q),
);

export const loadLocationPickerSuggestions = createAsyncThunk(
  "explore/loadLocationPickerSuggestions",
  async () => {
    let near: { latitude: number; longitude: number } | null = null;
    try {
      near = await ExploreApi.getCurrentPosition();
    } catch {
      near = null;
    }
    const popular = await ExploreApi.getPopularCities(12, near);
    return popular;
  },
);

export const resolveGpsLocationSuggestion = createAsyncThunk<
  LocationSuggestion,
  void,
  { rejectValue: { permission?: string; message: string } }
>("explore/resolveGpsLocationSuggestion", async (_, { rejectWithValue }) => {
  try {
    const permission = await ExploreApi.ensurePermission();
    if (permission !== "granted") {
      if (permission === "blocked") {
        await ExploreApi.openLocationSettings();
      }
      return rejectWithValue({
        permission,
        message: "Location permission is required.",
      });
    }

    const position = await ExploreApi.getCurrentPosition({ forceFresh: true });
    return await ExploreApi.reverseGeocodeSuggestion(position.latitude, position.longitude);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "LOCATION_SERVICES_DISABLED"
        ? "Turn on location services and try again."
        : "Could not get current location.";
    return rejectWithValue({ message });
  }
});

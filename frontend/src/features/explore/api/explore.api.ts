/**
 * Explore domain API facade — feature model/thunks call this, not legacy services directly.
 */
import { LocationService } from "@/services/core/location.service";
import { LocationSearchService } from "@/services/core/locationSearch.service";
import { ExploreService } from "@/services/explore/explore.service";

export const ExploreApi = {
  searchCities: ExploreService.searchCities,
  reverseGeocode: ExploreService.reverseGeocode,
  fetchResults: ExploreService.fetchResults,
  toggleBookmark: ExploreService.toggleBookmark,

  ensurePermission: () => LocationService.ensurePermission(),
  getPermissionStatus: () => LocationService.getPermissionStatus(),
  requestPermission: () => LocationService.requestPermission(),
  getCurrentPosition: (options?: Parameters<typeof LocationService.getCurrentPosition>[0]) =>
    LocationService.getCurrentPosition(options),
  openLocationSettings: () => LocationService.openSettings(),

  searchLocations: (q: string) => LocationSearchService.search(q),
  getPopularCities: (limit?: number, near?: { latitude: number; longitude: number } | null) =>
    LocationSearchService.getPopularCities(limit, near),
  reverseGeocodeSuggestion: (latitude: number, longitude: number) =>
    LocationSearchService.reverse(latitude, longitude),
};

export default ExploreApi;

/** Public API — external consumers import only from here. */
export { default as exploreReducer } from "./model/explore.slice";

export {
  hydrateExplorePreferences,
  initializeExploreLocation,
  resolveCurrentLocation,
  fetchExploreResults,
  searchExploreCities,
  toggleExploreBookmark,
  setSelectedCity,
  setRadiusKm,
  setExploreFilters,
  setExploreSort,
  setSearchQuery,
  setExploreCategory,
  resetExploreFilters,
  clearExploreError,
  addRecentCity,
} from "./model/explore.slice";

export type { ExploreState } from "./model/explore.slice";
export type { LocationSuggestion } from "../core";

export {
  selectExploreState,
  selectExploreResults,
  selectSelectedExploreCity,
  selectExploreLocationLabel,
} from "./model/explore.selectors";

export {
  searchLocationSuggestions,
  loadLocationPickerSuggestions,
  resolveGpsLocationSuggestion,
} from "./model/explore.thunks";
export { default as LocationPickerModal } from "./ui/components/LocationPickerModal";
export {
  EXPLORE_NOTCH_SEARCH_GAP,
  EXPLORE_SEARCH_BAR_HEIGHT,
  getExploreStickySearchPaddingTop,
  getExploreStickySearchContentOffset,
} from "./ui/exploreLayout";
export { ExploreScreen, SearchResultsScreen, FeaturedScreen } from "./ui/screens";

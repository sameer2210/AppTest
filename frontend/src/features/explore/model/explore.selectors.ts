import type { RootState } from "@/store/store";

export const selectExploreState = (state: RootState) => state.explore;
export const selectExploreResults = (state: RootState) => state.explore.results;
export const selectSelectedExploreCity = (state: RootState) => state.explore.selectedCity;

export const selectExploreLocationLabel = (state: RootState) => {
  const { mode, selectedCity } = state.explore;
  if (selectedCity?.label) return selectedCity.label;
  if (selectedCity?.name) {
    return [selectedCity.name, selectedCity.state].filter(Boolean).join(", ");
  }
  if (mode === "gps") return "Current Location";
  return "Select location";
};

/**
 * Format distance for Explore cards.
 */
export const formatDistance = (meters: number | null | undefined): string | null => {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) {
    return `${Math.round(meters)} m away`;
  }
  const km = Math.round((meters / 1000) * 10) / 10;
  return `${km} km away`;
};

export const metersFromExploreDistance = (
  distance: number | null,
  unit?: "m" | "km",
): number | null => {
  if (distance == null) return null;
  if (unit === "km") return distance * 1000;
  return distance;
};

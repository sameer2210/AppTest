/**
 * Open location search (no API key):
 * - Nominatim (OpenStreetMap) scoped to India
 * - Photon (Komoot) fallback with India bbox
 * - OpenDataSoft GeoNames for dynamic popular India cities
 */

export type LocationSuggestion = {
  id: string;
  label: string;
  name: string;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude: number;
  longitude: number;
};

type PhotonFeature = {
  geometry?: { coordinates?: number[] };
  properties?: {
    osm_id?: number | string;
    osm_type?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    town?: string;
    village?: string;
    locality?: string;
    district?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
};

const USER_AGENT = "StronApp/1.0 (contact@stron.in)";
/** Bias results toward India for STRON audience. */
const INDIA_BIAS = { lat: 22.5, lon: 79.0 };

const OPENDATASOFT_CITIES_URL =
  "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/geonames-all-cities-with-a-population-1000/records";

let popularCitiesCache: { fetchedAt: number; cities: LocationSuggestion[] } | null = null;
const POPULAR_CACHE_TTL_MS = 60 * 60 * 1000;

const haversineKm = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const buildLabel = (props: NonNullable<PhotonFeature["properties"]>): string => {
  const name =
    props.name ||
    [props.housenumber, props.street].filter(Boolean).join(" ") ||
    props.city ||
    props.town ||
    props.village ||
    props.locality ||
    "Unknown";

  const parts = [
    name,
    props.city && props.city !== name ? props.city : null,
    props.town && props.town !== name && props.town !== props.city ? props.town : null,
    props.state && props.state !== name ? props.state : null,
    props.country && props.country !== name ? props.country : null,
  ].filter(Boolean) as string[];

  return [...new Set(parts)].join(", ");
};

const mapFeature = (feature: PhotonFeature, index: number): LocationSuggestion | null => {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties;
  if (!props || !coords || coords.length < 2) return null;

  const longitude = coords[0];
  const latitude = coords[1];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const name =
    props.name || props.city || props.town || props.village || props.locality || "Location";

  return {
    id: `${props.osm_type || "osm"}-${props.osm_id || index}-${latitude},${longitude}`,
    label: buildLabel(props),
    name,
    city: props.city || props.town || props.village || props.locality || null,
    state: props.state || null,
    country: props.country || null,
    latitude,
    longitude,
  };
};

export const LocationSearchService = {
  async search(query: string, limit = 12): Promise<LocationSuggestion[]> {
    const q = query.trim();
    if (q.length < 2) return [];

    // Prefer India-scoped Nominatim results for STRON.
    const nominatim = await searchNominatim(q, limit);
    if (nominatim.length) return nominatim;

    // Fallback: global Photon autocomplete.
    return searchPhoton(q, limit);
  },

  /**
   * Dynamic India city suggestions (GeoNames via OpenDataSoft).
   * Optionally ranks by distance to `near`.
   */
  async getPopularCities(
    limit = 12,
    near?: { latitude: number; longitude: number } | null,
  ): Promise<LocationSuggestion[]> {
    const fetchLimit = Math.max(limit * 3, 30);
    const now = Date.now();
    let cities = popularCitiesCache?.cities ?? null;

    if (!cities || now - (popularCitiesCache?.fetchedAt ?? 0) > POPULAR_CACHE_TTL_MS) {
      cities = await fetchIndiaCitiesByPopulation(fetchLimit);
      popularCitiesCache = { fetchedAt: now, cities };
    }

    const ranked = near
      ? [...cities].sort(
          (a, b) => haversineKm(near, a) - haversineKm(near, b) || a.name.localeCompare(b.name),
        )
      : cities;

    return ranked.slice(0, limit);
  },

  async reverse(latitude: number, longitude: number): Promise<LocationSuggestion> {
    // zoom=10 → city-level result (not street / POI / suburb).
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: "json",
      addressdetails: "1",
      zoom: "10",
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      { headers: { Accept: "application/json", "User-Agent": USER_AGENT } },
    );

    if (!response.ok) {
      throw new Error("Could not resolve current location.");
    }

    const data = (await response.json()) as {
      display_name?: string;
      name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        county?: string;
        state_district?: string;
        suburb?: string;
        state?: string;
        country?: string;
      };
    };

    const address = data.address || {};
    // Prefer city/town over Nominatim's precise place `name` (street, area, etc.).
    const cityName =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      address.state_district ||
      null;

    const name = cityName || address.suburb || data.name || "Current Location";
    const label = [name, address.state, address.country].filter(Boolean).join(", ");

    return {
      id: `current-${latitude},${longitude}`,
      label,
      name,
      city: cityName,
      state: address.state || null,
      country: address.country || null,
      latitude,
      longitude,
    };
  },
};

const searchNominatim = async (q: string, limit: number): Promise<LocationSuggestion[]> => {
  const params = new URLSearchParams({
    q,
    format: "json",
    addressdetails: "1",
    limit: String(limit),
    countrycodes: "in",
  });

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) return [];

  const rows = (await response.json()) as {
    place_id?: number | string;
    lat?: string;
    lon?: string;
    display_name?: string;
    name?: string;
    address?: {
      city?: string;
      town?: string;
      village?: string;
      state?: string;
      country?: string;
    };
  }[];

  const seen = new Set<string>();
  const results: LocationSuggestion[] = [];

  for (const row of rows || []) {
    const latitude = Number(row.lat);
    const longitude = Number(row.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const address = row.address || {};
    const name =
      row.name ||
      address.city ||
      address.town ||
      address.village ||
      row.display_name?.split(",")[0]?.trim() ||
      "Location";
    const label =
      row.display_name || [name, address.state, address.country].filter(Boolean).join(", ");
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id: `nominatim-${row.place_id || `${latitude},${longitude}`}`,
      label,
      name,
      city: address.city || address.town || address.village || null,
      state: address.state || null,
      country: address.country || null,
      latitude,
      longitude,
    });
  }

  return results;
};

const fetchIndiaCitiesByPopulation = async (limit: number): Promise<LocationSuggestion[]> => {
  const params = new URLSearchParams({
    where: 'cou_name_en="India"',
    order_by: "population desc",
    limit: String(limit),
  });

  const response = await fetch(`${OPENDATASOFT_CITIES_URL}?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) return [];

  const data = (await response.json()) as {
    results?: {
      geoname_id?: string | number;
      name?: string;
      ascii_name?: string;
      population?: number;
      cou_name_en?: string;
      coordinates?: { lat?: number; lon?: number };
    }[];
  };

  const seen = new Set<string>();
  const results: LocationSuggestion[] = [];

  for (const row of data.results || []) {
    const latitude = Number(row.coordinates?.lat);
    const longitude = Number(row.coordinates?.lon);
    const name = (row.name || row.ascii_name || "").trim();
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const country = row.cou_name_en || "India";
    results.push({
      id: `geonames-${row.geoname_id || `${latitude},${longitude}`}`,
      label: `${name}, ${country}`,
      name,
      city: name,
      state: null,
      country,
      latitude,
      longitude,
    });
  }

  return results;
};

const searchPhoton = async (q: string, limit: number): Promise<LocationSuggestion[]> => {
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    lang: "en",
    lat: String(INDIA_BIAS.lat),
    lon: String(INDIA_BIAS.lon),
    // India bounding box
    bbox: "68.1,6.5,97.4,35.7",
  });

  const response = await fetch(`https://photon.komoot.io/api/?${params.toString()}`, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`Location search failed (${response.status}).`);
  }

  const data = (await response.json()) as { features?: PhotonFeature[] };
  const seen = new Set<string>();
  const results: LocationSuggestion[] = [];

  for (const [index, feature] of (data.features || []).entries()) {
    const mapped = mapFeature(feature, index);
    if (!mapped) continue;
    const key = mapped.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(mapped);
  }

  return results;
};

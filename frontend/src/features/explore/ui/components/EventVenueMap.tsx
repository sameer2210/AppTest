import React, { useEffect, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { Image, StyleSheet, View } from "react-native";
import { ShimmerBox } from "@/components/ShimmerPlaceholder";
import CustomText from "@/components/CustomText";

type Coords = { latitude: number; longitude: number };

const buildStaticMapUrl = ({ latitude, longitude }: Coords) =>
  `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=14&size=600x240&markers=${latitude},${longitude},red-pushpin`;

const geocodeVenue = async (venue: string): Promise<Coords | null> => {
  const query = encodeURIComponent(venue.trim());
  if (!query) return null;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { "User-Agent": "StronApp/1.0 (contact@stron.in)" } },
    );
    if (!response.ok) return null;

    const results = (await response.json()) as { lat?: string; lon?: string }[];
    const hit = results?.[0];
    if (!hit?.lat || !hit?.lon) return null;

    return { latitude: parseFloat(hit.lat), longitude: parseFloat(hit.lon) };
  } catch {
    return null;
  }
};

const isVirtualVenue = (venue?: string, category?: string) => {
  const venueLabel = (venue || "").trim().toLowerCase();
  const categoryLabel = (category || "").trim().toLowerCase();
  return (
    venueLabel === "anywhere" ||
    categoryLabel.includes("virtual") ||
    categoryLabel.includes("vertual")
  );
};

type Props = {
  venue?: string;
  category?: string;
};

const EventVenueMap = ({ venue, category }: Props) => {
  const virtual = isVirtualVenue(venue, category);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(!virtual);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (virtual || !venue?.trim()) {
      setCoords(null);
      setLoading(false);
      setMapFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setCoords(null);
    setMapFailed(false);

    geocodeVenue(venue).then((result) => {
      if (cancelled) return;
      setCoords(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [venue, virtual]);

  if (virtual) {
    return (
      <View style={styles.virtualWrap}>
        <CustomText style={styles.virtualTitle}>Virtual Event</CustomText>
        <CustomText style={styles.virtualText}>Join from anywhere — no physical venue</CustomText>
      </View>
    );
  }

  const mapUrl = coords ? buildStaticMapUrl(coords) : undefined;
  const showSkeleton = loading || mapFailed || !mapUrl;

  return (
    <View style={styles.mapWrap}>
      {showSkeleton ? (
        <ShimmerBox width="100%" height="100%" borderRadius={12} style={StyleSheet.absoluteFill} />
      ) : null}
      {mapUrl && !mapFailed ? (
        <Image
          source={{ uri: mapUrl }}
          style={styles.mapImage}
          resizeMode="cover"
          onError={() => setMapFailed(true)}
        />
      ) : null}
      {!loading && !coords ? (
        <View style={styles.fallback}>
          <CustomText style={styles.fallbackText}>Could not locate this venue on the map</CustomText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapWrap: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1A2940",
    position: "relative",
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  virtualWrap: {
    width: "100%",
    height: 120,
    borderRadius: 12,
    backgroundColor: "#243652",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  virtualTitle: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  virtualText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  fallbackText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
});

export default EventVenueMap;

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  Linking,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TurboModuleRegistry,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";

type Props = {
  address: string;
  /** Optional lat/lng — geocoded from address when omitted. */
  latitude?: number;
  longitude?: number;
  height?: number;
};

type Coords = { latitude: number; longitude: number };

type WebViewComponent = ComponentType<{
  originWhitelist?: string[];
  source: { html: string };
  style?: object;
  scrollEnabled?: boolean;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
}>;

let _cachedWebView: WebViewComponent | null | undefined;

const loadWebView = (): WebViewComponent | null => {
  if (_cachedWebView !== undefined) return _cachedWebView;

  if (!TurboModuleRegistry.get("RNCWebViewModule")) {
    _cachedWebView = null;
    return null;
  }

  // Trigger async load for next render; return null for first render.
  void import("react-native-webview")
    .then((mod) => { _cachedWebView = mod.WebView as WebViewComponent; })
    .catch(() => { _cachedWebView = null; });
  return null;
};

const isVirtualVenue = (address?: string) => {
  const label = (address || "").trim().toLowerCase();
  return (
    !label ||
    label === "virtual event" ||
    label === "virtual" ||
    label === "anywhere" ||
    label === "venue not set" ||
    label.includes("virtual")
  );
};

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

const openInMaps = async (address: string, coords: Coords | null) => {
  const query = encodeURIComponent(address.trim() || "Venue");
  const url =
    coords != null
      ? Platform.select({
          ios: `maps:0,0?q=${query}&ll=${coords.latitude},${coords.longitude}`,
          default: `geo:${coords.latitude},${coords.longitude}?q=${query}`,
        })
      : `https://www.google.com/maps/search/?api=1&query=${query}`;

  const webFallback = `https://www.google.com/maps/search/?api=1&query=${
    coords != null ? `${coords.latitude},${coords.longitude}` : query
  }`;

  try {
    const canOpen = url ? await Linking.canOpenURL(url) : false;
    await Linking.openURL(canOpen && url ? url : webFallback);
  } catch {
    await Linking.openURL(webFallback);
  }
};

/**
 * Readable venue map — light tiles, geocoded pin, Open in Maps.
 * Virtual / unset venues skip the map (no fake Delhi pin).
 */
const VenueMapCard = ({ address, latitude, longitude, height = 180 }: Props) => {
  const WebView = useMemo(() => loadWebView(), []);
  const virtual = isVirtualVenue(address);
  const hasExplicitCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

  const [coords, setCoords] = useState<Coords | null>(
    hasExplicitCoords ? { latitude: latitude!, longitude: longitude! } : null,
  );
  const [loading, setLoading] = useState(!virtual && !hasExplicitCoords);

  useEffect(() => {
    if (virtual) {
      setCoords(null);
      setLoading(false);
      return;
    }
    if (hasExplicitCoords) {
      setCoords({ latitude: latitude!, longitude: longitude! });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void geocodeVenue(address).then((result) => {
      if (cancelled) return;
      setCoords(result);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [address, virtual, hasExplicitCoords, latitude, longitude]);

  const html = useMemo(() => {
    if (!coords) return "";
    const lat = coords.latitude;
    const lng = coords.longitude;
    const safeLabel = String(address || "Venue")
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/</g, "");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#E8EEF5; }
    .leaflet-control-attribution { display:none !important; }
    .leaflet-control-zoom a {
      background:#fff !important; color:#111 !important; border:none !important;
      width:32px !important; height:32px !important; line-height:32px !important;
      font-size:16px !important;
    }
    .leaflet-bar { border:none !important; box-shadow:0 2px 8px rgba(0,0,0,0.18) !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: false,
      doubleClickZoom: true,
      touchZoom: true
    }).setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);
    var marker = L.circleMarker([${lat}, ${lng}], {
      radius: 10,
      color: '#086CFF',
      fillColor: '#086CFF',
      fillOpacity: 1,
      weight: 3
    }).addTo(map);
    marker.bindPopup('${safeLabel}');
    setTimeout(function(){ map.invalidateSize(); }, 200);
  </script>
</body>
</html>`;
  }, [address, coords]);

  if (virtual) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <CustomText style={styles.addressText} numberOfLines={2}>
            {address || "Venue"}
          </CustomText>
          <CustomText style={styles.venueLabel}>Venue</CustomText>
        </View>
        <TouchableOpacity
          style={styles.openMapsBtn}
          onPress={() => void openInMaps(address, coords)}
          accessibilityRole="button"
          accessibilityLabel="Open in Maps"
          activeOpacity={0.7}
        >
          <Ionicons name="navigate" size={16} color="#FFF" />
          <CustomText style={styles.mapsBtnText}>Maps</CustomText>
        </TouchableOpacity>
      </View>

      <View style={[styles.mapWrap, { height }]}>
        {loading ? (
          <View style={styles.mapFallback}>
            <CustomText style={styles.fallbackLoadingText}>Locating venue…</CustomText>
          </View>
        ) : coords && WebView && html ? (
          <WebView
            originWhitelist={["*"]}
            source={{ html }}
            style={styles.webview}
            scrollEnabled={false}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
          />
        ) : (
          <View style={styles.mapFallback}>
            <CustomText style={styles.fallbackErrorText}>
              Could not place this venue on the map. Tap Maps to search.
            </CustomText>
            <TouchableOpacity
              style={[styles.openMapsBtn, { marginTop: 12 }]}
              onPress={() => void openInMaps(address, null)}
              activeOpacity={0.7}
            >
              <Ionicons name="navigate" size={16} color="#FFF" />
              <CustomText style={styles.mapsBtnText}>Open in Maps</CustomText>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#191919",
    borderRadius: 10,
    overflow: "hidden",
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  headerText: {
    flex: 1,
  },
  openMapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#086CFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapWrap: {
    width: "100%",
    overflow: "hidden",
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  webview: {
    flex: 1,
    backgroundColor: "#E8EEF5",
  },
  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#212121",
    paddingHorizontal: 16,
  },
  virtualBody: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: "#212121",
  },
  addressText: {
    fontSize: 16,
    color: "#D9D9D9",
  },
  venueLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.5)",
  },
  mapsBtnText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  fallbackLoadingText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
  },
  fallbackErrorText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    paddingHorizontal: 16,
  },
});

export default VenueMapCard;

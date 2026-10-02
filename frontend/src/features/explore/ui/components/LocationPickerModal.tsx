import React, { useEffect, useRef, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
} from "react-native";
import CustomText from "@/components/CustomText";
import { Ionicons } from "@expo/vector-icons";
import { addRecentCity, loadRecentCities } from "@/utils/exploreStorage";
import type { ExploreCity } from "@/models/explore";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import { useAppDispatch } from "@/store/hooks";
import {
  loadLocationPickerSuggestions,
  resolveGpsLocationSuggestion,
  searchLocationSuggestions,
} from "../../model/explore.thunks";
import type { LocationSuggestion } from "@/features/core";

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation?: (location: LocationSuggestion) => void;
}

const toExploreCity = (location: LocationSuggestion): ExploreCity => ({
  id: location.id,
  name: location.name,
  state: location.state ?? null,
  country: location.country ?? null,
  latitude: location.latitude,
  longitude: location.longitude,
  label: location.label,
});

const fromExploreCity = (city: ExploreCity): LocationSuggestion | null => {
  if (
    typeof city.latitude !== "number" ||
    typeof city.longitude !== "number" ||
    !Number.isFinite(city.latitude) ||
    !Number.isFinite(city.longitude)
  ) {
    return null;
  }
  return {
    id: city.id,
    name: city.name,
    state: city.state ?? null,
    country: city.country ?? null,
    latitude: city.latitude,
    longitude: city.longitude,
    label: city.label,
    city: city.name,
  };
};

const mergeUnique = (
  primary: LocationSuggestion[],
  secondary: LocationSuggestion[],
  limit: number,
): LocationSuggestion[] => {
  const seen = new Set<string>();
  const out: LocationSuggestion[] = [];
  for (const item of [...primary, ...secondary]) {
    const key = item.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
};

const LocationPickerModal = ({ visible, onClose, onSelectLocation }: LocationPickerModalProps) => {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [suggested, setSuggested] = useState<LocationSuggestion[]>([]);

  useEffect(() => {
    if (visible) {
      captureEvent("location_picker_opened");
    }
  }, [visible]);
  const [loading, setLoading] = useState(false);
  const [loadingSuggested, setLoadingSuggested] = useState(false);
  const [locating, setLocating] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setResults([]);
      setLoading(false);
      setLocating(false);
      return;
    }

    let cancelled = false;
    setLoadingSuggested(true);

    void (async () => {
      try {
        const recent = (await loadRecentCities())
          .map(fromExploreCity)
          .filter((item): item is LocationSuggestion => item != null);
        const popular = await dispatch(loadLocationPickerSuggestions()).unwrap();
        if (cancelled) return;
        setSuggested(mergeUnique(recent, popular, 16));
      } catch {
        if (!cancelled) {
          setSuggested([]);
          showToastMessage("Could not load city suggestions.");
        }
      } finally {
        if (!cancelled) setLoadingSuggested(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, dispatch]);

  useEffect(() => {
    const q = query.trim();
    if (!visible) return;

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const hits = await dispatch(searchLocationSuggestions(q)).unwrap();
          if (requestId !== requestIdRef.current) return;
          setResults(hits);
        } catch {
          if (requestId !== requestIdRef.current) return;
          setResults([]);
          showToastMessage("Could not search locations. Try again.");
        } finally {
          if (requestId === requestIdRef.current) setLoading(false);
        }
      })();
    }, 350);

    return () => clearTimeout(timer);
  }, [query, visible, dispatch]);

  const listData =
    query.trim().length >= 2
      ? results
      : suggested.filter((loc) =>
        query.trim() ? loc.label.toLowerCase().includes(query.trim().toLowerCase()) : true,
      );

  const handleSelect = (location: LocationSuggestion, source: "search" | "gps" = "search") => {
    void addRecentCity(toExploreCity(location));
    captureEvent("explore_city_changed", { city: location.label, source });
    onSelectLocation?.(location);
    setQuery("");
    onClose();
  };

  const handleCurrentLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const result = await dispatch(resolveGpsLocationSuggestion());
      if (resolveGpsLocationSuggestion.rejected.match(result)) {
        const payload = result.payload;
        showToastMessage(payload?.message ?? "Could not get current location.");
        return;
      }
      if (resolveGpsLocationSuggestion.fulfilled.match(result)) {
        handleSelect(result.payload, "gps");
      }
    } finally {
      setLocating(false);
    }
  };

  const hintText = query.trim().length < 2 ? "Suggested cities" : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.centered}>
          <Pressable style={styles.sheet} onPress={() => { }}>
            <CustomText style={styles.title}>Select your Location ?</CustomText>

            <View style={styles.searchRow}>
              <View style={styles.searchInput}>
                <TextInput
                  placeholder="Search your location"
                  placeholderTextColor="#999"
                  value={query}
                  onChangeText={setQuery}
                  style={styles.input}
                  returnKeyType="search"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                onPress={() => void handleCurrentLocation()}
                activeOpacity={0.7}
                style={styles.locationBtn}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator color="#086CFF" size="small" />
                ) : (
                  <Ionicons name="locate-outline" size={24} color="#086CFF" />
                )}
              </TouchableOpacity>
            </View>

            {hintText ? <CustomText style={styles.hintText}>{hintText}</CustomText> : null}

            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                  style={styles.resultItem}
                >
                  <Ionicons name="location-outline" size={20} color="#666" />
                  <View style={styles.resultTextCol}>
                    <CustomText style={styles.resultText} numberOfLines={1}>
                      {item.name}
                    </CustomText>
                    {item.label !== item.name ? (
                      <CustomText style={styles.resultSub} numberOfLines={2}>
                        {item.label}
                      </CustomText>
                    ) : null}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                loading || loadingSuggested ? (
                  <ActivityIndicator color="#086CFF" style={{ marginTop: 28 }} />
                ) : query.trim().length >= 2 ? (
                  <CustomText style={styles.emptyText}>No locations found</CustomText>
                ) : (
                  <CustomText style={styles.emptyText}>No cities available</CustomText>
                )
              }
            />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    width: "90%",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    height: 420,
  },
  title: {
    ...fontTextStyles.twentyEightNormalBlack,
    color: "#000000",
    marginBottom: 18,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    backgroundColor: "#EFEFEF",
    borderRadius: 24,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  input: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#000",
  },
  locationBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F0F0F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#086CFF",
  },
  hintText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#999",
    marginBottom: 6,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E0E0E0",
    gap: 12,
  },
  resultTextCol: {
    flex: 1,
  },
  resultText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#333",
  },
  resultSub: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#888",
    marginTop: 2,
  },
  emptyText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#999",
    textAlign: "center",
    marginTop: 30,
  },
});

export default LocationPickerModal;

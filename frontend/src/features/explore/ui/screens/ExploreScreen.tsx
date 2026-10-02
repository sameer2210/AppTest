import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  StatusBar,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { ExploreFeedSkeleton } from "@/components/skeletons";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import { useAppDispatch } from "@/store/hooks";
import { setExploreCategory, setSelectedCity } from "../../model/explore.slice";
import { selectSelectedExploreCity } from "../../model/explore.selectors";
import { setSelectedCity as setEventsSelectedCity } from "@/features/events";
import { selectAuthUser, updateUser } from "@/features/auth";
import { fetchManagedEventsCatalog } from "@/features/managedEvents";
import { saveLastCity, saveLastLocation } from "@/utils/exploreStorage";
import { showToastMessage } from "@/utils/app-utils";
import { href } from "@/navigation/href";
import { images } from "@/utils/images";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";

import ExploreSearchBar from "../components/ExploreSearchBar";
import ExploreFilterChips, { type ExploreFilter } from "../components/ExploreFilterChips";
import ExploreEventCard from "../components/ExploreEventCard";
import LocationPickerModal from "../components/LocationPickerModal";
import {
  filterExploreCatalog,
  sortCatalogEvents,
  toExploreCatalogCard,
  type ExploreCatalogCard,
} from "../exploreCatalog";

const ExploreScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const fabBottom = 70 + Math.max(insets.bottom, 10) + 16;
  const authUser = useSelector(selectAuthUser);
  const selectedExploreCity = useSelector(selectSelectedExploreCity);

  const activeFilter = useSelector(
    (state: RootState) => state.explore.exploreCategory,
  ) as ExploreFilter;

  const setActiveFilter = useCallback(
    (filter: ExploreFilter) => {
      dispatch(setExploreCategory(filter));
    },
    [dispatch],
  );

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocationLabel, setSelectedLocationLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cards, setCards] = useState<ExploreCatalogCard[]>([]);
  const cardsRef = useRef(cards);
  const lastFetchAtRef = useRef(0);
  cardsRef.current = cards;

  const loadCatalog = useCallback(
    async (options?: { showLoading?: boolean; force?: boolean; isRefresh?: boolean }) => {
      const hasCards = cardsRef.current.length > 0;
      const showLoading = options?.showLoading ?? !hasCards;
      if (showLoading) setLoading(true);
      if (options?.isRefresh) setRefreshing(true);
      try {
        const events = await dispatch(
          fetchManagedEventsCatalog(options?.force ? "force" : undefined),
        ).unwrap();
        setCards(sortCatalogEvents(events).map(toExploreCatalogCard));
        lastFetchAtRef.current = Date.now();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load events.";
        showToastMessage(message);
        if (!hasCards) setCards([]);
      } finally {
        if (showLoading) setLoading(false);
        if (options?.isRefresh) setRefreshing(false);
      }
    },
    [dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(setExploreCategory("All"));
      void loadCatalog({ showLoading: cardsRef.current.length === 0, force: true });
    }, [dispatch, loadCatalog]),
  );

  const filtered = useMemo(() => filterExploreCatalog(cards, activeFilter), [cards, activeFilter]);

  const renderItem: ListRenderItem<ExploreCatalogCard> = useCallback(
    ({ item }) => (
      <View style={styles.cardPadding}>
        <ExploreEventCard {...item} loadImage />
      </View>
    ),
    [],
  );

  const keyExtractor = useCallback((item: ExploreCatalogCard) => item.id, []);

  const locationText = useMemo(() => {
    if (selectedLocationLabel) {
      return selectedLocationLabel.split(",")[0].trim();
    }
    if (selectedExploreCity?.name) {
      return selectedExploreCity.name;
    }
    if (authUser?.city) {
      return authUser.city.trim();
    }
    if (authUser?.location) {
      return authUser.location.split(",")[0].trim();
    }
    return "Select location";
  }, [selectedLocationLabel, selectedExploreCity, authUser]);

  const listHeader = useMemo(
    () => (
      <View style={[styles.listHeader, { paddingTop: topInset + 8 }]}>
        {/* Location + Search — Figma 1423:70 */}
        <View style={styles.searchRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowLocationPicker(true)}
            style={styles.locationButton}
            accessibilityRole="button"
            accessibilityLabel="Select location"
          >
            <CustomText style={styles.locationText} numberOfLines={1}>
              {locationText}
            </CustomText>
            <Image
              source={images.EXPLORE_V2.ICON_LOCATION_CARET}
              style={styles.locationCaret}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <ExploreSearchBar compact />
        </View>

        <ExploreFilterChips activeFilter={activeFilter} onFilterSelect={setActiveFilter} />

        <View style={styles.headerSpacer} />
      </View>
    ),
    [activeFilter, locationText, setActiveFilter, topInset],
  );

  const emptyMessage = useMemo(() => {
    switch (activeFilter) {
      case "Challenges":
        return "No challenges listed";
      case "Games":
        return "No games listed";
      case "Events":
        return "No events listed";
      default:
        return "No events, games or challenges listed";
    }
  }, [activeFilter]);

  const listEmpty = useMemo(() => {
    if (loading) {
      return <ExploreFeedSkeleton count={5} />;
    }
    return (
      <View style={styles.emptyContainer}>
        <CustomText style={styles.emptyTitle}>
          {emptyMessage}
        </CustomText>
        <CustomText style={styles.emptySubtitle}>
          Check back soon or create one with the Create button.
        </CustomText>
      </View>
    );
  }, [loading, emptyMessage]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <FlatList
        data={loading ? [] : filtered}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadCatalog({ force: true, isRefresh: true })}
            tintColor="#FFFFFF"
            colors={["#FF4B2B"]}
          />
        }
        contentContainerStyle={{
          paddingBottom: fabBottom + 64,
          flexGrow: 1,
        }}
        style={{ flex: 1, backgroundColor: "transparent" }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={5}
        maxToRenderPerBatch={4}
        updateCellsBatchingPeriod={50}
        windowSize={5}
      />

      {/* Create FAB — Figma 1423:135 */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => router.push(href.app.organizeCreate as never)}
        style={[styles.createFab, { bottom: fabBottom }]}
        accessibilityRole="button"
        accessibilityLabel="Create event"
      >
        <CustomText style={styles.createText}>Create</CustomText>
        <Ionicons name="add" size={22} color="#FFFFFF" style={styles.createPlus} />
      </TouchableOpacity>

      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={(loc) => {
          setSelectedLocationLabel(loc.label);
          const cityObj = {
            id: loc.id,
            name: loc.name,
            state: loc.state ?? null,
            country: loc.country ?? null,
            latitude: loc.latitude,
            longitude: loc.longitude,
            label: loc.label,
          };
          dispatch(setSelectedCity(cityObj));
          dispatch(setEventsSelectedCity(loc.name));
          dispatch(updateUser({ city: loc.name, location: loc.label }));
          void saveLastCity(cityObj);
          void saveLastLocation({ latitude: loc.latitude, longitude: loc.longitude });
          showToastMessage(`Location set to ${loc.name}`);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  cardPadding: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  listHeader: {
    paddingHorizontal: 0,
  },
  searchRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  locationButton: {
    marginRight: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  locationCaret: {
    marginLeft: 6,
    height: 7,
    width: 7,
  },
  headerSpacer: {
    marginTop: 16,
  },
  emptyContainer: {
    marginTop: 64,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    textAlign: "center",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  emptySubtitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255, 255, 255, 0.55)",
  },
  createFab: {
    position: "absolute",
    right: 14,
    height: 54,
    width: 122,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#2A80FF",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
  },
  createText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  createPlus: {
    marginTop: 1,
  },
});

export default ExploreScreen;

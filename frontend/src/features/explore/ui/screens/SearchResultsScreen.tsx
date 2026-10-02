import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Platform, StatusBar, View, StyleSheet } from "react-native";
import { ExploreFeedSkeleton } from "@/components/skeletons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import KeyboardAwareScrollView from "@/components/KeyboardAwareScrollView";
import { GlassBackButton, GlassSearchField, ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { useAppDispatch } from "@/store/hooks";
import { fetchManagedEventsCatalog } from "@/features/managedEvents";
import { showToastMessage } from "@/utils/app-utils";
import { SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { images } from "@/utils/images";
import { getExploreStickySearchContentOffset, getExploreStickySearchPaddingTop } from "../exploreLayout";
import ExploreEventCard from "../components/ExploreEventCard";
import {
  matchesSearchQuery,
  sortCatalogEvents,
  toExploreCatalogCard,
  type ExploreCatalogCard,
} from "../exploreCatalog";
import { captureEvent } from "@/analytics/posthog/events";

const HEADER_BOTTOM_PADDING = 8;

const SearchResultsScreen = () => {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState(params.query ?? "");
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<ExploreCatalogCard[]>([]);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const stickySearchPaddingTop = getExploreStickySearchPaddingTop();
  const stickyHeaderOffset =
    getExploreStickySearchContentOffset(HEADER_BOTTOM_PADDING) + 8;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollBottomPadding = keyboardInset > 0 ? keyboardInset + 24 : 120;

  // Debounced: capture once the user stops typing, not per keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const timer = setTimeout(() => {
      captureEvent("explore_search_submitted", { query: trimmed });
    }, 1000);
    return () => clearTimeout(timer);
  }, [query]);

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const events = await dispatch(fetchManagedEventsCatalog()).unwrap();
      setCards(sortCatalogEvents(events).map(toExploreCatalogCard));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load events.";
      showToastMessage(message);
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void loadCatalog();
    }, [loadCatalog]),
  );

  const filtered = useMemo(
    () => cards.filter((card) => matchesSearchQuery(card, query)),
    [cards, query],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={false} />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        extraScrollHeight={32}
        contentContainerStyle={{
          paddingTop: stickyHeaderOffset,
          paddingBottom: scrollBottomPadding,
          flexGrow: 1,
        }}
      >
        <CustomText style={styles.title}>Search Results</CustomText>

        {loading ? (
          <ExploreFeedSkeleton count={5} />
        ) : filtered.length === 0 ? (
          <CustomText style={styles.emptyText}>
            {query.trim() ? `No events matching “${query.trim()}”.` : "No published events yet."}
          </CustomText>
        ) : (
          <View style={styles.cardsContainer}>
            {filtered.map((item) => (
              <ExploreEventCard key={item.id} {...item} />
            ))}
          </View>
        )}
      </KeyboardAwareScrollView>

      <View
        style={[styles.headerContainer, { paddingTop: stickySearchPaddingTop }]}
        pointerEvents="box-none"
      >
        <View
          style={styles.searchRow}
          pointerEvents="box-none"
        >
          <GlassBackButton />
          <View style={styles.searchFieldWrapper}>
            <GlassSearchField
              value={query}
              onChangeText={setQuery}
              placeholder="Search your Favourite"
              autoFocus
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  title: {
    marginBottom: 16,
    paddingHorizontal: 14,
    fontSize: 28,
    color: "#FFFFFF",
  },
  emptyText: {
    marginBottom: 16,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  cardsContainer: {
    width: "100%",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
  headerContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 10,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  searchRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 8,
  },
  searchFieldWrapper: {
    minWidth: 0,
    flex: 1,
    overflow: "hidden",
  },
});

export default SearchResultsScreen;

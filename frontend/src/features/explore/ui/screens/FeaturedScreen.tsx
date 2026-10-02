import React, { useCallback, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, StatusBar, TouchableOpacity } from "react-native";
import { ExploreFeedSkeleton } from "@/components/skeletons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppScrollView, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { useAppDispatch } from "@/store/hooks";
import { fetchManagedEventsCatalog } from "@/features/managedEvents";
import { showToastMessage } from "@/utils/app-utils";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import ExploreEventCard from "../components/ExploreEventCard";
import { sortCatalogEvents, toExploreCatalogCard, type ExploreCatalogCard } from "../exploreCatalog";

const FeaturedScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<ExploreCatalogCard[]>([]);

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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={["#2F80FF", "#2258D7", "#102A74", "#081631"]}
        style={StyleSheet.absoluteFill}
      />

      <ScreenSafeArea style={{ flex: 1 }}>
        <AppScrollView contentContainerStyle={{ paddingTop: 18, paddingBottom: 120 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <CustomText style={styles.title}>Featured</CustomText>

          {loading ? (
            <ExploreFeedSkeleton count={5} />
          ) : cards.length === 0 ? (
            <CustomText style={styles.emptyText}>No published events yet.</CustomText>
          ) : (
            <View style={styles.list}>
              {cards.map((item) => (
                <ExploreEventCard key={item.id} {...item} />
              ))}
            </View>
          )}
        </AppScrollView>
      </ScreenSafeArea>
    </View>
  );
};

export default FeaturedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#081631",
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  title: {
    ...fontTextStyles.size30NormalBlack,
    color: "#FFFFFF",
    marginLeft: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  emptyText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.7)",
    marginLeft: SCREEN_HORIZONTAL_PADDING,
    marginBottom: 16,
  },
  list: {
    width: "100%",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
  },
});

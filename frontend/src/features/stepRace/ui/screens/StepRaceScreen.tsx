import { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import { images } from "@/utils/images";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { screenContentContainerStyle, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { selectTodaySteps } from "@/features/steps";
import { OpponentResultCard } from "../components/screens/OpponentResultCard";
import { FeelingLuckyCard } from "../components/screens/FeelingLuckyCard";
import { SuggestionCard } from "../components/screens/SuggestionCard";
import {
  fetchActiveStepRace,
  searchStepRaceOpponents,
  syncStepRaceLiveNotificationThunk,
  getUserWinsCountThunk,
  getRandomShadowOpponentsThunk,
  createStepRaceThunk,
} from "../../model/stepRace.thunks";
import { resolveStepRaceOpponentAvatarSource } from "../../api/stepRace.api";
import { resolveOpponentShortBio } from "@/constants/stepRaceBios";
import type { StepRaceSearchResult, StepRaceOpponent } from "@/models/stepRace";

const StepRace = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StepRaceSearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<StepRaceOpponent[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [totalWins, setTotalWins] = useState(0);
  const [showCelebrityInfoModal, setShowCelebrityInfoModal] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    const wins = await dispatch(getUserWinsCountThunk()).unwrap();
    setTotalWins(wins);
    const data = await dispatch(getRandomShadowOpponentsThunk(8)).unwrap();
    setSuggestions(data);
  }, [dispatch]);

  const checkActiveRaceAndFetchSuggestions = useCallback(async () => {
    try {
      const activeRace = await dispatch(
        fetchActiveStepRace(user?.uid || "current_user"),
      ).unwrap();
      if (activeRace && activeRace.status === "active") {
        router.replace(href.app.ongoingStepRace as never);
        return;
      }
    } catch {
      // Ignore error and continue to lobby
    }
    void fetchSuggestions();
  }, [user?.uid, router, dispatch, fetchSuggestions]);

  useEffect(() => {
    void dispatch(getUserWinsCountThunk()).unwrap().then(setTotalWins);
    void checkActiveRaceAndFetchSuggestions();
  }, [checkActiveRaceAndFetchSuggestions, dispatch]);

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = await dispatch(searchStepRaceOpponents(text)).unwrap();
    setSearchResults(results);
    setIsSearching(false);
  };


  const startRace = async (opponentUid: string, opponentType: "real" | "shadow" | "random") => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const race = await dispatch(
        createStepRaceThunk({
          opponentUid,
          opponentType,
          duration: 24,
          userId: user?.uid,
          startSteps: todaySteps,
        }),
      ).unwrap();
      if (race) {
        void dispatch(syncStepRaceLiveNotificationThunk({ race, todaySteps }));
        router.replace(href.app.ongoingStepRace as never);
      } else {
        // If race creation failed (e.g. active race exists), check active race again
        const activeRace = await dispatch(
          fetchActiveStepRace(user?.uid || "current_user"),
        ).unwrap();
        if (activeRace && activeRace.status === "active") {
          router.replace(href.app.ongoingStepRace as never);
        } else {
          showToastMessage("Failed to start the race.");
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleFeelingLucky = () => {
    // Pick a random suggestion if available
    if (suggestions.length > 0) {
      const randomOpponent = suggestions[Math.floor(Math.random() * suggestions.length)];
      startRace(randomOpponent.uid, randomOpponent.type);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />

      <ScreenSafeArea>
        <View style={styles.contentContainer}>
          {/* Fixed Header */}
          <View style={styles.headerBar}>
            <PressableScale
              style={styles.closeButton}
              onPress={() => router.replace(href.app.home as never)}
            >
              <Ionicons name="close" size={24} color="#D9D9D9" />
            </PressableScale>
            <View style={styles.headerTitleCol}>
              <CustomText style={[fontTextStyles.bodyMedium, styles.headerTitleText]}>Choose your Opponent</CustomText>
              <CustomText style={[fontTextStyles.body, styles.headerSubtitleText]}>
                Challenge someone to a 1K step race
              </CustomText>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Glassmorphic Search & Results Card */}
            <View style={styles.searchCard}>
              <View style={styles.searchInputRow}>
                <Ionicons name="search" size={20} color="rgba(255,255,255,0.8)" />
                <TextInput
                  placeholder="Search Opponent"
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={[fontTextStyles.body, styles.searchInput]}
                  value={query}
                  onChangeText={handleSearch}
                />
                {isSearching && <ActivityIndicator size="small" color="#FFFFFF" />}
              </View>

              {query.length > 0 && (
                <>
                  <CustomText style={[fontTextStyles.bodyMedium, styles.resultsTitle]}>Results</CustomText>

                  {searchResults.length === 0 && !isSearching && (
                    <CustomText style={[fontTextStyles.body, styles.noResultsText]}>No opponents found.</CustomText>
                  )}

                  {searchResults.map((item) => (
                    <OpponentResultCard
                      key={item.uid}
                      name={item.username}
                      subtext={item.isOnline ? "Online Now" : resolveOpponentShortBio(item)}
                      avatar={resolveStepRaceOpponentAvatarSource(item.uid, item.profileImageUrl)}
                      onPress={() => startRace(item.uid, "shadow")} // always race shadow clone of real user
                    />
                  ))}

                  <PressableScale style={styles.viewMoreButton}>
                    <CustomText style={[fontTextStyles.bodyMedium, styles.viewMoreText]}>View More</CustomText>
                  </PressableScale>
                </>
              )}
            </View>

            {/* Feeling Lucky Card */}
            <FeelingLuckyCard imageSource={images.STEP_RACE.DICE} onPress={handleFeelingLucky} />

            {/* Suggestions Header */}
            <View style={styles.suggestionsHeader}>
              <PressableScale
                style={styles.suggestionsTitleRow}
                onPress={() => setShowCelebrityInfoModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Suggestions info"
              >
                <CustomText style={[fontTextStyles.bodyMedium, styles.suggestionsTitle]}>Suggestions</CustomText>
                <Ionicons name="information-circle-outline" size={16} color="white" />
              </PressableScale>
              {totalWins >= 3 ? (
                <View style={styles.unlockedBadge}>
                  <CustomText style={styles.crownEmoji}>👑</CustomText>
                  <CustomText style={[fontTextStyles.bodyBold, styles.unlockedBadgeText]}>
                    Celebrities Unlocked
                  </CustomText>
                </View>
              ) : (
                <CustomText style={[fontTextStyles.bodyMedium, styles.viewAllText]}>View All</CustomText>
              )}
            </View>

            {/* Suggestions Grid */}
            <View style={styles.suggestionsGrid}>
              {suggestions.map((item) => (
                <SuggestionCard
                  key={item.uid}
                  name={item.username}
                  subtext={item.profession || item.bio || resolveOpponentShortBio(item)}
                  avatar={resolveStepRaceOpponentAvatarSource(item.uid, item.profileImageUrl)}
                  onPress={() => startRace(item.uid, item.type)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </ScreenSafeArea>

      {/* ── Celebrity Speed Info Modal Overlay ── */}
      <Modal
        visible={showCelebrityInfoModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setShowCelebrityInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0, 0, 0, 0.8)" }]}
            onPress={() => setShowCelebrityInfoModal(false)}
          />

          <View style={styles.modalContent}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.modalCloseButton}
              onPress={() => setShowCelebrityInfoModal(false)}
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </PressableScale>

            <View style={styles.modalIconWrapper}>
              <Ionicons name="information-circle-outline" size={30} color="#71BAFF" />
            </View>

            <CustomText style={[fontTextStyles.bodyBold, styles.modalTitle]}>
              Celebrity Step Speed
            </CustomText>

            <CustomText style={[fontTextStyles.body, styles.modalDescription]}>
              Step speed of celebrities are estimated by their top measured running speed
            </CustomText>

            <PressableScale
              style={styles.gotItButton}
              onPress={() => setShowCelebrityInfoModal(false)}
            >
              <CustomText style={[fontTextStyles.bodyBold, styles.gotItButtonText]}>Got it</CustomText>
            </PressableScale>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {isCreating && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <CustomText style={[fontTextStyles.bodyMedium, styles.loadingText]}>Creating race...</CustomText>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
    backgroundColor: "transparent",
  },
  closeButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(217, 217, 217, 0.55)",
    backgroundColor: "transparent",
  },
  headerTitleCol: {
    alignItems: "flex-end",
  },
  headerTitleText: {
    fontSize: 22,
    color: "#FFFFFF",
  },
  headerSubtitleText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 2,
  },
  scrollContent: {
    ...screenContentContainerStyle,
    paddingBottom: 40,
  },
  searchCard: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    padding: 16,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: "transparent",
  },
  searchInput: {
    marginLeft: 12,
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
  },
  resultsTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 12,
  },
  noResultsText: {
    color: "rgba(255, 255, 255, 0.6)",
    marginBottom: 8,
  },
  viewMoreButton: {
    marginTop: 8,
    alignItems: "center",
    paddingVertical: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  suggestionsHeader: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  suggestionsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestionsTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginRight: 6,
  },
  unlockedBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 215, 0, 0.5)",
    paddingHorizontal: 12,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  crownEmoji: {
    fontSize: 11,
  },
  unlockedBadgeText: {
    fontSize: 11,
    color: "#FFD700",
  },
  viewAllText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  suggestionsGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "#061B42",
    padding: 24,
    paddingTop: 20,
    shadowColor: "#000000",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 15,
    elevation: 10,
  },
  modalCloseButton: {
    position: "absolute",
    right: 16,
    top: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  modalIconWrapper: {
    marginTop: 8,
    marginBottom: 12,
    width: 56,
    height: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(113, 186, 255, 0.3)",
    backgroundColor: "rgba(113, 186, 255, 0.15)",
  },
  modalTitle: {
    fontSize: 19,
    color: "#FFFFFF",
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 20,
    lineHeight: 20,
  },
  gotItButton: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#2A80FF",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  gotItButtonText: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  loadingText: {
    color: "#FFFFFF",
    marginTop: 16,
    fontSize: 16,
  },
});

export default StepRace;


import { useCallback, useEffect, useState } from "react";
import { FlatList, Image, Platform, StatusBar, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { PressableScale, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";
import { getMatchHistoryThunk, createStepRaceThunk } from "../../model/stepRace.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { selectTodaySteps } from "@/features/steps";
import { showToastMessage } from "@/utils/app-utils";
import { logError } from "@/config/devLogger";
import { images } from "@/utils/images";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

type FilterTab = "all" | "lose" | "wins";

type MatchHistoryItem = {
  id: string;
  opponentUid: string;
  opponentName: string;
  opponentAvatar?: string;
  isWin: boolean;
  stepDiff: number;
  completedAt: string;
  finalPace?: string;
  paceDiff?: string;
  paceSeconds?: number;
};

const ITEM_HEIGHT = 92; // row + margin (includes pace line)

const MyRacesScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      try {
        const data = await dispatch(
          getMatchHistoryThunk(user?.uid || "current_user"),
        ).unwrap();
        if (isMounted) setHistory(data);
      } catch (err) {
        logError("Failed to load match history", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [user?.uid, dispatch]);

  const filteredHistory = history.filter((item) => {
    if (activeTab === "lose") return !item.isWin;
    if (activeTab === "wins") return item.isWin;
    return true;
  });

  const handleRematch = useCallback(
    async (item: MatchHistoryItem) => {
      try {
        showToastMessage(`Starting rematch with ${item.opponentName}... 🏃‍♂️`);
        const race = await dispatch(
          createStepRaceThunk({
            userId: user?.uid || "current_user",
            opponentUid: item.opponentUid,
            opponentType: "shadow",
            duration: 24,
            startSteps: todaySteps,
          }),
        ).unwrap();

        if (race) {
          router.push({
            pathname: "/(app)/ongoing-step-race" as never,
            params: { raceData: JSON.stringify(race) },
          });
        } else {
          router.push(href.app.stepRace as never);
        }
      } catch {
        router.push(href.app.stepRace as never);
      }
    },
    [user?.uid, router, todaySteps, dispatch],
  );

  const renderItem = useCallback(
    ({ item }: { item: MatchHistoryItem }) => {
      const avatarSrc =
        getProfileImageSource(item.opponentAvatar, item.opponentUid) ||
        images.HOME_V2.AVATAR_SAMPLE;

      return (
        <View style={styles.historyItemRow}>
          {/* Left: Avatar + Details */}
          <View style={styles.historyItemLeft}>
            <View style={styles.avatarWrapper}>
              <Image
                source={avatarSrc}
                style={styles.avatarImage}
                resizeMode="cover"
                fadeDuration={0}
              />
            </View>

            <View style={styles.historyItemDetails}>
              <CustomText
                style={[fontTextStyles.bodyMedium, styles.opponentNameText]}
                numberOfLines={1}
              >
                {item.opponentName}
              </CustomText>
              <CustomText style={[fontTextStyles.body, styles.stepDiffText]}>
                {item.isWin ? `Win by ${item.stepDiff} steps` : `Lose by ${item.stepDiff} steps`}
              </CustomText>
              {item.finalPace ? (
                <CustomText style={[fontTextStyles.body, styles.paceText]} numberOfLines={1}>
                  Pace {item.finalPace}
                  {item.paceDiff ? ` · ${item.paceDiff}` : ""}
                </CustomText>
              ) : null}
            </View>
          </View>

          {/* Right: Action Button */}
          <PressableScale
            style={styles.actionButton}
            onPress={() => void handleRematch(item)}
          >
            <CustomText style={[fontTextStyles.body, styles.actionButtonText]} numberOfLines={1}>
              {item.isWin ? "Play Again" : "Take Revenge"}
            </CustomText>
          </PressableScale>
        </View>
      );
    },
    [handleRematch],
  );

  const keyExtractor = useCallback((item: MatchHistoryItem) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<MatchHistoryItem> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />

      <ScreenSafeArea edges={["top", "bottom"]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          {/* Close Button */}
          <PressableScale
            style={styles.closeButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(href.app.home as never);
              }
            }}
            accessibilityLabel="Close match history"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </PressableScale>

          {/* Title & Subtitle */}
          <View style={styles.headerTitleCol}>
            <CustomText style={[headingTextStyles.h1, styles.headerTitle]}>
              My Races
            </CustomText>
            <CustomText style={[fontTextStyles.body, styles.headerSubtitle]}>Match History</CustomText>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.tabsRow}>
          {(["all", "lose", "wins"] as const).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === "all" ? "All" : tab === "lose" ? "Lose" : "Wins";

            return (
              <PressableScale
                key={tab}
                style={[
                  styles.tabButton,
                  isActive ? styles.tabButtonActive : styles.tabButtonInactive,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <CustomText
                  style={[
                    fontTextStyles.body,
                    styles.tabText,
                    isActive ? styles.tabTextActive : styles.tabTextInactive,
                  ]}
                >
                  {label}
                </CustomText>
              </PressableScale>
            );
          })}
        </View>

        {/* Match History List */}
        <FlatList
          data={filteredHistory}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={filteredHistory.length > 0 ? getItemLayout : undefined}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
            paddingTop: 8,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Ionicons name="flag-outline" size={32} color="#71BAFF" />
                </View>
                <CustomText style={[headingTextStyles.h3, styles.emptyTitle]}>
                  No Races Found
                </CustomText>
                <CustomText style={[fontTextStyles.body, styles.emptySubtitle]}>
                  Challenge an opponent or bot to start your first Step Race!
                </CustomText>
                <PressableScale
                  onPress={() => router.push(href.app.stepRace as never)}
                  style={styles.startRaceButton}
                >
                  <CustomText style={[fontTextStyles.bodyMedium, styles.startRaceButtonText]}>
                    Start a Race
                  </CustomText>
                </PressableScale>
              </View>
            ) : null
          }
        />
      </ScreenSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 8,
    paddingBottom: 8,
  },
  closeButton: {
    height: 50,
    width: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitleCol: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.5)",
  },
  tabsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    marginBottom: 16,
  },
  tabButton: {
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  tabButtonActive: {
    backgroundColor: "#E2E8F0",
  },
  tabButtonInactive: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  tabText: {
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: "bold",
    color: "#0F172A",
  },
  tabTextInactive: {
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  historyItemRow: {
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 72,
  },
  historyItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },
  avatarWrapper: {
    height: 56,
    width: 56,
    overflow: "hidden",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "#0A1A3A",
  },
  avatarImage: {
    height: "100%",
    width: "100%",
  },
  historyItemDetails: {
    marginLeft: 14,
    flex: 1,
  },
  opponentNameText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  stepDiffText: {
    marginTop: 2,
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
  },
  paceText: {
    marginTop: 2,
    fontSize: 12,
    color: "#71BAFF",
    fontWeight: "500",
  },
  actionButton: {
    minWidth: 125,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0A162B",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 16,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  startRaceButton: {
    borderRadius: 999,
    backgroundColor: "#0070FF",
    paddingHorizontal: 32,
    paddingVertical: 14,
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  startRaceButtonText: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
});

export default MyRacesScreen;

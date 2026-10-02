import { useCallback, useEffect, useState, useRef } from "react";
import { View, StatusBar, ScrollView, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { useRouter } from "expo-router";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { fontTextStyles } from "@/utils/typography";
import { ActiveRaceHero } from "../components/screens/ActiveRaceHero";
import { ActiveRaceVersusCard } from "../components/screens/ActiveRaceVersusCard";
import { ActiveRaceFooter } from "../components/screens/ActiveRaceFooter";
import type { StepRace } from "@/models/stepRace";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { refreshTodaySteps, selectTodaySteps } from "@/features/steps";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import {
  fetchActiveStepRace,
  syncStepRaceLiveNotificationThunk,
  completeStepRaceThunk,
  markRaceCompletedThunk,
  syncActiveRaceIfNeededThunk,
} from "../../model/stepRace.thunks";
import { isRaceSyncEnded } from "../../api/stepRace.api";

const OngoingStepRaceScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);

  const [race, setRace] = useState<StepRace | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const initialUserBaseStepsRef = useRef<number | null>(null);
  const peakRaceStepsRef = useRef(0);
  const lastSyncedStepsRef = useRef<number>(-1);
  const isCompletingRef = useRef<boolean>(false);

  const fetchActiveRace = useCallback(async () => {
    const activeRace = await dispatch(fetchActiveStepRace(user?.uid || "current_user")).unwrap().catch(() => null);
    if (!activeRace) {
      // Never router.back() — stack may be step-race → ongoing, which lands on opponent lobby.
      router.replace(href.app.home as never);
      return;
    }
    if (activeRace.status === "completed") {
      router.replace({
        pathname: "/(app)/completed-step-race",
        params: { raceData: JSON.stringify(activeRace) },
      });
      return;
    }

    // Initialize baseline steps cleanly
    if (initialUserBaseStepsRef.current === null) {
      if (activeRace.startSteps !== undefined && activeRace.startSteps > 0) {
        initialUserBaseStepsRef.current = activeRace.startSteps;
      } else if (todaySteps > 0) {
        initialUserBaseStepsRef.current = Math.max(0, todaySteps - (activeRace.userSteps || 0));
      }
    }

    // Pre-calculate initial elapsed seconds from startTime so UI does not freeze at 0
    if (activeRace.startTime) {
      const startMs = new Date(activeRace.startTime).getTime();
      const initialElapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(initialElapsed);
    }

    setRace(activeRace);
    peakRaceStepsRef.current = Math.max(peakRaceStepsRef.current, activeRace.userSteps || 0);
    setLoading(false);

    if (activeRace.status === "active") {
      void dispatch(
        syncStepRaceLiveNotificationThunk({
          race: activeRace,
          todaySteps,
          userAvatarUrl: user?.profileImageUrl,
          userUid: user?.uid,
        }),
      );
    }
  }, [dispatch, user?.uid, user?.profileImageUrl, router, todaySteps]);

  useEffect(() => {
    void fetchActiveRace();
  }, [fetchActiveRace]);

  // One-shot refresh via thunk (max-wins / isolation); live updates come from global FGS poll.
  useEffect(() => {
    void dispatch(refreshTodaySteps());
  }, [dispatch]);

  // Live notification is updated via syncActiveRaceIfNeeded (throttled in
  // stepRaceLiveNotification.service) — avoid a second schedule on every step tick.

  // Sync baseline once todaySteps becomes available if it was 0 initially
  useEffect(() => {
    if (race && initialUserBaseStepsRef.current === null && todaySteps > 0) {
      const baseline =
        race.startSteps !== undefined && race.startSteps > 0
          ? race.startSteps
          : Math.max(0, todaySteps - (race.userSteps || 0));
      initialUserBaseStepsRef.current = baseline;
    }
  }, [race, todaySteps]);

  // Live steps calculation while walking
  const stepsWalkedInRace =
    initialUserBaseStepsRef.current !== null
      ? Math.max(0, todaySteps - initialUserBaseStepsRef.current)
      : 0;

  const targetSteps = race?.targetSteps && race.targetSteps !== 200 ? race.targetSteps : 1000;

  const currentRaceSteps = Math.min(
    targetSteps,
    Math.max(0, peakRaceStepsRef.current, race?.userSteps || 0, stepsWalkedInRace),
  );
  if (currentRaceSteps > peakRaceStepsRef.current) {
    peakRaceStepsRef.current = currentRaceSteps;
  }

  // Smooth live timer updating elapsedSeconds every 500ms without recreating interval
  useEffect(() => {
    if (!race?.startTime || race.status !== "active") return;

    const startMs = new Date(race.startTime).getTime();

    // Immediate update
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    const timer = setInterval(() => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(timer);
  }, [race?.startTime, race?.status]);

  // Opponent pace & simulated steps (advances smoothly with elapsedSeconds)
  const opponentPaceSeconds =
    race?.opponentPaceSeconds || race?.opponent?.shadowData?.bestPaceSeconds || 600;
  const opponentSimulatedSteps = Math.min(
    targetSteps,
    Math.round((elapsedSeconds / opponentPaceSeconds) * targetSteps),
  );

  const navigateToCompleted = useCallback(
    (completedRace: StepRace) => {
      void dispatch(markRaceCompletedThunk(completedRace.raceId));
      router.replace({
        pathname: "/(app)/completed-step-race",
        params: { raceData: JSON.stringify(completedRace) },
      });
    },
    [dispatch, router],
  );

  const triggerRaceCompletion = useCallback(
    async (finalSteps: number, finalSeconds: number) => {
      if (!race?.raceId) return;
      void dispatch(markRaceCompletedThunk(race.raceId));

      const finalOpponentSteps = Math.min(
        targetSteps,
        Math.round((finalSeconds / opponentPaceSeconds) * targetSteps),
      );
      const calculatedWinner: "user" | "opponent" | "draw" =
        finalSteps > finalOpponentSteps
          ? "user"
          : finalSteps < finalOpponentSteps
            ? "opponent"
            : "draw";

      const completedRace = await dispatch(
        completeStepRaceThunk({ raceId: race.raceId, finalSteps, finalSeconds }),
      )
        .unwrap()
        .catch(() => null);
      navigateToCompleted(
        completedRace || {
          ...race,
          userSteps: finalSteps,
          opponentSteps: finalOpponentSteps,
          userTimeSeconds: finalSeconds,
          winner: race.winner || calculatedWinner,
          status: "completed",
        },
      );
    },
    [race, targetSteps, opponentPaceSeconds, navigateToCompleted, dispatch],
  );

  // Sync progress via shared race sync (also runs app-wide from StepService).
  // Throttled in stepRaceSync — only posts when steps change or every ~15s for time.
  // Finish on one path: either /update already completed, or a single /complete.
  useEffect(() => {
    if (!race || race.status !== "active" || isCompletingRef.current) return;

    const finishedLocally =
      currentRaceSteps >= targetSteps || opponentSimulatedSteps >= targetSteps;

    if (isRaceSyncEnded(race.raceId)) {
      isCompletingRef.current = true;
      void triggerRaceCompletion(currentRaceSteps, elapsedSeconds);
      return;
    }

    if (finishedLocally) {
      isCompletingRef.current = true;
      void triggerRaceCompletion(currentRaceSteps, elapsedSeconds);
      return;
    }

    void dispatch(
      syncActiveRaceIfNeededThunk({
        race,
        todaySteps,
        userTimeSeconds: elapsedSeconds,
        userAvatarUrl: user?.profileImageUrl,
        userUid: user?.uid,
      }),
    )
      .unwrap()
      .then((result) => {
        if (isCompletingRef.current) return;
        if (result?.completedRace) {
          isCompletingRef.current = true;
          navigateToCompleted(result.completedRace);
          return;
        }
        if (result?.userSteps != null) {
          lastSyncedStepsRef.current = result.userSteps;
        }
      })
      .catch(() => {});
  }, [
    race,
    todaySteps,
    elapsedSeconds,
    currentRaceSteps,
    opponentSimulatedSteps,
    targetSteps,
    navigateToCompleted,
    triggerRaceCompletion,
    dispatch,
  ]);

  const handleQuitRace = async () => {
    if (race?.raceId && !isCompletingRef.current) {
      isCompletingRef.current = true;
      await dispatch(
        completeStepRaceThunk({
          raceId: race.raceId,
          finalSteps: currentRaceSteps,
          finalSeconds: elapsedSeconds,
        }),
      )
        .unwrap()
        .catch(() => null);
      router.replace(href.app.home as never);
    }
  };

  if (loading || !race) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  const isLeading = currentRaceSteps >= opponentSimulatedSteps;
  const userProfileSource = getProfileImageSource(user?.profileImageUrl, user?.uid);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />

      <ScreenSafeArea edges={["top", "bottom"]}>
        {/* Floating Header */}
        <View style={styles.headerRow}>
          <PressableScale
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </PressableScale>

          <View style={styles.liveBadge}>
            <CustomText style={[fontTextStyles.body, styles.liveBadgeText]}>Live</CustomText>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{
            paddingTop: SCREEN_CONTENT_PADDING_TOP,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ActiveRaceHero
            userSteps={currentRaceSteps}
            opponentSteps={opponentSimulatedSteps}
            isLeading={isLeading}
            userTimeSeconds={elapsedSeconds}
            targetSteps={targetSteps}
          />

          <ActiveRaceVersusCard
            userSteps={currentRaceSteps}
            userAvatar={userProfileSource}
            userTimeSeconds={elapsedSeconds}
            opponentSteps={opponentSimulatedSteps}
            opponentName={race.opponent.username || "Opponent"}
            opponentUid={race.opponent.uid}
            opponentAvatar={race.opponent.profileImageUrl}
            opponentPaceSeconds={opponentPaceSeconds}
            targetSteps={targetSteps}
          />
        </ScrollView>

        {/* Bottom Fixed Buttons */}
        <View style={{ paddingBottom: 16 }}>
          <ActiveRaceFooter onQuitRace={handleQuitRace} />
        </View>
      </ScreenSafeArea>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRow: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "transparent",
  },
  liveBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  liveBadgeText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
});

export default OngoingStepRaceScreen;


import { Platform, StyleSheet, View } from "react-native";
import { preloadHealthKit } from "@/provider/healthKitLazy";
import RatingPromptModal from "@/components/rating/RatingPromptModal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useHomeRatingPrompt } from "@/hooks/useHomeRatingPrompt";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser, updateUser, refreshCurrentUserProfile } from "@/features/auth";
import { submitUserFeedbackThunk } from "@/features/user";
import {
  selectIsTracking,
  selectTodaySteps,
  setTodaySteps,
} from "../../model/steps.slice";
import {
  initializeStepTracking,
  refreshTodaySteps,
  syncWithGoogleFit,
  loadStepAnalyticsThunk,
  computeStreakFromHistoryThunk,
  getCachedStepStreakThunk,
  refreshPermissionSnapshotThunk,
  resolveServerMergedStepsThunk,
  checkActivityPermissionThunk,
} from "../../model/steps.thunks";
import { formatStreakLabel } from "../components/home.helpers";
import { hydrateExplorePreferences } from "@/features/explore";
import { logError } from "@/config/devLogger";
import HomeScreenContent from "../components/HomeScreenContent";


const HOME_DATA_STALE_MS = 2 * 60 * 1000;

/**
 * Home screen — Figma v2.
 */
const HomeScreen = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (Platform.OS === "ios") preloadHealthKit();
  }, []);
  const user = useAppSelector(selectAuthUser);
  const uid = user?.uid;
  const todaySteps = useAppSelector(selectTodaySteps);
  const isTracking = useAppSelector(selectIsTracking);
  const [refreshing, setRefreshing] = useState(false);
  const [historyMap, setHistoryMap] = useState<Record<string, number>>({});
  const [streakDays, setStreakDays] = useState(0);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const { visible: ratingPromptVisible, closePrompt } = useHomeRatingPrompt(uid);

  const handleOpenFeedback = useCallback(() => {
    setFeedbackModalVisible(true);
  }, []);

  const handleClosePrompt = useCallback(() => {
    closePrompt();
    setFeedbackModalVisible(false);
  }, [closePrompt]);

  const todayStepsRef = useRef(todaySteps);
  todayStepsRef.current = todaySteps;
  const isTrackingRef = useRef(isTracking);
  isTrackingRef.current = isTracking;
  const trackingInitUidRef = useRef<string | null>(null);
  const prevUidRef = useRef<string | null>(null);
  const trackingReadyRef = useRef(false);
  const lastHomeFetchAtRef = useRef(0);

  const streakLabel = useMemo(() => formatStreakLabel(streakDays), [streakDays]);

  // Reset local UI when switching to a different account (not same-account re-login).
  useEffect(() => {
    const prev = prevUidRef.current;
    prevUidRef.current = uid ?? null;

    if (!uid) {
      setHistoryMap({});
      setStreakDays(0);
      trackingInitUidRef.current = null;
      trackingReadyRef.current = false;
      lastHomeFetchAtRef.current = 0;
      return;
    }

    const isDifferentAccount = prev != null && prev !== uid;
    if (isDifferentAccount) {
      setHistoryMap({});
      setStreakDays(0);
      dispatch(setTodaySteps(0));
      dispatch(updateUser({ todaysStepCount: 0 }));
      trackingInitUidRef.current = null;
      trackingReadyRef.current = false;
      lastHomeFetchAtRef.current = 0;
    }

    void dispatch(getCachedStepStreakThunk(uid)).unwrap().then((cached) => {
      setStreakDays(cached);
    }).catch(() => {});
  }, [uid, dispatch]);

  // Recompute streak when live steps or history change (avoids stuck "0 Days").
  useEffect(() => {
    if (!uid || Object.keys(historyMap).length === 0) return;
    void dispatch(computeStreakFromHistoryThunk({ historyMap, todaySteps }))
      .unwrap()
      .then((computed) => setStreakDays(computed))
      .catch(() => {});
  }, [uid, historyMap, todaySteps, dispatch]);

  const refreshPermissionSnapshot = useCallback(async () => {
    await dispatch(refreshPermissionSnapshotThunk()).unwrap();
  }, [dispatch]);

  const loadHomeData = useCallback(
    async (force = false) => {
      if (!uid) return;
      try {
        await dispatch(hydrateExplorePreferences()).unwrap();
        await dispatch(refreshCurrentUserProfile(uid)).unwrap();
        const refreshedUser = user;
        let stepsForStreak = todayStepsRef.current;
        if (refreshedUser) {
          const liveSteps = todayStepsRef.current;
          const serverSteps = refreshedUser.todaysStepCount ?? 0;
          const now = new Date();
          const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          const lastActive = refreshedUser.lastActive ? new Date(refreshedUser.lastActive) : null;
          const lastActiveKey = lastActive
            ? `${lastActive.getFullYear()}-${String(lastActive.getMonth() + 1).padStart(2, "0")}-${String(lastActive.getDate()).padStart(2, "0")}`
            : null;
          const serverIsToday = lastActiveKey === todayKey;

          const mergedSteps = await dispatch(
            resolveServerMergedStepsThunk({ serverSteps, liveSteps, serverIsToday }),
          ).unwrap();

          dispatch(setTodaySteps(mergedSteps));
          todayStepsRef.current = mergedSteps;
          stepsForStreak = mergedSteps;

          if (refreshedUser.todaysStepCount !== mergedSteps) {
            dispatch(
              updateUser({
                ...refreshedUser,
                todaysStepCount: mergedSteps,
              }),
            );
          }
        }
        await Promise.all([
          refreshPermissionSnapshot(),
          (async () => {
            if (!uid) return;
            try {
              const analytics = await dispatch(
                loadStepAnalyticsThunk({
                  uid,
                  stepsForStreak,
                  currentLiveSteps: todayStepsRef.current,
                  force,
                }),
              ).unwrap();

              if (analytics.nextSteps > todayStepsRef.current) {
                dispatch(setTodaySteps(analytics.nextSteps));
                todayStepsRef.current = analytics.nextSteps;
              }
              setHistoryMap(analytics.historyMap);
              setStreakDays(analytics.streakDays);
            } catch (error) {
              logError("loadStreak failed", error);
            }
          })(),
        ]);
        lastHomeFetchAtRef.current = Date.now();
      } catch (error) {
        logError("loadHomeData partial failure", error);
      }
    },
    [dispatch, refreshPermissionSnapshot, uid, user],
  );

  const loadHomeDataRef = useRef(loadHomeData);
  loadHomeDataRef.current = loadHomeData;

  useFocusEffect(
    useCallback(() => {
      if (!uid) return undefined;

      let cancelled = false;
      void (async () => {
        const activityGranted = await dispatch(checkActivityPermissionThunk()).unwrap();
        if (cancelled) return;

        if (!activityGranted) {
          trackingReadyRef.current = false;
          const isStale = Date.now() - lastHomeFetchAtRef.current > HOME_DATA_STALE_MS;
          if (lastHomeFetchAtRef.current === 0 || isStale) {
            await loadHomeDataRef.current(false);
          }
          return;
        }

        const needsInit = trackingInitUidRef.current !== uid || !trackingReadyRef.current;
        if (needsInit) {
          trackingInitUidRef.current = uid;
          await dispatch(initializeStepTracking(uid)).unwrap();
          trackingReadyRef.current = true;
        } else {
          await dispatch(refreshTodaySteps()).unwrap();
        }
        if (cancelled) return;

        if (Platform.OS === "android") {
          try {
            const nextSteps = await dispatch(syncWithGoogleFit()).unwrap();
            if (nextSteps > todayStepsRef.current) {
              todayStepsRef.current = nextSteps;
            }
          } catch {
            // Google Fit not enabled — ignore
          }
        }
        if (cancelled) return;

        const isStale = Date.now() - lastHomeFetchAtRef.current > HOME_DATA_STALE_MS;
        if (lastHomeFetchAtRef.current === 0 || isStale) {
          await loadHomeDataRef.current(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [dispatch, uid]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHomeData(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData]);

  const handleSubmitFeedback = useCallback(
    async (payload: { userId: string; isLiked: boolean; rating?: number; feedback?: string }) => {
      await dispatch(submitUserFeedbackThunk(payload)).unwrap();
    },
    [dispatch],
  );

  return (
    <View style={styles.container}>
      <HomeScreenContent
        user={user}
        todaySteps={todaySteps}
        streakLabel={streakLabel}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onOpenFeedback={handleOpenFeedback}
      />

      {uid ? (
        <RatingPromptModal
          visible={ratingPromptVisible || feedbackModalVisible}
          userId={uid}
          initialStep={feedbackModalVisible ? "feedbackForm" : "enjoying"}
          onClose={handleClosePrompt}
          onSubmitFeedback={handleSubmitFeedback}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101010",
  },
});

export default HomeScreen;

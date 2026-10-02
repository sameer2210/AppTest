import { Platform, RefreshControl, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenImageBackground } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import type { StronUser } from "@/models/user";
import type { StepRace, StepRaceStats } from "@/models/stepRace";
import HomeRaceHero from "./HomeRaceHero";
import HomeQuickActions from "./HomeQuickActions";
import { HomeStronProBanner } from "./HomeStronProBanner";
import HomeOpinionCard from "./HomeCommunityCards";
import ActivityTrackingPermissionCard from "./ActivityTrackingPermissionCard";
import HealthConnectSyncCard from "./HealthConnectSyncCard";
import NotificationPermissionCard from "./NotificationPermissionCard";
import { useProSubscription } from "@/features/gymBusiness";
import { HomeLiveEventCard, HomeLiveRaceCard } from "./live";
import { formatExactSteps } from "./home.helpers";

import { getProfileImageSource } from "@/utils/profileImage.utils";
import { fontTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_CONTENT_PADDING_BOTTOM,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchActiveStepRace,
  fetchStepRaceStats,
  computeLiveStepRaceStatus,
  syncStepRaceLiveNotificationThunk,
  clearStepRaceLiveNotificationThunk,
  type LiveStepRaceStatus,
} from "@/features/stepRace";
import {
  fetchMyActivity,
  fetchEvent,
  syncManagedEventsLiveNotificationThunk,
  clearManagedEventsLiveNotificationThunk,
  type ManagedActivityItem,
} from "@/features/managedEvents";
import { captureEvent } from "@/analytics/posthog/events";
import { isEventOrganizer } from "@/utils/isEventOrganizer";

type ActivityRow = ManagedActivityItem;

type Props = {
  user: StronUser | null;
  todaySteps: number;
  streakLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  onOpenFeedback?: () => void;
};

const formatShadowPace = (bestPaceSeconds?: number) => {
  if (!bestPaceSeconds || bestPaceSeconds <= 0) return "10m 00s/km";
  const minutes = Math.floor(bestPaceSeconds / 60);
  const seconds = Math.floor(bestPaceSeconds % 60);
  return `${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s/km`;
};

const isActiveEventStatus = (status?: string | null, participationStatus?: string | null) => {
  const s = status?.trim().toLowerCase() ?? "";
  const p = participationStatus?.trim().toLowerCase() ?? "";
  if (s === "live" || p === "active") return true;
  return false;
};

const pushLiveNotifications = (
  dispatch: ReturnType<typeof useAppDispatch>,
  race: StepRace | null,
  steps: number,
  events: ActivityRow[],
  userAvatarUrl?: string | null,
  userUid?: string | null,
) => {
  void dispatch(
    syncStepRaceLiveNotificationThunk({
      race,
      todaySteps: steps,
      userAvatarUrl,
      userUid,
    }),
  );
  void dispatch(
    syncManagedEventsLiveNotificationThunk({
      activity: events,
      todaySteps: steps,
    }),
  );
};

const HomeScreenContent = ({ user, todaySteps, refreshing, onRefresh, onOpenFeedback }: Props) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const [raceStats, setRaceStats] = useState<StepRaceStats | null>(null);
  const [activeRace, setActiveRace] = useState<StepRace | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [activeEvents, setActiveEvents] = useState<ActivityRow[]>([]);
  const isFocusedRef = useRef(false);
  const activeEventsRef = useRef<ActivityRow[]>([]);
  activeEventsRef.current = activeEvents;

  const {
    isPro,
    isTrialEligible,
    offeringsPrices,
    refresh: refreshProSubscription,
    subscribe,
    startFreeTrial,
  } = useProSubscription();

  const displayName = user?.username?.trim() || "Runner";
  const profileSource = getProfileImageSource(user?.profileImageUrl, user?.uid);

  const LIVE_POLL_MS = 2000;
  const HOME_DATA_STALE_MS = 15000;

  const todayStepsRef = useRef(todaySteps);
  todayStepsRef.current = todaySteps;
  const isFetchingHomeDataRef = useRef(false);
  const lastFetchedHomeDataAtRef = useRef(0);

  const loadHomeData = useCallback(async (force = false) => {
    try {
      if (!user || user.isGuest) {
        setRaceStats(null);
        setActiveRace(null);
        setActiveEvents([]);
        return;
      }
      const uid = user.uid;
      const now = Date.now();
      if (!force && (isFetchingHomeDataRef.current || now - lastFetchedHomeDataAtRef.current < HOME_DATA_STALE_MS)) {
        return;
      }
      isFetchingHomeDataRef.current = true;
      const [stats, race, activity] = await Promise.all([
        dispatch(fetchStepRaceStats(uid)).unwrap().catch(() => null),
        dispatch(fetchActiveStepRace(uid)).unwrap().catch(() => null),
        dispatch(fetchMyActivity()).unwrap().catch(() => [] as ActivityRow[]),
      ]);
      lastFetchedHomeDataAtRef.current = Date.now();
      if (stats) setRaceStats(stats);
      const live =
        race?.status === "active"
          ? race
          : stats?.currentRace?.status === "active"
            ? stats.currentRace
            : null;
      setActiveRace(live);
      setActiveEvents(
        (activity || [])
          .filter((item) => isActiveEventStatus(item.eventStatus, item.participationStatus))
          .slice(0, 4),
      );
      const events = (activity || []).filter((item) =>
        isActiveEventStatus(item.eventStatus, item.participationStatus),
      );
      pushLiveNotifications(dispatch, live, todayStepsRef.current, events, user?.profileImageUrl, user?.uid);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not load home data.");
    } finally {
      isFetchingHomeDataRef.current = false;
    }
  }, [dispatch, user?.uid, user?.isGuest, user?.profileImageUrl]);

  const loadHomeDataRef = useRef(loadHomeData);
  loadHomeDataRef.current = loadHomeData;
  const refreshProSubscriptionRef = useRef(refreshProSubscription);
  refreshProSubscriptionRef.current = refreshProSubscription;

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      // Always refresh race/events on focus so live status appears immediately.
      void loadHomeDataRef.current(false);
      void refreshProSubscriptionRef.current();
      return () => {
        isFocusedRef.current = false;
      };
    }, []),
  );

  useEffect(() => {
    if (!activeRace || activeRace.status !== "active") return;

    let ticks = 0;
    const tick = () => {
      if (!isFocusedRef.current) return;
      setLiveTick((n) => n + 1);
      ticks += 1;
      if (ticks % 5 === 0) {
        const uid = user?.uid || "current_user";
        void dispatch(fetchActiveStepRace(uid)).unwrap()
          .then((race) => {
            const live = race?.status === "active" ? race : null;
            setActiveRace(live);
            if (live) {
              pushLiveNotifications(
                dispatch,
                live,
                todaySteps,
                activeEventsRef.current,
                user?.profileImageUrl,
                user?.uid,
              );
            } else {
              void dispatch(clearStepRaceLiveNotificationThunk());
            }
          })
          .catch(() => undefined);
        void dispatch(fetchMyActivity()).unwrap()
          .then((activity) => {
            const events = (activity || []).filter((item) =>
              isActiveEventStatus(item.eventStatus, item.participationStatus),
            );
            setActiveEvents(events.slice(0, 4));
            void dispatch(
              syncManagedEventsLiveNotificationThunk({
                activity: events,
                todaySteps,
              }),
            );
          })
          .catch(() => undefined);
      }
    };
    tick();
    const interval = setInterval(tick, LIVE_POLL_MS);
    return () => clearInterval(interval);
  }, [activeRace, dispatch, todaySteps, user?.uid, user?.profileImageUrl]);

  // Keep events notification fresh when there is no live race poll
  useEffect(() => {
    if (activeRace?.status === "active") return;
    if (activeEvents.length === 0) {
      void dispatch(clearManagedEventsLiveNotificationThunk());
      return;
    }
    void dispatch(
      syncManagedEventsLiveNotificationThunk({
        activity: activeEvents,
        todaySteps,
      }),
    );
  }, [activeRace?.status, activeEvents, dispatch, todaySteps]);

  const liveRaceStatus: LiveStepRaceStatus | null = useMemo(() => {
    if (!activeRace || activeRace.status !== "active") return null;
    return computeLiveStepRaceStatus(activeRace, todaySteps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRace, todaySteps, liveTick]);

  const handleProfilePress = useCallback(() => {
    captureEvent("home_profile_tapped");
    router.push(href.app.profile as never);
  }, [router]);

  const handleNotificationPress = useCallback(() => {
    captureEvent("notification_bell_tapped", {});
    router.push(href.app.notifications as never);
  }, [router]);

  const goToRace = useCallback(() => {
    if (activeRace?.status === "active" || raceStats?.currentRace?.status === "active") {
      router.push(href.app.ongoingStepRace as never);
    } else {
      router.push(href.app.stepRace as never);
    }
  }, [activeRace?.status, raceStats?.currentRace?.status, router]);

  const handleStartRacePress = useCallback(() => {
    captureEvent("race_start_tapped");
    goToRace();
  }, [goToRace]);

  const handleCheckIn = useCallback(() => {
    router.push(href.app.connectWithStron as never);
  }, [router]);

  const handleMyRaces = useCallback(() => {
    router.push(href.app.myRaces as never);
  }, [router]);

  const handleMyPlans = useCallback(() => {
    router.push(href.app.myPlans as never);
  }, [router]);

  const handleActiveEventPress = useCallback(
    async (eventKey: string, isOrgFromCard?: boolean) => {
      captureEvent("home_live_card_tapped", { type: "event" });
      if (isOrgFromCard) {
        router.push({
          pathname: href.app.organizerPreview,
          params: { key: eventKey },
        } as never);
        return;
      }
      try {
        const ev = await dispatch(fetchEvent(eventKey)).unwrap();
        if (isEventOrganizer(user, ev.organizerUid)) {
          router.push({
            pathname: href.app.organizerPreview,
            params: { key: eventKey },
          } as never);
          return;
        }
      } catch {
        // Fall back to stronEvent if fetch fails
      }
      router.push({
        pathname: href.app.stronEvent,
        params: { key: eventKey },
      } as never);
    },
    [dispatch, router, user],
  );

  const handlePullRefresh = async () => {
    await Promise.all([onRefresh?.(), loadHomeData(true), refreshProSubscription()]);
  };

  const shadowAwayCount = Math.max(raceStats?.shadowRacesAway ?? 0, 0);
  const shadowSubtext =
    shadowAwayCount > 0
      ? `Ran ${shadowAwayCount} race${shadowAwayCount === 1 ? "" : "s"} while you were away`
      : (raceStats?.totalRaces ?? 0) > 0
        ? "Your pace is ready for new challenges"
        : "Complete your First Race to see Stats";

  const handleProBannerPress = useCallback(() => {
    captureEvent("home_pro_banner_tapped", {});
    if (isTrialEligible) {
      void startFreeTrial();
      return;
    }
    void subscribe();
  }, [isTrialEligible, startFreeTrial, subscribe]);

  const hasLiveRace = Boolean(liveRaceStatus);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge={true} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingTop: topInset + 8,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 90,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={Boolean(refreshing)}
            onRefresh={() => {
              void handlePullRefresh();
            }}
            tintColor="#FFFFFF"
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={Platform.OS === "android"}
      >
        <HomeRaceHero
          avatarSource={profileSource}
          name={displayName}
          todaySteps={formatExactSteps(todaySteps).replace(" Steps", "")}
          onProfilePress={handleProfilePress}
          onNotificationPress={handleNotificationPress}
          onStartRacePress={handleStartRacePress}
          racesToday={raceStats?.racesToday || 0}
          totalRaces={raceStats?.totalRaces || 0}
          wins={raceStats?.wins ?? 0}
          losses={raceStats?.losses ?? 0}
          bestPace={formatShadowPace(raceStats?.bestPaceSeconds)}
          shadowSubtext={shadowSubtext}
          hideRaceCard={hasLiveRace}
          isPro={isPro}
        />

        <ActivityTrackingPermissionCard />
        <HealthConnectSyncCard />
        <NotificationPermissionCard />

        {liveRaceStatus ? (
          <HomeLiveRaceCard
            liveRace={liveRaceStatus}
            onPress={() => {
              captureEvent("home_live_card_tapped", { type: "race" });
              goToRace();
            }}
            userAvatar={profileSource}
            opponentAvatarUrl={activeRace?.opponent?.profileImageUrl}
          />
        ) : null}

        {activeEvents.length > 0 ? (
          <View style={styles.activeEventsSection}>
            <CustomText style={styles.activeEventsLabel}>
              Active events
            </CustomText>
            {activeEvents.map((event) => {
              const isOrg =
                event.role === "organizer" ||
                isEventOrganizer(user, (event as any).organizerUid || (event as any).creatorUid);

              return (
                <HomeLiveEventCard
                  key={event.id}
                  title={event.title}
                  subtitle={
                    isOrg ? "Organizing Event" : event.progressLabel || event.tag || "In progress"
                  }
                  isOrganizer={isOrg}
                  registrationCount={(event as any).registrationCount}
                  progress={isOrg ? null : (event.progressPercent ?? null)}
                  progressLabel={isOrg ? "Manage Event" : event.progressLabel}
                  tag={isOrg ? "ORGANIZER" : event.tag || "Live"}
                  format={event.format}
                  coveredSteps={event.coveredSteps}
                  targetSteps={event.targetSteps}
                  currentDistanceKm={(event as any).currentDistanceKm}
                  targetDistanceKm={(event as any).targetDistanceKm}
                  totalKingSeconds={(event as any).totalKingSeconds}
                  totalWins={(event as any).totalWins}
                  onPress={() => void handleActiveEventPress(event.eventKey, isOrg)}
                />
              );
            })}
          </View>
        ) : null}

        <HomeQuickActions
          onCheckIn={handleCheckIn}
          onRaces={handleMyRaces}
          onPlans={handleMyPlans}
          racesBadge={Boolean(
            (activeRace && activeRace.status === "active") ||
            (raceStats?.currentRace && raceStats.currentRace.status === "active"),
          )}
        />

        {/* STRON PRO Banner (Figma Node 1851:1223) - Only show to non-PRO users */}
        {!isPro ? (
          <HomeStronProBanner
            onPress={handleProBannerPress}
            ctaLabel={offeringsPrices?.cta}
            footerText={
              offeringsPrices?.hasStoreTrial
                ? `Then ${offeringsPrices.monthly || "₹999"}/month · Cancel anytime`
                : `Renews at ${offeringsPrices?.monthly || "₹999"}/month · Cancel anytime`
            }
          />
        ) : null}

        <HomeOpinionCard todaySteps={todaySteps} onOpenFeedback={onOpenFeedback} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#040C1A",
  },
  scrollView: {
    flex: 1,
  },
  activeEventsSection: {
    marginBottom: 4,
  },
  activeEventsLabel: {
    ...fontTextStyles.thirteenNormalBlack,
    color: "rgba(255, 255, 255, 0.55)",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
});

export default HomeScreenContent;

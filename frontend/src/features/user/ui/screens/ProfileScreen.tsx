import {
  Platform,
  TouchableOpacity,
  View,
  ImageBackground,
  Image,
  Dimensions,
  ScrollView,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";

import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { AppScrollView } from "@/components/ui";
import { ProfileScreenSkeleton } from "@/components/skeletons";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  selectAuthUser,
  signOutUser,
  refreshCurrentUserProfile,
  restoreCachedSession,
  updateUser,
} from "@/features/auth";
import {
  selectTodaySteps,
  setTodaySteps,
  refreshTodaySteps,
  syncWithGoogleFit,
  loadStepAnalytics,
  invalidateStepNotificationHistoryCache,
} from "@/features/steps";
import { href } from "@/navigation/href";
import { POLICY_PAGES, SETTINGS_POLICY_LINKS } from "@/constants/policyPages";
import {
  fetchMyActivity,
  fetchRewardPreviews,
  type ManagedActivityItem,
  type StronReward,
} from "@/features/managedEvents";
import {
  updateUserStepGoal,
  updateUserLocation,
  deleteUserAccount,
} from "../../model/user.thunks";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_HORIZONTAL_PADDING,
  SCREEN_HORIZONTAL_PADDING_WIDE,
} from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import ProfileActivityChart from "../components/ProfileActivityChart";
import StepGoalSheet from "../components/StepGoalSheet";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import { LocationPickerModal } from "@/features/explore";
import type { LocationSuggestion } from "@/features/core";
import {
  ActivityChartTab,
  buildMonthChartData,
  buildWeekChartData,
  buildYearChartData,
  canGoNextPeriod,
  getStartOfWeek,
  shiftPeriod,
  localTodayKey,
} from "../profile.utils";
import {
  getProfileImageSource,
  getDeterministicBitmoji,
  isBitmojiUrl,
} from "@/utils/profileImage.utils";
import { images } from "@/utils/images";
import { medalImageForReward, formatRewardDate } from "@/utils/rewards.utils";
import { store } from "@/store";

import {
  clearProfileActivityCache,
  getProfileActivityCache,
  setProfileActivityCache,
} from "@/utils/profileActivityCache";


const PROFILE_STATS_STALE_MS = 60_000;
const PROFILE_CHART_REFRESH_MS = 30 * 60 * 1000;

const ProfileScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const uid = authUser?.uid;
  const todaySteps = useAppSelector(selectTodaySteps);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const currentCache = getProfileActivityCache();
  const cached = uid && currentCache?.uid === uid ? currentCache : null;

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [chartLoading, setChartLoading] = useState(!cached);
  const [historyMap, setHistoryMap] = useState<Record<string, number>>(
    () => cached?.historyMap ?? {},
  );
  const [, setEventCount] = useState(() => cached?.eventCount ?? 0);
  const [, setRecentEvents] = useState(() => cached?.recentEvents ?? []);
  const [rewardPreviews, setRewardPreviews] = useState<StronReward[]>(
    () => cached?.rewardPreviews ?? [],
  );
  const [chartTab, setChartTab] = useState<ActivityChartTab>("WEEK");
  const [weekAnchor, setWeekAnchor] = useState(() => getStartOfWeek(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [yearAnchor, setYearAnchor] = useState(() => new Date());
  const [goalSheetVisible, setGoalSheetVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);

  const todayStepsRef = useRef(todaySteps);
  todayStepsRef.current = todaySteps;
  const lastStatsFetchAtRef = useRef(cached?.fetchedAt ?? 0);
  const prevUidRef = useRef<string | null>(null);

  const liveTodaySteps = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const lastActive = authUser?.lastActive ? new Date(authUser.lastActive) : null;
    const lastActiveKey = lastActive
      ? `${lastActive.getFullYear()}-${String(lastActive.getMonth() + 1).padStart(2, "0")}-${String(lastActive.getDate()).padStart(2, "0")}`
      : null;
    const serverIsToday = lastActiveKey === todayKey;
    const serverSteps = serverIsToday ? (authUser?.todaysStepCount ?? 0) : 0;
    return Math.max(todaySteps, serverSteps);
  }, [todaySteps, authUser?.todaysStepCount, authUser?.lastActive]);

  const anchorDate =
    chartTab === "WEEK" ? weekAnchor : chartTab === "MONTH" ? monthAnchor : yearAnchor;

  useEffect(() => {
    const prev = prevUidRef.current;
    prevUidRef.current = uid ?? null;

    if (!uid) {
      setProfileActivityCache(null);
      lastStatsFetchAtRef.current = 0;
      setHistoryMap({});
      setEventCount(0);
      setRecentEvents([]);
      setRewardPreviews([]);
      return;
    }
    const current = getProfileActivityCache();
    if (current?.uid === uid) {
      setHistoryMap(current.historyMap);
      setEventCount(current.eventCount);
      setRecentEvents(current.recentEvents);
      setRewardPreviews(current.rewardPreviews);
      lastStatsFetchAtRef.current = current.fetchedAt;
      setChartLoading(false);
      return;
    }

    const isDifferentAccount = prev != null && prev !== uid;
    if (isDifferentAccount) {
      setHistoryMap({});
      setEventCount(0);
      setRecentEvents([]);
      setRewardPreviews([]);
      lastStatsFetchAtRef.current = 0;
      dispatch(setTodaySteps(0));
      dispatch(updateUser({ todaysStepCount: 0 }));
    }
  }, [uid, dispatch]);

  useEffect(() => {
    if (!authUser) {
      setLoadingProfile(true);
      void dispatch(restoreCachedSession()).finally(() => setLoadingProfile(false));
    }
  }, [authUser, dispatch]);

  const loadProfile = useCallback(async () => {
    if (!uid) {
      setLoadingProfile(false);
      return;
    }
    // Don't block the whole screen — keep last stats visible.
    try {
      await dispatch(refreshCurrentUserProfile(uid)).unwrap();
    } catch {
      // ignore
    } finally {
      setLoadingProfile(false);
    }
  }, [uid, dispatch]);

  const loadActivityHistory = useCallback(
    async (opts?: { force?: boolean }) => {
      if (!uid) {
        setChartLoading(false);
        return;
      }
      const force = opts?.force === true;
      const hasCache = getProfileActivityCache()?.uid === uid;
      // Keep showing last numbers while refreshing — only spinner when we have nothing yet.
      if (!hasCache) setChartLoading(true);
      try {
        if (force) invalidateStepNotificationHistoryCache();
        // Prefer Redux live steps — ref can lag one frame after refreshTodaySteps.
        const stepsNow = Math.max(todayStepsRef.current, store.getState().steps.todaySteps);
        const [analytics, activityAction, rewardPreviewsAction] = await Promise.all([
          loadStepAnalytics(uid, stepsNow),
          dispatch(fetchMyActivity()),
          dispatch(fetchRewardPreviews()),
        ]);
        const activity = (fetchMyActivity.fulfilled.match(activityAction)
          ? activityAction.payload
          : []) as ManagedActivityItem[];
        const rewardPreviewRows = (fetchRewardPreviews.fulfilled.match(rewardPreviewsAction)
          ? rewardPreviewsAction.payload
          : []) as StronReward[];
        const todayKey = localTodayKey();
        const historyToday = analytics.historyMap[todayKey] ?? 0;
        const liveAfter = Math.max(
          stepsNow,
          store.getState().steps.todaySteps,
          historyToday,
          analytics.streakDays > 0 ? historyToday : 0,
        );
        if (liveAfter > store.getState().steps.todaySteps) {
          dispatch(setTodaySteps(liveAfter));
        }
        todayStepsRef.current = Math.max(todayStepsRef.current, liveAfter);

        const mergedHistoryMap = {
          ...analytics.historyMap,
          [todayKey]: Math.max(analytics.historyMap[todayKey] ?? 0, liveAfter),
        };

        const nextRecent = activity
          .filter((item) => {
            const s = item.eventStatus;
            return s !== "completed" && s !== "settled" && s !== "cancelled";
          })
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            eventKey: item.eventKey,
            title: item.title,
            actionLabel: item.actionLabel,
            tag: item.tag,
            eventStatus: item.eventStatus,
            progressLabel: item.progressLabel ?? null,
            progressPercent: item.progressPercent ?? null,
          }));
        setHistoryMap(mergedHistoryMap);
        setEventCount(activity.length);
        setRewardPreviews(rewardPreviewRows);
        setRecentEvents(nextRecent);
        const fetchedAt = Date.now();
        lastStatsFetchAtRef.current = fetchedAt;
        setProfileActivityCache({
          uid,
          fetchedAt,
          historyMap: mergedHistoryMap,
          eventCount: activity.length,
          recentEvents: nextRecent,
          rewardPreviews: rewardPreviewRows,
        });
      } catch {
        // Keep whatever is already on screen — never wipe to zeros on a failed refresh.
      } finally {
        setChartLoading(false);
      }
    },
    [uid, dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refreshLiveStepsForChart = async () => {
        let live = await dispatch(refreshTodaySteps()).unwrap();
        if (cancelled) return live;

        if (Platform.OS === "android") {
          try {
            const gf = await dispatch(syncWithGoogleFit()).unwrap();
            if (cancelled) return live;
            live = Math.max(live, gf);
          } catch {
            // Google Fit optional — streak still uses whatever we have.
          }
        }

        todayStepsRef.current = live;
        if (live > 0) {
          dispatch(setTodaySteps(live));
          const todayKey = localTodayKey();
          setHistoryMap((prev) => ({
            ...prev,
            [todayKey]: Math.max(prev[todayKey] ?? 0, live),
          }));
        }

        void loadProfile();
        const isStale =
          lastStatsFetchAtRef.current === 0 ||
          Date.now() - lastStatsFetchAtRef.current > PROFILE_STATS_STALE_MS;
        void loadActivityHistory({ force: isStale });
        return live;
      };

      void refreshLiveStepsForChart();

      const intervalId = setInterval(() => {
        if (!cancelled) void refreshLiveStepsForChart();
      }, PROFILE_CHART_REFRESH_MS);

      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, [dispatch, loadProfile, loadActivityHistory]),
  );

  const weekData = useMemo(
    () => buildWeekChartData(weekAnchor, historyMap, liveTodaySteps),
    [weekAnchor, historyMap, liveTodaySteps],
  );

  const monthData = useMemo(
    () => buildMonthChartData(monthAnchor, historyMap, liveTodaySteps),
    [monthAnchor, historyMap, liveTodaySteps],
  );

  const yearData = useMemo(
    () => buildYearChartData(yearAnchor, historyMap, liveTodaySteps),
    [yearAnchor, historyMap, liveTodaySteps],
  );

  const onTabChange = (tab: ActivityChartTab) => {
    setChartTab(tab);
  };

  const onPrevPeriod = () => {
    if (chartTab === "WEEK") {
      setWeekAnchor((prev: Date) => shiftPeriod("WEEK", prev, -1));
    } else if (chartTab === "MONTH") {
      setMonthAnchor((prev: Date) => shiftPeriod("MONTH", prev, -1));
    } else {
      setYearAnchor((prev: Date) => shiftPeriod("YEAR", prev, -1));
    }
  };

  const onNextPeriod = () => {
    if (!canGoNextPeriod(chartTab, anchorDate)) return;
    if (chartTab === "WEEK") {
      setWeekAnchor((prev: Date) => shiftPeriod("WEEK", prev, 1));
    } else if (chartTab === "MONTH") {
      setMonthAnchor((prev: Date) => shiftPeriod("MONTH", prev, 1));
    } else {
      setYearAnchor((prev: Date) => shiftPeriod("YEAR", prev, 1));
    }
  };

  const onSaveGoal = async (goal: number) => {
    if (!uid || !authUser) return;
    setSavingGoal(true);
    try {
      await dispatch(updateUserStepGoal({ uid, goal })).unwrap();
      showToastMessage("Step goal updated");
      setGoalSheetVisible(false);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Failed to update step goal");
    } finally {
      setSavingGoal(false);
    }
  };

  const onSelectLocation = async (loc: LocationSuggestion) => {
    if (!uid || !authUser) return;
    setLocationPickerOpen(false);
    const nextLocation = loc.label || loc.name;
    const nextCity = loc.city || loc.name || null;
    const nextState = loc.state || null;
    try {
      await dispatch(
        updateUserLocation({
          uid,
          location: nextLocation,
          city: nextCity,
          state: nextState,
        }),
      ).unwrap();
      showToastMessage(`Location set to ${loc.name}`);
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Failed to update location");
    }
  };

  const onLogout = () => {
    setLogoutModalVisible(true);
  };

  const goToEditProfile = () => {
    captureEvent("profile_menu_tapped", { item: "edit" });
    router.push(href.app.editProfile);
  };

  const executeLogout = () => {
    setLogoutModalVisible(false);
    void dispatch(signOutUser());
  };

  const onDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  const executeDeleteAccount = async () => {
    if (!uid) return;
    setDeleteModalVisible(false);
    try {
      await dispatch(deleteUserAccount(uid)).unwrap();
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Failed to delete account.");
    }
  };

  if (loadingProfile && !authUser) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletonContainer}>
          <ProfileScreenSkeleton />
        </View>
      </View>
    );
  }

  if (!authUser) {
    return (
      <View style={styles.unauthContainer}>
        <View style={styles.unauthAvatar}>
          <Ionicons name="person-outline" size={40} color="#FFFFFF" />
        </View>
        <CustomText
          text="Not Signed In"
          style={styles.unauthTitle}
        />
        <CustomText
          text="Sign in to track your steps, view analytics, participate in challenges, and manage your gym business."
          style={styles.unauthSubtitle}
        />
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push(href.auth.login as never)}
          activeOpacity={0.7}
        >
          <CustomText text="Sign In / Register" style={styles.signInButtonText} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => void dispatch(signOutUser())}
          activeOpacity={0.7}
        >
          <CustomText text="Log Out / Reset" style={styles.signOutButtonText} />
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = authUser.username?.trim() || "Runner";
  const handle = `@${(authUser.username || "runner").trim().replace(/\s+/g, "_").toLowerCase()}`;
  const shortBio = authUser.shortBio?.trim() || "";
  const bio = authUser.about?.trim() || "";

  const bgImageSource = getProfileImageSource(authUser.profileImageUrl, authUser.uid);
  const isBitmoji = isBitmojiUrl(authUser.profileImageUrl);

  return (
    <View style={styles.container}>
      <Image
        source={images.STEP_RACE.BG}
        style={{
          position: "absolute",
          top: -screenHeight * 0.2,
          left: 0,
          width: screenWidth,
          height: screenHeight * 1.4,
        }}
        resizeMode="stretch"
      />

      <View style={styles.bgHero}>
        {isBitmoji ? (
          <LinearGradient
            colors={["#192B44", "#021124"]}
            style={styles.bitmojiGradient}
          >
            <Image
              key={authUser.profileImageUrl || getDeterministicBitmoji(authUser.uid)}
              source={bgImageSource}
              style={styles.bitmojiImage}
              resizeMode="contain"
            />
          </LinearGradient>
        ) : (
          <ImageBackground
            key={authUser.profileImageUrl || getDeterministicBitmoji(authUser.uid)}
            source={bgImageSource}
            style={styles.coverBackground}
            imageStyle={{ resizeMode: "cover" }}
          />
        )}
        <View style={styles.coverOverlay} />
      </View>

      <AppScrollView
        contentContainerStyle={{ paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 90 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={goToEditProfile}
            activeOpacity={0.7}
          >
            <Ionicons name="pencil" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileCardWrapper}>
          <BlurView
            intensity={30}
            tint="dark"
            style={styles.profileCardBlur}
          >
            <CustomText
              text={displayName}
              style={styles.displayName}
            />
            <CustomText
              text={handle}
              style={styles.handle}
            />

            {shortBio ? (
              <TouchableOpacity
                style={styles.shortBioBadge}
                activeOpacity={0.7}
                onPress={goToEditProfile}
              >
                <CustomText
                  text={shortBio}
                  style={styles.shortBioText}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.shortBioBadge}
                activeOpacity={0.7}
                onPress={goToEditProfile}
              >
                <CustomText
                  text="Add short Bio +"
                  style={styles.addBioText}
                />
              </TouchableOpacity>
            )}

            {bio ? (
              <CustomText
                text={bio}
                style={styles.bioText}
              />
            ) : (
              <TouchableOpacity onPress={goToEditProfile} activeOpacity={0.7}>
                <CustomText
                  text="Add a description from Edit Profile."
                  style={styles.bioPlaceholderText}
                />
              </TouchableOpacity>
            )}
          </BlurView>
        </View>

        {/* Current Location */}
        <View style={styles.sectionWrapper}>
          <TouchableOpacity
            style={styles.locationCard}
            activeOpacity={0.7}
            onPress={() => setLocationPickerOpen(true)}
          >
            <CustomText
              text="Current Location"
              style={styles.locationTitle}
            />
            <CustomText
              text={authUser?.location?.trim() || "Set location"}
              style={styles.locationValue}
              numberOfLines={1}
              ellipsizeMode="tail"
            />
          </TouchableOpacity>
        </View>

        {/* My Rewards — compact medal / certificate strip */}
        <View style={styles.sectionWrapper}>
          <TouchableOpacity
            style={styles.rewardsCard}
            onPress={() => {
              captureEvent("profile_menu_tapped", { item: "rewards" });
              router.push(href.app.eventRewards);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rewardsHeader}>
              <CustomText text="My Rewards" style={styles.cardTitle} />
              <CustomText text="›" style={styles.chevronRight} />
            </View>

            {rewardPreviews.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.rewardScrollContent}
                nestedScrollEnabled
              >
                {rewardPreviews.slice(0, 8).map((reward) => (
                  <View key={reward.id} style={styles.rewardItem}>
                    <Image
                      source={
                        reward.type === "medal"
                          ? medalImageForReward(reward)
                          : images.REWARDS.CERTIFICATE
                      }
                      style={styles.rewardImage}
                      resizeMode="contain"
                    />
                    <CustomText
                      text={reward.eventTitle}
                      style={styles.rewardTitle}
                      numberOfLines={1}
                    />
                    <CustomText
                      text={formatRewardDate(reward.eventDate || reward.issuedAt)}
                      style={styles.rewardDate}
                      numberOfLines={1}
                    />
                  </View>
                ))}
              </ScrollView>
            ) : (
              <CustomText
                text="Medals & certificates appear here after events."
                style={styles.rewardsEmptyText}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* My Orders */}
        <View style={styles.sectionWrapper}>
          <TouchableOpacity
            style={styles.ordersCard}
            activeOpacity={0.7}
            onPress={() => {
              captureEvent("profile_menu_tapped", { item: "orders" });
              router.push(href.app.myOrders);
            }}
          >
            <View style={styles.ordersTextWrapper}>
              <CustomText
                text="My Orders"
                style={styles.ordersTitle}
              />
              <CustomText
                text="Download Invoices of your all orders"
                style={styles.ordersSubtitle}
              />
            </View>
            <Ionicons name="chevron-forward" size={20} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionWrapper}>
          <View style={styles.chartCard}>
            <ProfileActivityChart
              tab={chartTab}
              anchorDate={anchorDate}
              stepGoal={authUser.stepGoal}
              loading={chartLoading}
              liveTodaySteps={liveTodaySteps}
              weekData={weekData}
              monthData={monthData}
              yearData={yearData}
              onTabChange={onTabChange}
              onPrev={onPrevPeriod}
              onNext={onNextPeriod}
              onEditGoal={() => setGoalSheetVisible(true)}
            />
          </View>

          <TouchableOpacity
            style={styles.menuButton}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <CustomText text="Log Out" style={styles.menuDangerText} />
          </TouchableOpacity>

          {SETTINGS_POLICY_LINKS.map((policyId) => (
            <TouchableOpacity
              key={policyId}
              style={styles.menuButtonRow}
              onPress={() =>
                router.push({
                  pathname: href.app.policyWebView,
                  params: { policy: policyId },
                } as never)
              }
              activeOpacity={0.7}
            >
              <CustomText text={POLICY_PAGES[policyId].title} style={styles.menuText} />
              <CustomText text="›" style={styles.menuChevron} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.menuButton}
            onPress={onDeleteAccount}
            activeOpacity={0.7}
          >
            <CustomText text="Delete Account" style={styles.menuDangerText} />
          </TouchableOpacity>
        </View>
      </AppScrollView>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="You're about to delete your account. Continue?"
        titleColor="#FF5454"
        confirmText="Yes, Delete"
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => void executeDeleteAccount()}
      />

      <ConfirmationModal
        visible={logoutModalVisible}
        title="You're about to log out from your account. Continue?"
        titleColor="#FF5454"
        confirmText="Yes, Log Out"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={executeLogout}
      />

      <StepGoalSheet
        visible={goalSheetVisible}
        initialGoal={authUser.stepGoal}
        onClose={() => setGoalSheetVisible(false)}
        onSave={onSaveGoal}
        saving={savingGoal}
      />

      <LocationPickerModal
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        onSelectLocation={(loc) => {
          void onSelectLocation(loc);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#021124",
  },
  skeletonContainer: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
  },
  unauthContainer: {
    flex: 1,
    backgroundColor: "#021124",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  unauthAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  unauthTitle: {
    ...headingTextStyles.h2,
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  unauthSubtitle: {
    ...fontTextStyles.bodyText,
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  signInButton: {
    backgroundColor: "#FFFFFF",
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    width: "100%",
    maxWidth: 280,
  },
  signInButtonText: {
    ...fontTextStyles.buttonText,
    color: "#000000",
    fontWeight: "700",
    fontSize: 15,
  },
  signOutButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 280,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  signOutButtonText: {
    ...fontTextStyles.buttonText,
    color: "#FF8E8E",
    fontWeight: "600",
    fontSize: 15,
  },
  bgHero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    width: "100%",
    overflow: "hidden",
  },
  bitmojiGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  bitmojiImage: {
    width: "100%",
    height: "100%",
    marginTop: 160,
    transform: [{ scale: 1.5 }],
  },
  coverBackground: {
    width: "100%",
    height: "100%",
  },
  coverOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 72,
    gap: 12,
  },
  headerIconButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  profileCardWrapper: {
    marginTop: 150,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    alignItems: "center",
  },
  profileCardBlur: {
    borderRadius: 30,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  displayName: {
    ...headingTextStyles.h1,
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 4,
    fontWeight: "700",
  },
  handle: {
    ...fontTextStyles.bodyText,
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 20,
  },
  shortBioBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 9999,
    marginBottom: 20,
    alignSelf: "center",
    elevation: 1,
  },
  shortBioText: {
    ...fontTextStyles.labelSmall,
    fontSize: 13,
    fontWeight: "600",
    color: "#000000",
  },
  addBioText: {
    ...fontTextStyles.labelSmall,
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  bioText: {
    ...fontTextStyles.bodySmall,
    color: "rgba(255, 255, 255, 0.95)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "400",
  },
  bioPlaceholderText: {
    ...fontTextStyles.bodySmall,
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  sectionWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  locationCard: {
    backgroundColor: "#212121",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  locationTitle: {
    flexShrink: 0,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  locationValue: {
    minWidth: 0,
    flex: 1,
    textAlign: "right",
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  rewardsCard: {
    backgroundColor: "#212121",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: "100%",
  },
  rewardsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  chevronRight: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 22,
  },
  rewardScrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  rewardItem: {
    width: 78,
    alignItems: "center",
  },
  rewardImage: {
    width: 68,
    height: 76,
  },
  rewardTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    marginTop: 4,
    textAlign: "center",
  },
  rewardDate: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  rewardsEmptyText: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  ordersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 1,
  },
  ordersTextWrapper: {
    flex: 1,
    marginRight: 12,
  },
  ordersTitle: {
    ...fontTextStyles.headingSmall,
    fontSize: 16,
    color: "#000000",
    fontWeight: "700",
  },
  ordersSubtitle: {
    ...fontTextStyles.labelSmall,
    color: "#666666",
    fontSize: 12,
    marginTop: 2,
  },
  chartCard: {
    backgroundColor: "#212121",
    borderRadius: 30,
    padding: 20,
    width: "100%",
    marginBottom: 16,
  },
  menuButton: {
    backgroundColor: "#212121",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  menuButtonRow: {
    backgroundColor: "#212121",
    height: 60,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  menuDangerText: {
    color: "#FF8E8E",
    fontSize: 16,
    fontWeight: "600",
  },
  menuText: {
    color: "#FFFFFF",
    fontSize: 16,
  },
  menuChevron: {
    color: "#FFFFFF",
    fontSize: 24,
  },
});

export default ProfileScreen;

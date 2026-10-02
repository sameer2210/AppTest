import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GoogleFitChartSkeleton, InlineButtonSkeleton } from "@/components/skeletons";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import CustomText from "@/components/CustomText";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  loadGoogleFitStats,
  requestGoogleFitAuthorization,
  selectTodaySteps,
  HealthConnectStatus,
} from "@/features/steps";
import { selectAuthUser } from "@/features/auth";
import { showToastMessage } from "@/utils/app-utils";
import { screenContentContainerStyle, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import type { DailyStepData } from "@/models/stepStats";

type StatsTab = "week" | "month";

const BG = "#090909";
const CARD = "#212121";
const ACCENT = "#086CFF";

const formatSteps = (value: number) => value.toLocaleString();

const formatDayLabel = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3).toUpperCase();

const formatMonthDayNumber = (iso: string) => String(new Date(iso).getDate());

const shouldShowMonthLabel = (index: number, total: number, iso: string) => {
  const day = new Date(iso).getDate();
  return index === 0 || index === total - 1 || day === 1 || day % 5 === 0;
};

const GoogleFitStatsScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector(selectAuthUser);
  const todaySteps = useAppSelector(selectTodaySteps);

  const [tab, setTab] = useState<StatsTab>("week");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [weeklyData, setWeeklyData] = useState<DailyStepData[]>([]);
  const [monthlyData, setMonthlyData] = useState<DailyStepData[]>([]);
  const [weeklyTotal, setWeeklyTotal] = useState(0);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const stepGoal = authUser?.stepGoal && authUser.stepGoal > 0 ? authUser.stepGoal : 10000;
  const heroSteps = Math.max(todaySteps, 0);
  const progress = Math.min(1, heroSteps / Math.max(stepGoal, 1));

  const chartData = tab === "week" ? weeklyData : monthlyData;
  const chartTotal = tab === "week" ? weeklyTotal : monthlyTotal;
  const chartAverage = chartData.length ? Math.round(chartTotal / chartData.length) : 0;
  const maxSteps = useMemo(
    () => chartData.reduce((max, item) => Math.max(max, item.steps), 0),
    [chartData],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const stats = await dispatch(loadGoogleFitStats()).unwrap();
      if (stats) {
        setEnabled(true);
        setWeeklyData(stats.weeklyStats.dailyData);
        setMonthlyData(stats.monthlyStats.dailyData);
        setWeeklyTotal(stats.weeklyStats.totalSteps);
        setMonthlyTotal(stats.monthlyStats.totalSteps);
        setLastSync(stats.lastSync);
      }
    } catch {
      showToastMessage("Failed to load Google Fit stats");
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const status = await dispatch(requestGoogleFitAuthorization()).unwrap();
      if (status === HealthConnectStatus.authorized) {
        setEnabled(true);
        await loadData();
        showToastMessage("Connected to Google Fit!");
      } else if (status === HealthConnectStatus.notInstalled) {
        showToastMessage("Please install Health Connect from Play Store");
      } else {
        showToastMessage("Permissions are required to sync steps");
      }
    } catch {
      showToastMessage("Failed to connect to Google Fit");
    } finally {
      setConnecting(false);
    }
  };

  const header = (
    <View style={styles.header}>
      <PressableScale
        onPress={() => router.back()}
        style={styles.headerBtn}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={24} color="#D9D9D9" />
      </PressableScale>
      <CustomText text="Google Fit Stats" style={styles.headerTitle} numberOfLines={1} />
      {Platform.OS === "android" ? (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => void loadData()}
          disabled={loading}
          accessibilityLabel="Refresh"
          activeOpacity={0.7}
        >
          <Ionicons name="refresh" size={22} color="#D9D9D9" />
        </TouchableOpacity>
      ) : (
        <View style={styles.headerBtnSpacer} />
      )}
    </View>
  );

  if (Platform.OS !== "android") {
    return (
      <ScreenSafeArea edges={["top", "bottom"]} style={styles.root}>
        {header}
        <View style={styles.centered}>
          <CustomText
            text="Google Fit sync is available on Android via Health Connect."
            style={styles.subtitle}
          />
        </View>
      </ScreenSafeArea>
    );
  }

  return (
    <ScreenSafeArea edges={["top", "bottom"]} style={styles.root}>
      {header}

      {!enabled ? (
        <View style={styles.centered}>
          <View style={styles.iconCircle}>
            <CustomText text="🏋" style={styles.iconEmoji} />
          </View>
          <CustomText text="Connect Google Fit" style={styles.connectTitle} />
          <CustomText
            text="Sync your step data automatically and view detailed statistics"
            style={styles.subtitle}
          />
          <TouchableOpacity
            style={styles.connectBtn}
            onPress={() => void handleConnect()}
            disabled={connecting}
            activeOpacity={0.7}
          >
            {connecting ? (
              <InlineButtonSkeleton width={96} />
            ) : (
              <CustomText text="Connect Now" style={styles.connectBtnText} />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => void loadData()}
              tintColor="#D9D9D9"
            />
          }
        >
          <View style={styles.heroCard}>
            <CustomText text="Today's Steps" style={styles.heroLabel} />
            <CustomText text={formatSteps(heroSteps)} style={styles.heroValue} />
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
            <CustomText
              text={`${Math.round(progress * 100)}% of ${formatSteps(stepGoal)} goal`}
              style={styles.heroMeta}
            />
            {lastSync ? (
              <CustomText
                text={`Last sync ${new Date(lastSync).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`}
                style={styles.heroMeta}
              />
            ) : null}
          </View>

          <View style={styles.tabRow}>
            {(["week", "month"] as StatsTab[]).map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.tabBtn, tab === item && styles.tabBtnActive]}
                onPress={() => setTab(item)}
                activeOpacity={0.7}
              >
                <CustomText
                  text={item === "week" ? "Weekly" : "Monthly"}
                  style={[styles.tabText, tab === item && styles.tabTextActive]}
                />
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <CustomText text="Total" style={styles.summaryLabel} />
              <CustomText text={formatSteps(chartTotal)} style={styles.summaryValue} />
            </View>
            <View style={styles.summaryCard}>
              <CustomText text="Average" style={styles.summaryLabel} />
              <CustomText text={formatSteps(chartAverage)} style={styles.summaryValue} />
            </View>
          </View>

          {loading && chartData.length === 0 ? (
            <GoogleFitChartSkeleton />
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScrollContent}
            >
              <View style={styles.chartCard}>
                {chartData.map((item, index) => {
                  const barHeight = maxSteps > 0 ? Math.max(10, (item.steps / maxSteps) * 120) : 10;
                  const showValue = tab === "week";
                  const showMonthLabel =
                    tab === "week" || shouldShowMonthLabel(index, chartData.length, item.date);
                  const label =
                    tab === "week"
                      ? formatDayLabel(item.date)
                      : showMonthLabel
                        ? formatMonthDayNumber(item.date)
                        : "";

                  return (
                    <View
                      key={item.date}
                      style={[
                        styles.barColumn,
                        tab === "week" ? styles.barColumnWeek : styles.barColumnMonth,
                      ]}
                    >
                      <View style={styles.barValueWrap}>
                        {showValue ? (
                          <CustomText
                            text={formatSteps(item.steps)}
                            style={styles.barValue}
                            numberOfLines={1}
                          />
                        ) : null}
                      </View>
                      <View
                        style={[
                          styles.bar,
                          tab === "week" ? styles.barWeek : styles.barMonth,
                          {
                            height: barHeight,
                            backgroundColor: item.steps > 0 ? ACCENT : "rgba(255,255,255,0.18)",
                          },
                        ]}
                      />
                      <View style={styles.barLabelWrap}>
                        <CustomText text={label} style={styles.barLabel} numberOfLines={1} />
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </ScrollView>
      )}
    </ScreenSafeArea>
  );
};

export default GoogleFitStatsScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnSpacer: {
    width: 50,
    height: 50,
  },
  headerTitle: {
    ...headingTextStyles.size24ExtraBoldBlack,
    flex: 1,
    color: "#D9D9D9",
    textAlign: "center",
    marginHorizontal: 8,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  iconEmoji: {
    ...fontTextStyles.size48NormalBlack,
  },
  connectTitle: {
    ...headingTextStyles.twentyEightBoldBlack,
    color: "#FFF",
    marginBottom: 12,
  },
  subtitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: 24,
  },
  connectBtn: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
    minWidth: 180,
    alignItems: "center",
  },
  connectBtnText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFF",
  },
  content: screenContentContainerStyle,
  heroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    backgroundColor: CARD,
  },
  heroLabel: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "rgba(255,255,255,0.65)",
  },
  heroValue: {
    ...headingTextStyles.size42ExtraBoldBlack,
    color: "#FFF",
    marginVertical: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: ACCENT,
  },
  heroMeta: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.65)",
    marginTop: 8,
  },
  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: CARD,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: ACCENT },
  tabText: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "rgba(255,255,255,0.65)",
  },
  tabTextActive: { color: "#FFF" },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 14,
  },
  summaryLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
  },
  summaryValue: {
    ...fontTextStyles.twentyFourBoldBlack,
    color: "#FFF",
  },
  chartScrollContent: {
    paddingRight: 8,
  },
  chartCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    minHeight: 210,
  },
  barColumn: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  barColumnWeek: {
    width: 42,
    marginRight: 10,
  },
  barColumnMonth: {
    width: 18,
    marginRight: 6,
  },
  barValueWrap: {
    height: 22,
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  barValue: {
    ...fontTextStyles.twelveNormalBlack,
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.55)",
  },
  bar: {
    marginBottom: 6,
  },
  barWeek: {
    width: 24,
    borderRadius: 8,
  },
  barMonth: {
    width: 10,
    borderRadius: 4,
  },
  barLabelWrap: {
    minHeight: 16,
    justifyContent: "center",
  },
  barLabel: {
    ...fontTextStyles.twelveNormalBlack,
    ...fontTextStyles.fourteenMediumBlack,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
});

import React, { useMemo, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, Image, ScrollView, Alert, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronEventDashboard } from "@/features/managedEvents";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import TicketCard from "../../create/components/TicketCard";
import PreviewHeroCard from "../../preview/components/PreviewHeroCard";
import { useAppDispatch } from "@/store/hooks";
import { cancelManagedEvent } from "@/features/managedEvents";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING } from "@/utils/screen-layout";
import { showToastMessage } from "@/utils/app-utils";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { formatDayMonth } from "../../../shared/formatters";
import { mapRecentRegistrations } from "./mapRecentRegistrations";
import { RewardsAccordion } from "../../../shared/RewardsAccordion";
import CancelledEventBanner from "../../../shared/CancelledEventBanner";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";

type Props = {
  event: StronEvent;
  dashboard: StronEventDashboard;
  onShare: () => void;
  formatRevenue: (val: number) => string;
};

const dateRangeLabel = (event: StronEvent | null) => {
  if (!event) return "TBD";
  const start = formatDayMonth(event.startDate);
  const end = formatDayMonth(event.endDate || event.startDate);
  if (start === end) return start;
  return `${start} - ${end}`;
};

const StandardDashboard = ({ event, dashboard, onShare, formatRevenue }: Props) => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const isRegistrationPhase = event.status === "published" || event.status === "draft";
  const isCancelled = event.status === "cancelled";
  const [activeTab, setActiveTab] = useState<"analytics" | "tickets" | "leaderboard">("analytics");

  const recentRegistrations = useMemo(
    () => mapRecentRegistrations(event, dashboard?.recentRegistrations),
    [event, dashboard?.recentRegistrations],
  );

  const onCancelEvent = () => {
    Alert.alert(
      "Cancel Event",
      "Are you sure you want to cancel this event? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await dispatch(cancelManagedEvent(event.key)).unwrap();
              showToastMessage("Event has been cancelled.");
              router.replace(href.app.organizeCreate);
            } catch (e: any) {
              showToastMessage(e.message || "Could not cancel event.");
            }
          },
        },
      ],
    );
  };

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const topBarHeight = 50;
  const scrollTopPadding = headerTopPadding + topBarHeight + 8;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={{
          paddingTop: scrollTopPadding,
          paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          entering={FadeInDown.duration(360)}
          layout={LinearTransition}
          style={{ paddingHorizontal: SCREEN_HORIZONTAL_PADDING }}
        >
          <PreviewHeroCard
            dateLabel={dateRangeLabel(event)}
            bannerUri={resolveEventBannerUri(event.bannerName) ?? event.bannerName}
            format={event.format}
            listingType={event.listingType}
            isLive={event.status === "live"}
            statusBadge={
              isCancelled
                ? "Cancelled"
                : event.status === "completed" || event.status === "settled"
                  ? "Completed"
                  : event.status === "live"
                    ? "Live"
                    : event.soldOut
                      ? "Sold Out"
                      : "Start Soon"
            }
            statusBadgeTone={
              isCancelled
                ? "danger"
                : event.status === "completed" || event.status === "settled"
                  ? "completed"
                  : event.status === "live"
                    ? "live"
                    : event.soldOut
                      ? "warning"
                      : "default"
            }
            tabs={["Analytics", isRegistrationPhase ? "Tickets" : "Leaderboard"] as any[]}
            activeTab={
              (activeTab === "analytics"
                ? "Analytics"
                : isRegistrationPhase
                  ? "Tickets"
                  : "Leaderboard") as any
            }
            onTabChange={(tab) =>
              setActiveTab(tab === "Analytics" ? "analytics" : (tab.toLowerCase() as any))
            }
            showUpload={!event.bannerName}
            hideTabs={false}
          />
        </Animated.View>

        {isCancelled ? (
          <View style={{ paddingHorizontal: 16 }}>
            <CancelledEventBanner message="This event has been cancelled. Participant registrations are shown below." />
          </View>
        ) : null}

        <View style={styles.organizerSection}>
          <View style={styles.organizerRow}>
            <View style={styles.avatarWrap}>
              <Ionicons name="person" size={24} color="#333" />
            </View>
            <View style={styles.organizerInfo}>
              <CustomText style={styles.orgLabel}>Organized By</CustomText>
              <CustomText style={styles.orgName}>Organizer</CustomText>
            </View>
            <PressableScale style={styles.contactBtn}>
              <CustomText style={styles.contactText}>Contact Now</CustomText>
            </PressableScale>
          </View>
        </View>

        {event.rules && event.rules.length > 0 ? (
          <View style={styles.rulesSection}>
            <View style={styles.rulesCard}>
              <CustomText style={styles.rulesText}>• {event.rules[0]}</CustomText>
            </View>
          </View>
        ) : null}

        <View style={styles.rulesSection}>
          <View style={styles.rulesCard}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name={event.destination ? "location" : "link"} size={20} color="#086CFF" />
              <CustomText style={[styles.rulesText, { marginLeft: 8 }]}>
                {event.destination || event.virtualLink || "Location TBD"}
              </CustomText>
            </View>
          </View>
        </View>

        <View style={styles.rewardsSection}>
          <RewardsAccordion event={event} />
        </View>

        <Animated.View entering={FadeInDown} layout={LinearTransition}>
          {activeTab === "analytics" ? (
            <View style={styles.analyticsTab}>
              <View style={styles.metricsBox}>
                <View style={styles.metricItem}>
                  <View style={styles.metricTop}>
                    <CustomText style={styles.metricVal}>{dashboard.totals?.participantCount || 0}</CustomText>
                    <Ionicons name="people" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </View>
                  <CustomText style={styles.metricLabel}>Registrations</CustomText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <View style={styles.metricTop}>
                    <CustomText style={styles.metricVal}>{dashboard.totals?.participantCount || 0}</CustomText>
                    <Ionicons name="calendar" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </View>
                  <CustomText style={styles.metricLabel}>Check In</CustomText>
                </View>
                <View style={styles.metricDivider} />
                <View style={styles.metricItem}>
                  <View style={styles.metricTop}>
                    <CustomText style={styles.metricVal}>
                      {formatRevenue(dashboard.totals?.grossTicketSales || 0)}
                    </CustomText>
                    <Ionicons name="cash" size={16} color="#FFF" style={{ marginLeft: 4 }} />
                  </View>
                  <CustomText style={styles.metricLabel}>Total Revenue</CustomText>
                </View>
              </View>

              <View style={styles.recentSection}>
                <CustomText style={styles.recentTitle}>Recent Registrations</CustomText>
                <View style={styles.recentList}>
                  {recentRegistrations.length === 0 ? (
                    <CustomText style={styles.emptyText}>No registrations yet.</CustomText>
                  ) : (
                    recentRegistrations.map((item) => (
                      <View key={item.id} style={styles.regRow}>
                        <View style={styles.regAvatar}>
                          <Image
                            source={getProfileImageSource(
                              item.avatarUri,
                              item.avatarUid || item.ticketParams.avatarUid || item.id,
                            )}
                            style={styles.avatarImg}
                          />
                        </View>
                        <View style={styles.regInfo}>
                          <CustomText style={styles.regName}>{item.name}</CustomText>
                          <CustomText style={styles.regTime}>{item.timeAgo}</CustomText>
                        </View>
                        <PressableScale
                          style={styles.viewBtn}
                          onPress={() => {
                            router.push({
                              pathname: href.app.participantDetail,
                              params: item.ticketParams,
                            } as never);
                          }}
                        >
                          <CustomText style={styles.viewBtnText}>View</CustomText>
                        </PressableScale>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </View>
          ) : activeTab === "tickets" && isRegistrationPhase ? (
            <View style={styles.ticketsTab}>
              {event.ticketTypes?.map((t) => (
                <View key={t.id} style={{ marginBottom: 12 }}>
                  <TicketCard ticket={t as any} />
                </View>
              ))}
              <View style={styles.cancelWrap}>
                <PressableScale onPress={onCancelEvent} style={styles.cancelBtn}>
                  <CustomText style={styles.cancelBtnText}>Cancel Event</CustomText>
                </PressableScale>
              </View>
            </View>
          ) : (
            <View style={styles.leaderboardTab}>
              <View style={styles.lbBox}>
                <CustomText style={styles.lbTitle}>Leaderboard is Active</CustomText>
                <CustomText style={styles.lbDesc}>View the full ranking and stats.</CustomText>
                <PressableScale
                  style={styles.viewLbBtn}
                  onPress={() =>
                    router.push({
                      pathname: href.app.organizeLeaderboard,
                      params: { key: event.key },
                    } as any)
                  }
                >
                  <CustomText style={styles.viewLbBtnText}>Open Leaderboard</CustomText>
                </PressableScale>
              </View>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.headerOverlay, { paddingTop: headerTopPadding }]}>
        <View style={styles.topActions}>
          <PressableScale onPress={() => router.back()} style={styles.iconBtn}>
            <BlurView
              intensity={Platform.OS === "ios" ? 36 : 50}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.topBarGlassFill} />
            <Ionicons name="chevron-back" size={22} color="#FFF" style={styles.topBarIcon} />
          </PressableScale>
          <PressableScale onPress={onShare} style={styles.shareBtn}>
            <BlurView
              intensity={Platform.OS === "ios" ? 36 : 50}
              tint="dark"
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.topBarGlassFill} />
            <CustomText style={[styles.topBarIcon, styles.shareText]}>
              Share
            </CustomText>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#090909" },
  flex: { flex: 1 },
  heroWrap: {
    height: 300,
    width: "100%",
    position: "relative",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  bannerPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#191919",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  topActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 20,
  },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  shareBtn: {
    height: 44,
    minWidth: 102,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  topBarGlassFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  topBarIcon: {
    zIndex: 2,
  },
  shareText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  organizerSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  organizerRow: {
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
  },
  organizerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  orgLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.6)",
  },
  orgName: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFF",
    marginTop: 2,
  },
  contactBtn: {
    backgroundColor: "#086CFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  contactText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#FFF",
  },
  rulesSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  rewardsSection: {
    paddingHorizontal: 16,
    marginTop: 14,
  },
  rulesCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
  },
  rulesText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#000",
  },
  tabsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  tabsWrap: {
    alignItems: "center",
  },
  tabsBg: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderRadius: 100,
    flexDirection: "row",
    padding: 4,
    width: "90%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabBtn: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
  tabBtnActive: {
    backgroundColor: "#191919",
  },
  tabText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
  },
  tabTextActive: {
    color: "#FFF",
  },
  analyticsTab: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  metricsBox: {
    backgroundColor: "#086CFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricItem: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  metricTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricVal: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFF",
  },
  metricLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.75)",
    marginTop: 4,
  },
  recentSection: {
    marginTop: 24,
  },
  recentTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFF",
    marginBottom: 12,
  },
  recentList: {
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 16,
  },
  emptyText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  regRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  regAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#D9D9D9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  regInfo: {
    flex: 1,
    marginLeft: 12,
  },
  regName: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFF",
  },
  regTime: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewBtnText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "#000",
  },
  ticketsTab: {
    paddingHorizontal: 16,
  },
  cancelWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  cancelBtn: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#FF3B30",
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  cancelBtnText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FF3B30",
  },
  leaderboardTab: {
    paddingHorizontal: 16,
  },
  lbBox: {
    backgroundColor: "#191919",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
  },
  lbTitle: {
    ...fontTextStyles.twentyTwoNormalBlack,
    color: "#FFF",
    marginBottom: 8,
  },
  lbDesc: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
    marginBottom: 20,
  },
  viewLbBtn: {
    backgroundColor: "#086CFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  viewLbBtnText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFF",
  },
});

export default StandardDashboard;

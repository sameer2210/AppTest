import React, { useEffect, useMemo, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import { View, StyleSheet, Image, ScrollView, TextInput, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";
import { images } from "@/utils/images";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronEventDashboard } from "@/features/managedEvents";
import { formatCount, formatLabelForEvent } from "../../../shared/formatters";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { mapRecentRegistrations } from "./mapRecentRegistrations";
import { getProfileImageSource } from "@/utils/profileImage.utils";
import { duelHowItWorksBullets } from "../../../shared/duelHelpers";
import { resolveEventStatusBadge } from "../../../shared/eventStatusBadge";
import { useAppSelector } from "@/store/hooks";
import EntryPriceCard from "../../../shared/EntryPriceCard";
import { RewardsAccordion } from "../../../shared/RewardsAccordion";
import { formatTicketPriceLabel } from "@/utils/stronFreeTicket";
import { SCREEN_CONTENT_PADDING_TOP, SCREEN_CONTENT_PADDING_BOTTOM, screenContentContainerStyle } from "@/utils/screen-layout";

type Props = {
  event: StronEvent;
  dashboard: StronEventDashboard;
  onShare: () => void;
  formatRevenue: (val: number) => string;
  onEventUpdated?: (event: StronEvent) => void;
};

const formatHeroDate = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
};

const KotHDashboard = ({ event: eventProp, dashboard, onShare, formatRevenue }: Props) => {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const [search, setSearch] = useState("");
  const [event, setEvent] = useState(eventProp);

  useEffect(() => {
    setEvent(eventProp);
  }, [eventProp]);

  const isFaceOff = event.format === "face_off";
  const howBullets = duelHowItWorksBullets(event.format);
  const formatLabel = formatLabelForEvent(event.format);
  const organizerName = user?.username?.trim() || user?.email?.split("@")[0] || "Organizer";
  const organizerAvatar = user?.profileImageUrl || null;

  const recentRegistrations = useMemo(
    () => mapRecentRegistrations(event, dashboard?.recentRegistrations),
    [event, dashboard?.recentRegistrations],
  );

  const filteredRecent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recentRegistrations;
    return recentRegistrations.filter((r) => r.name.toLowerCase().includes(q));
  }, [recentRegistrations, search]);

  const isLive = event.status === "live";
  const isCancelled = event.status === "cancelled";
  const registrationCount = dashboard?.totals?.participantCount ?? event.registrationCount ?? 0;
  const checkInCount = registrationCount;
  const statusBadge = resolveEventStatusBadge({
    status: event.status,
    soldOut: event.soldOut === true,
    format: event.format,
    startDate: event.startDate,
    endDate: event.endDate,
    useDuelDayLabel: true,
    organizerStyle: true,
  }).text;

  const dateLabel = [
    formatHeroDate(event.startDate),
    event.endDate ? formatHeroDate(event.endDate) : null,
  ]
    .filter(Boolean)
    .join(" - ");

  const goEditEvent = () => {
    const pathname =
      event.format === "face_off" ? href.app.createFaceOff : href.app.createKingOfTheHill;
    router.push({
      pathname,
      params: {
        key: event.key,
        format: event.format === "face_off" ? "face_off" : "king_of_the_hill",
      },
    } as never);
  };

  const renderRegistration = (item: (typeof recentRegistrations)[0]) => (
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
  );

  const heroArt = isFaceOff
    ? images.MANAGED_EVENTS.FACE_OFF
    : images.MANAGED_EVENTS.KING_OF_THE_HILL;

  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const topBarHeight = 48;
  const scrollTopPadding = headerTopPadding + topBarHeight + 8;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          screenContentContainerStyle,
          {
            paddingTop: scrollTopPadding,
            paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(360)} layout={LinearTransition}>
          <LinearGradient
            colors={["#4BA3FF", "#086CFF", "#0450C8"]}
            locations={[0, 0.45, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={styles.heroCard}
          >
            <Image source={heroArt} style={styles.heroArt} resizeMode="contain" />

            {statusBadge ? (
              <View style={[styles.statusBadge, isCancelled ? styles.statusBadgeCancelled : null]}>
                <CustomText
                  style={[
                    styles.statusBadgeText,
                    isCancelled ? styles.statusBadgeTextCancelled : null,
                  ]}
                >
                  {statusBadge}
                </CustomText>
              </View>
            ) : null}

            <View style={styles.heroContent}>
              <CustomText style={styles.heroTitle} numberOfLines={3}>
                {event.title || formatLabel}
              </CustomText>
              <CustomText style={styles.heroDate}>{dateLabel}</CustomText>

              <View style={styles.heroFooter}>
                <View style={styles.organizerBlock}>
                  <View style={styles.organizerAvatar}>
                    {organizerAvatar ? (
                      <Image source={{ uri: organizerAvatar }} style={styles.avatarFill} />
                    ) : (
                      <Ionicons name="person" size={16} color="#333" />
                    )}
                  </View>
                  <CustomText style={styles.organizerLine} numberOfLines={2}>
                    {formatLabel} Organized By {organizerName}
                  </CustomText>
                </View>
                <View style={styles.countBlock}>
                  <Ionicons name="people" size={16} color="#FFFFFF" />
                  <CustomText style={styles.countText}>
                    {formatCount(registrationCount).replace("k", "K")}
                  </CustomText>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={styles.howItWorksCard}>
          <CustomText style={styles.howItWorksTitle}>How it Works</CustomText>
          <View style={styles.howItWorksList}>
            {howBullets.map((line) => (
              <CustomText key={line} style={styles.bulletItem}>
                • {line}
              </CustomText>
            ))}
          </View>
        </View>

        {event.ticketTypes?.[0] ? (
          <View style={styles.priceWrap}>
            <EntryPriceCard
              priceLabel={formatTicketPriceLabel(event.ticketTypes[0], event)}
              subtitle={event.ticketTypes[0].label || "Entry ticket"}
            />
          </View>
        ) : null}

        <View style={styles.rewardsWrap}>
          <RewardsAccordion event={event} />
        </View>

        <View style={styles.analyticsCard}>
          <View style={styles.statCol}>
            <Ionicons name="calendar-outline" size={22} color="#FFF" />
            <CustomText style={styles.statVal}>{formatCount(checkInCount)}</CustomText>
            <CustomText style={styles.statLabel}>Check In</CustomText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCol}>
            <Ionicons name="people-outline" size={22} color="#FFF" />
            <CustomText style={styles.statVal}>{formatCount(registrationCount)}</CustomText>
            <CustomText style={styles.statLabel}>Registrations</CustomText>
          </View>
          <View style={styles.divider} />
          <View style={styles.statCol}>
            <Ionicons name="cash-outline" size={22} color="#FFF" />
            <CustomText style={styles.statVal}>
              {formatRevenue(dashboard?.totals?.grossTicketSales || 0)}
            </CustomText>
            <CustomText style={styles.statLabel}>Total Revenue</CustomText>
          </View>
        </View>

        <View style={styles.recentRegContainer}>
          <CustomText style={styles.recentRegTitle}>Recent Registrations</CustomText>
          <View style={styles.searchBar}>
            <TextInput
              placeholder="Search by Name"
              placeholderTextColor="#A0A0A0"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <View style={styles.regList}>
            {filteredRecent.length === 0 ? (
              <CustomText style={styles.emptyRegs}>No registrations found.</CustomText>
            ) : (
              filteredRecent.map(renderRegistration)
            )}
          </View>
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={[styles.headerOverlay, { paddingTop: headerTopPadding }]}>
        <View style={styles.topBar}>
          <PressableScale onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </PressableScale>
          <PressableScale onPress={onShare} style={styles.shareBtn}>
            <CustomText style={styles.shareText}>Share</CustomText>
          </PressableScale>
        </View>
      </View>

      <View style={[styles.floatingBottom, { paddingBottom: 30 }]}>
        {!isLive && !isCancelled ? (
          <PressableScale style={[styles.floatingBtn, styles.editBtn]} onPress={goEditEvent}>
            <CustomText style={styles.editBtnText}>Edit Now</CustomText>
          </PressableScale>
        ) : null}
        <PressableScale
          style={[styles.floatingBtn, styles.leaderboardBtn, isLive && styles.fullWidthBtn]}
          onPress={() => {
            router.push({
              pathname: href.app.organizeLeaderboard,
              params: { key: event.key },
            } as never);
          }}
        >
          <CustomText style={styles.leaderboardBtnText}>Leaderboard</CustomText>
          <View style={styles.leaderboardArrow}>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </View>
        </PressableScale>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  flex: { flex: 1 },
  headerOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareBtn: {
    height: 36,
    paddingHorizontal: 22,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  heroCard: {
    borderRadius: 28,
    minHeight: 240,
    overflow: "hidden",
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
  },
  heroArt: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.28,
    transform: [{ scale: 1.15 }],
  },
  statusBadge: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 2,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    ...fontTextStyles.sixteenSemiBoldBlack,
    color: "#000",
  },
  statusBadgeCancelled: {
    backgroundColor: "#E53935",
  },
  statusBadgeTextCancelled: {
    color: "#FFFFFF",
  },
  heroContent: {
    flex: 1,
    justifyContent: "flex-end",
    zIndex: 1,
  },
  heroTitle: {
    ...fontTextStyles.thirtySixSemiBoldBlack,
    color: "#FFFFFF",
    paddingRight: 88,
  },
  heroDate: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "rgba(255,255,255,0.92)",
    marginTop: 6,
  },
  heroFooter: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  organizerBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  organizerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarFill: {
    width: "100%",
    height: "100%",
  },
  organizerLine: {
    flex: 1,
    color: "#FFFFFF",
  },
  countBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFFFFF",
  },
  howItWorksCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 20,
    marginTop: 14,
  },
  howItWorksTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#000",
    marginBottom: 12,
  },
  howItWorksList: {
    gap: 8,
  },
  bulletItem: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#000",
  },
  priceWrap: {
    marginTop: 14,
  },
  rewardsWrap: {
    marginTop: 14,
  },
  analyticsCard: {
    backgroundColor: "#086CFF",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 14,
  },
  statCol: {
    alignItems: "center",
    flex: 1,
    gap: 4,
  },
  statLabel: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.8)",
  },
  statVal: {
    ...fontTextStyles.twentyFourNormalBlack,
    color: "#FFF",
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  recentRegContainer: {
    marginTop: 22,
    minHeight: 220,
  },
  recentRegTitle: {
    ...fontTextStyles.size24SemiBoldBlack,
    color: "#FFF",
    marginBottom: 14,
  },
  searchBar: {
    backgroundColor: "#2C2C2C",
    borderRadius: 25,
    height: 46,
    paddingHorizontal: 20,
    justifyContent: "center",
    marginBottom: 18,
  },
  searchInput: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "#FFF",
  },
  regList: {
    gap: 15,
  },
  emptyRegs: {
    color: "#aaa",
    textAlign: "center",
    marginTop: 20,
  },
  regRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  regAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#333",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
  },
  regInfo: { flex: 1 },
  regName: {
    ...fontTextStyles.sixteenMediumBlack,
    color: "#FFF",
  },
  regTime: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  viewBtn: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  viewBtnText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: "#000",
  },
  floatingBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    gap: 12,
  },
  floatingBtn: {
    height: 54,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    gap: 10,
    flex: 1,
  },
  editBtn: {
    backgroundColor: "#FFF",
    maxWidth: 140,
  },
  editBtnText: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#000",
  },
  leaderboardBtn: {
    backgroundColor: "rgba(28,28,28,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  fullWidthBtn: {
    maxWidth: 280,
  },
  leaderboardBtnText: {
    ...fontTextStyles.eighteenMediumBlack,
    color: "#FFF",
  },
  leaderboardArrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
});

export default KotHDashboard;

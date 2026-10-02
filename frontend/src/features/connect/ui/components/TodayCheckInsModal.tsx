import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles } from "@/utils/typography";
import type { ConnectScanItem } from "@/features/connect";

const formatTimeAgo = (iso?: string | Date | null): string => {
  if (!iso) return "Just now";
  const timestamp = typeof iso === "string" ? Date.parse(iso) : iso.getTime();
  if (isNaN(timestamp)) return "Just now";

  const diffMs = Date.now() - timestamp;
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `${mins} ${mins === 1 ? "min" : "mins"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  loading: boolean;
  checkInsList: ConnectScanItem[];
  onRefresh: () => void;
};

type DateStripItem = {
  dateObj: Date;
  dayName: string;
  dateNum: string;
  monthName: string;
  shortMonth: string;
  isoDate: string;
};

const keyExtractor = (item: ConnectScanItem) => item.id;
const DATE_ITEM_WIDTH = 58;
const DATE_ITEM_GAP = 10;

export const TodayCheckInsModal: React.FC<Props> = memo(
  ({ visible, onClose, loading, checkInsList, onRefresh }) => {
    const scrollViewRef = useRef<ScrollView>(null);

    const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

    // Generate 15-day date strip around today (today is at index 7)
    const dateStrip = useMemo<DateStripItem[]>(() => {
      const dates: DateStripItem[] = [];
      const today = new Date();
      for (let i = -7; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push({
          dateObj: d,
          dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
          dateNum: String(d.getDate()),
          monthName: d.toLocaleDateString("en-US", { month: "long" }),
          shortMonth: d.toLocaleDateString("en-US", { month: "short" }),
          isoDate: d.toISOString().split("T")[0],
        });
      }
      return dates;
    }, []);

    // Currently selected date (defaults to today)
    const [selectedIsoDate, setSelectedIsoDate] = useState<string>(todayIso);

    const isTodaySelected = selectedIsoDate === todayIso;

    // Month navigation labels (Previous, Selected, Next)
    const monthLabels = useMemo(() => {
      const selected = dateStrip.find((d) => d.isoDate === selectedIsoDate) || dateStrip[7];
      const currMonth = selected.dateObj;
      return {
        curr: currMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      };
    }, [dateStrip, selectedIsoDate]);

    const scrollToDateIndex = useCallback((index: number, animated = true) => {
      if (index < 0 || !scrollViewRef.current) return;
      const screenWidth = Dimensions.get("window").width;
      const itemTotal = DATE_ITEM_WIDTH + DATE_ITEM_GAP;
      const centerOffset = Math.max(
        0,
        index * itemTotal - screenWidth / 2 + DATE_ITEM_WIDTH / 2 + 20,
      );
      scrollViewRef.current.scrollTo({ x: centerOffset, animated });
    }, []);

    useEffect(() => {
      if (visible) {
        const idx = dateStrip.findIndex((d) => d.isoDate === selectedIsoDate);
        const timer = setTimeout(() => {
          scrollToDateIndex(idx >= 0 ? idx : 7, false);
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [visible, dateStrip, selectedIsoDate, scrollToDateIndex]);

    const handleSelectDate = (item: DateStripItem, index: number) => {
      setSelectedIsoDate(item.isoDate);
      scrollToDateIndex(index, true);
    };

    const selectedItem = useMemo(() => {
      return dateStrip.find((d) => d.isoDate === selectedIsoDate) || dateStrip[7];
    }, [dateStrip, selectedIsoDate]);

    // Filter check-ins for the selected date
    const filteredList = useMemo(() => {
      return checkInsList.filter((item) => {
        if (!item.createdAt) return true;
        const itemIso = new Date(item.createdAt).toISOString().split("T")[0];
        return itemIso === selectedIsoDate;
      });
    }, [checkInsList, selectedIsoDate]);

    const renderItem = useCallback(({ item }: { item: ConnectScanItem }) => {
      const username = item.user?.username || "STRON User";
      const initial = (username[0] || "S").toUpperCase();

      return (
        <View style={styles.itemRow}>
          <View style={styles.itemLeftGroup}>
            {item.user?.profileImageUrl ? (
              <Image
                source={{ uri: item.user.profileImageUrl }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarFallback}>
                <CustomText style={styles.avatarInitialText}>{initial}</CustomText>
              </View>
            )}
            <CustomText style={styles.usernameText} numberOfLines={1}>
              {username}
            </CustomText>
          </View>
          <CustomText style={styles.timeAgoText}>
            {formatTimeAgo(item.createdAt)}
          </CustomText>
        </View>
      );
    }, []);

    return (
      <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

          <LinearGradient
            colors={["#040C1A", "#061B40", "#0B3D99", "#1D6AF3"]}
            locations={[0.0, 0.3, 0.7, 1.0]}
            style={styles.flex}
          >
            <ScreenSafeArea>
              <View style={styles.contentContainer}>
                {/* ── TOP HEADER: (X) Close Button & "Check-in History" Title with Safe Area ── */}
                <View style={styles.header}>
                  <PressableScale
                    onPress={onClose}
                    style={styles.closeButton}
                    accessibilityRole="button"
                    accessibilityLabel="Close check-in history"
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </PressableScale>

                  <CustomText style={styles.headerTitle}>Check-in History</CustomText>

                  <View style={styles.headerSpacer} />
                </View>

                {/* ── CURRENT DATE DISPLAY IN THE MIDDLE OF SCREEN ── */}
                <View style={styles.dateDisplay}>
                  <View style={styles.dateDisplayRow}>
                    <CustomText style={styles.selectedDateText}>
                      {selectedItem.dayName}, {selectedItem.shortMonth} {selectedItem.dateNum}
                    </CustomText>
                    {isTodaySelected ? (
                      <View style={styles.todayBadge}>
                        <CustomText style={styles.todayBadgeText}>Today</CustomText>
                      </View>
                    ) : null}
                  </View>
                  <CustomText style={styles.monthLabelText}>
                    {monthLabels.curr}
                  </CustomText>
                </View>

                {/* ── HORIZONTAL DATE STRIP (Centered on Current Date) ── */}
                <View style={styles.dateStripWrapper}>
                  <ScrollView
                    ref={scrollViewRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateStripScrollContent}
                  >
                    {dateStrip.map((item, index) => {
                      const isSelected = item.isoDate === selectedIsoDate;
                      const isToday = item.isoDate === todayIso;

                      return (
                        <TouchableOpacity
                          key={item.isoDate}
                          onPress={() => handleSelectDate(item, index)}
                          activeOpacity={0.7}
                          style={styles.dateStripItem}
                        >
                          {isSelected ? (
                            /* Selected Date Pill Badge (White capsule with black circle for number) */
                            <View style={styles.selectedPill}>
                              <CustomText style={styles.selectedDayText}>
                                {item.dayName}
                              </CustomText>
                              <View style={styles.selectedNumberCircle}>
                                <CustomText style={styles.selectedNumberText}>
                                  {item.dateNum}
                                </CustomText>
                              </View>
                            </View>
                          ) : (
                            /* Normal Unselected Date */
                            <View
                              style={[
                                styles.unselectedPill,
                                isToday && styles.unselectedTodayPill,
                              ]}
                            >
                              <CustomText
                                style={[
                                  styles.unselectedDayText,
                                  isToday && styles.todayAccentText,
                                ]}
                              >
                                {item.dayName}
                              </CustomText>
                              <CustomText
                                style={[
                                  styles.unselectedDateText,
                                  isToday && styles.todayAccentText,
                                ]}
                              >
                                {item.dateNum}
                              </CustomText>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* ── CHECK-INS LIST ── */}
                {loading && checkInsList.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : filteredList.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="scan-circle-outline" size={64} color="rgba(255,255,255,0.3)" />
                    <CustomText style={styles.emptyTitle}>
                      No Check-Ins on {selectedItem.shortMonth} {selectedItem.dateNum}
                    </CustomText>
                    <CustomText style={styles.emptySubtitle}>
                      {isTodaySelected
                        ? "Scan a QR code or enter code manually to check in."
                        : "Select another date or check in today."}
                    </CustomText>
                  </View>
                ) : (
                  <FlatList
                    data={filteredList}
                    keyExtractor={keyExtractor}
                    refreshControl={
                      <RefreshControl
                        refreshing={loading}
                        onRefresh={onRefresh}
                        tintColor="#FFFFFF"
                      />
                    }
                    contentContainerStyle={styles.listContent}
                    renderItem={renderItem}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            </ScreenSafeArea>
          </LinearGradient>
        </View>
      </Modal>
    );
  },
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030914" },
  flex: { flex: 1 },
  contentContainer: { flex: 1, paddingTop: 8, paddingBottom: 30, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  closeButton: { width: 46, height: 46, alignItems: "center", justifyContent: "center", borderRadius: 23, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.2)", backgroundColor: "rgba(255, 255, 255, 0.1)" },
  headerTitle: { ...fontTextStyles.twentyEightBoldBlack, color: "#FFFFFF" },
  headerSpacer: { width: 46 },
  dateDisplay: { alignItems: "center", justifyContent: "center", marginVertical: 10 },
  dateDisplayRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  selectedDateText: { ...fontTextStyles.twentyEightBoldBlack, color: "#FFFFFF", textAlign: "center" },
  todayBadge: { borderRadius: 999, backgroundColor: "rgba(113, 186, 255, 0.25)", borderWidth: 1, borderColor: "rgba(113, 186, 255, 0.5)", paddingHorizontal: 10, paddingVertical: 2 },
  todayBadgeText: { ...fontTextStyles.tenBoldBlack, color: "#90CBFF" },
  monthLabelText: { ...fontTextStyles.twelveNormalBlack, color: "rgba(255, 255, 255, 0.6)", marginTop: 2 },
  dateStripWrapper: { marginVertical: 12 },
  dateStripScrollContent: { paddingHorizontal: 6, gap: DATE_ITEM_GAP, alignItems: "center" },
  dateStripItem: { width: DATE_ITEM_WIDTH, alignItems: "center", justifyContent: "center" },
  selectedPill: { width: "100%", backgroundColor: "#FFFFFF", borderRadius: 24, paddingVertical: 8, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFFFFF" },
  selectedDayText: { ...fontTextStyles.tenBoldBlack, color: "#000000", marginBottom: 4 },
  selectedNumberCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#000000", alignItems: "center", justifyContent: "center" },
  selectedNumberText: { ...fontTextStyles.sixteenBoldBlack, color: "#FFFFFF" },
  unselectedPill: { width: "100%", alignItems: "center", paddingVertical: 8, borderRadius: 20 },
  unselectedTodayPill: { borderWidth: 1, borderColor: "rgba(113, 186, 255, 0.4)", backgroundColor: "rgba(255, 255, 255, 0.05)" },
  unselectedDayText: { ...fontTextStyles.twelveMediumBlack, marginBottom: 4, color: "rgba(255, 255, 255, 0.7)" },
  unselectedDateText: { ...fontTextStyles.sixteenBoldBlack, color: "#FFFFFF" },
  todayAccentText: { color: "#71BAFF" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  emptyTitle: { marginTop: 16, textAlign: "center", ...fontTextStyles.twentyTwoBoldBlack, color: "#FFFFFF" },
  emptySubtitle: { marginTop: 4, textAlign: "center", ...fontTextStyles.fourteenNormalBlack, color: "rgba(255, 255, 255, 0.6)" },
  listContent: { paddingBottom: 24, paddingTop: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255, 255, 255, 0.05)" },
  itemLeftGroup: { flexDirection: "row", alignItems: "center", gap: 14, flex: 1, paddingRight: 12 },
  avatarImage: { width: 50, height: 50, borderRadius: 25, backgroundColor: "rgba(255, 255, 255, 0.1)" },
  avatarFallback: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#E5B58D", alignItems: "center", justifyContent: "center" },
  avatarInitialText: { ...fontTextStyles.twentyTwoBoldBlack, color: "#FFFFFF" },
  usernameText: { ...fontTextStyles.sixteenMediumBlack, color: "#FFFFFF", flex: 1 },
  timeAgoText: { ...fontTextStyles.twelveNormalBlack, color: "rgba(179, 212, 255, 0.7)" },
});

TodayCheckInsModal.displayName = "TodayCheckInsModal";

export default TodayCheckInsModal;

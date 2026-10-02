import React from "react";
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { TicketListSkeleton } from "@/components/skeletons";
import { href } from "@/navigation/href";
import { captureEvent } from "@/analytics/posthog/events";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import {
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_HORIZONTAL_PADDING,
  screenContentContainerStyle,
} from "@/utils/screen-layout";
import { OrganizerContactSheet } from "@/components/sheets/OrganizerContactSheet";
import {
  TICKET_FILTERS,
  EVENT_FORMATS,
  CHALLENGE_FORMATS,
  useActivityData,
  ActivityEventCard,
  ActivityChallengeCard,
  ActivityRulesModal,
} from "../components/activity";

export const ActivityScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const {
    activeFilter,
    setActiveFilter,
    loading,
    refreshing,
    onRefresh,
    groupedSections,
    emptyMessage,
    openEvent,
    openContactModal,
    closeContactModal,
    contactModalVisible,
    contactSeed,
    openRulesModal,
    closeRulesModal,
    rulesModalVisible,
    rulesBullets,
  } = useActivityData();

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#5BA8FF", "#086CFF", "#0548B0", "#000B18"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.headerContainer, { paddingTop: topInset + 8 }]}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <PressableScale
            style={styles.closeButton}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(href.app.home as never);
              }
            }}
            accessibilityLabel="Close tickets"
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </PressableScale>

          <View style={styles.headerTitleCol}>
            <CustomText style={[headingTextStyles.h1, styles.headerTitle]}>
              My Tickets
            </CustomText>
            <CustomText style={[fontTextStyles.body, styles.headerSubtitle]}>
              Events & Challenges
            </CustomText>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {TICKET_FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  activeOpacity={0.7}
                  onPress={() => {
                    captureEvent("tickets_filter_changed", { category: filter });
                    setActiveFilter(filter);
                  }}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                >
                  <CustomText
                    text={filter}
                    style={[fontTextStyles.sixteenNormalBlack, { color: "#FFFFFF" }]}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {loading ? (
          <TicketListSkeleton count={4} />
        ) : groupedSections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={48} color="rgba(255,255,255,0.4)" />
            <CustomText style={styles.emptyText}>{emptyMessage}</CustomText>
          </View>
        ) : (
          groupedSections.map((section) => (
            <View key={section.key} style={styles.sectionContainer}>
              {/* Format Section Header */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionIndicator} />
                  <CustomText style={[fontTextStyles.sixteenBoldBlack, styles.sectionTitle]}>
                    {section.title}
                  </CustomText>
                </View>
                <View style={styles.ticketCountBadge}>
                  <CustomText
                    style={[fontTextStyles.twelveMediumBlack, styles.ticketCountText]}
                  >
                    {section.items.length} {section.items.length === 1 ? "Ticket" : "Tickets"}
                  </CustomText>
                </View>
              </View>

              {/* Section Ticket Cards */}
              {section.items.map((item) => {
                const isEventCard =
                  EVENT_FORMATS.has(item.format || "") ||
                  (!CHALLENGE_FORMATS.has(item.format || "") && item.role === "participant");

                if (isEventCard) {
                  return (
                    <ActivityEventCard
                      key={item.id}
                      item={item}
                      openEvent={openEvent}
                      openContactModal={openContactModal}
                      openRulesModal={openRulesModal}
                    />
                  );
                }

                return (
                  <ActivityChallengeCard
                    key={item.id}
                    item={item}
                    openEvent={openEvent}
                    openRulesModal={openRulesModal}
                  />
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <OrganizerContactSheet
        visible={contactModalVisible}
        onClose={closeContactModal}
        seed={contactSeed}
      />

      <ActivityRulesModal
        visible={rulesModalVisible}
        onClose={closeRulesModal}
        rulesBullets={rulesBullets}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
    paddingBottom: 4,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  filterPill: {
    marginRight: 8,
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 37,
    paddingHorizontal: 20,
    backgroundColor: "rgba(33, 33, 33, 0.6)",
  },
  filterPillActive: {
    backgroundColor: "#2A80FF",
  },
  scrollContent: screenContentContainerStyle,
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    marginTop: 12,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIndicator: {
    width: 6,
    height: 16,
    borderRadius: 999,
    backgroundColor: "#2A80FF",
  },
  sectionTitle: {
    color: "#FFFFFF",
  },
  ticketCountBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  ticketCountText: {
    color: "rgba(255, 255, 255, 0.7)",
  },
});

export default ActivityScreen;

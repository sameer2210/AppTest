import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { href } from "@/navigation/href";
import { PressableScale, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectPendingCatalog, clearPendingCatalog } from "../../model/connect.slice";
import { fetchConnectCatalog, scanConnectQr } from "../../model/connect.thunks";
import { patchMemberAutoRenew } from "@/features/gymBusiness";
import ConfirmationModal from "@/components/confirmation/ConfirmationModal";
import {
  CategoryFilterBar,
  type CategoryType,
  CheckInResultOverlay,
  type CheckInResultState,
  EventSelectionCard,
  type EventItem,
  PlanSelectionCard,
  type MembershipPlan,
  OfferBanner,
  SpecialOfferModal,
} from "../components";
import { useCheckInSelectionData } from "../hooks/useCheckInSelectionData";
import { useGymPlanPurchase } from "../hooks/useGymPlanPurchase";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";


type SmartQrViewMode = "explore" | "plans" | "listings" | "plans_and_listings";

const paramString = (raw: string | string[] | undefined): string | undefined => {
  if (raw == null) return undefined;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? String(value) : undefined;
};

const CheckInSelectionScreen = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{
    entityName?: string;
    plansJson?: string;
    eventsJson?: string;
    scanId?: string;
    targetUid?: string;
    providerUid?: string;
    businessId?: string;
    viewMode?: string;
  }>();

  const pendingCatalog = useAppSelector(selectPendingCatalog);
  const [initialStored] = useState(() => pendingCatalog);
  const scanId = initialStored?.scanId || paramString(params.scanId);
  const targetUid = paramString(params.providerUid) || paramString(params.targetUid);
  const businessId = paramString(params.businessId);
  const isPartnerCatalog = Boolean(targetUid || businessId || scanId || initialStored);
  const viewMode = (paramString(params.viewMode) || "plans_and_listings") as SmartQrViewMode;

  const [entityName, setEntityName] = useState(
    (initialStored?.entityName || "").trim() ||
      paramString(params.entityName)?.trim() ||
      (isPartnerCatalog ? "Check-in" : "My Plans"),
  );
  const filterCategories = useMemo((): CategoryType[] | undefined => {
    if (!isPartnerCatalog) return undefined;
    if (viewMode === "plans") return ["Subscriptions"];
    if (viewMode === "listings") return ["In-Person Events"];
    return ["All", "In-Person Events", "Subscriptions"];
  }, [isPartnerCatalog, viewMode]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>(() => {
    if (!isPartnerCatalog) return "Events";
    if (viewMode === "plans") return "Subscriptions";
    if (viewMode === "listings") return "In-Person Events";
    return "All";
  });
  const [submitting, setSubmitting] = useState(false);
  const [checkInState, setCheckInState] = useState<CheckInResultState | null>(null);
  const [isSpecialOfferModalOpen, setIsSpecialOfferModalOpen] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(isPartnerCatalog);
  const [confirmDisablePlan, setConfirmDisablePlan] = useState<MembershipPlan | null>(null);
  const [autoRenewBusyId, setAutoRenewBusyId] = useState<string | null>(null);
  const { purchasePlan, isPurchasing } = useGymPlanPurchase();

  const {
    plans: fallbackPlans,
    events: fallbackEvents,
    isLoading: isLoadingFallback,
    setPlans,
    setEvents,
  } = useCheckInSelectionData(
    isPartnerCatalog ? undefined : paramString(params.plansJson),
    isPartnerCatalog ? undefined : paramString(params.eventsJson),
    isPartnerCatalog
      ? {
          initialPlans: (initialStored?.plans as MembershipPlan[] | undefined) || [],
          initialEvents: (initialStored?.events as EventItem[] | undefined) || [],
          skipFetch: true,
        }
      : undefined,
  );

  const [plans, setLocalPlans] = useState<MembershipPlan[]>(
    () => (initialStored?.plans as MembershipPlan[] | undefined) || [],
  );
  const [events, setLocalEvents] = useState<EventItem[]>(
    () => (initialStored?.events as EventItem[] | undefined) || [],
  );

  useEffect(() => {
    if (!isPartnerCatalog) {
      setLocalPlans(fallbackPlans);
      setLocalEvents(fallbackEvents);
    }
  }, [fallbackPlans, fallbackEvents, isPartnerCatalog]);

  useEffect(() => {
    if (!isPartnerCatalog) {
      setLoadingCatalog(false);
      return;
    }

    let cancelled = false;
    setLoadingCatalog(true);

    void (async () => {
      try {
        const catalog = await dispatch(
          fetchConnectCatalog({
            targetUid,
            businessId,
            scanId,
          }),
        ).unwrap();
        if (cancelled) return;
        const nextName = catalog.entityName || entityName;
        const nextPlans = (catalog.plans || []) as MembershipPlan[];
        const nextEvents = (catalog.events || []) as EventItem[];
        setEntityName(nextName);
        setLocalPlans(nextPlans);
        setLocalEvents(nextEvents);
        setPlans(nextPlans);
        setEvents(nextEvents);
      } catch {
        if (!cancelled && plans.length === 0 && events.length === 0) {
          showToastMessage("Could not load partner services.");
        }
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();

    return () => {
      cancelled = true;
      dispatch(clearPendingCatalog());
    };
    // Fetch once per navigation identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUid, businessId, scanId, isPartnerCatalog, dispatch]);

  const isLoading = isPartnerCatalog ? loadingCatalog : isLoadingFallback;

  const handlePlanCheckIn = useCallback(
    async (plan: MembershipPlan) => {
      if (submitting || isPurchasing) return;
      if ((plan as MembershipPlan & { isServiceTag?: boolean }).isServiceTag) {
        showToastMessage("This is a listed service. Ask the provider for a membership plan.");
        return;
      }
      setSubmitting(true);
      try {
        const targetGymId = plan.businessId || plan.id;
        const result = await dispatch(
          scanConnectQr(`GYM|${encodeURIComponent(targetGymId)}|${entityName}`),
        ).unwrap();
        if (result.kind !== "gym_check_in" && result.kind !== "station_check_in") {
          throw new Error("Unexpected check-in response.");
        }
        const already = Boolean(result.alreadyCheckedIn);
        setCheckInState({
          status: already ? "failed" : "success",
          title: already ? "Already\nChecked In" : "Check in\nSuccessful",
          subtitle:
            result.message ||
            (already
              ? `Already checked into ${entityName}`
              : `Checked into ${entityName} (${plan.name} Plan)`),
          buttonText: "Great, Let's Go",
          onPressAction: () => {
            setCheckInState(null);
            router.back();
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Check-in failed.";
        setCheckInState({
          status: "failed",
          title: "Check in\nFailed",
          subtitle: message,
          buttonText: "Try Again",
          onPressAction: () => setCheckInState(null),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatch, entityName, isPurchasing, router, submitting],
  );

  const handleEventCheckIn = useCallback(
    async (event: EventItem) => {
      if (submitting) return;
      setSubmitting(true);
      try {
        const result = await dispatch(
          scanConnectQr(`STATION|event|${encodeURIComponent(event.id)}|${event.title}`),
        ).unwrap();
        if (result.kind !== "station_check_in" && result.kind !== "event_check_in") {
          throw new Error("Unexpected check-in response.");
        }
        const already = Boolean(result.alreadyCheckedIn);
        const eventKey = result.kind === "event_check_in" ? result.eventKey : event.id;
        setCheckInState({
          status: already ? "failed" : "success",
          title: already ? "Already\nChecked In" : "Check in\nSuccessful",
          subtitle: result.message || `Checked into ${event.title}`,
          buttonText: "View Event",
          onPressAction: () => {
            setCheckInState(null);
            if (eventKey) {
              router.push({
                pathname: href.app.stronEvent,
                params: { key: eventKey },
              } as never);
            } else {
              router.push(href.app.home as never);
            }
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Check-in failed.";
        setCheckInState({
          status: "failed",
          title: "Check in\nFailed",
          subtitle: message,
          buttonText: "Try Again",
          onPressAction: () => setCheckInState(null),
        });
      } finally {
        setSubmitting(false);
      }
    },
    [dispatch, router, submitting],
  );

  const handleSelectPlan = useCallback(
    async (plan: MembershipPlan) => {
      if (submitting || isPurchasing) return;
      if ((plan as MembershipPlan & { isServiceTag?: boolean }).isServiceTag) {
        showToastMessage("This is a listed service. Ask the provider for a membership plan.");
        return;
      }
      const gymId = plan.businessId || businessId;
      if (!gymId) {
        showToastMessage("Gym not found for this plan.");
        return;
      }
      await purchasePlan({
        businessId: gymId,
        planId: plan.id,
        planName: plan.name,
        amountLabel: plan.price,
        entityName,
        scanId,
        autoRenew: Boolean(plan.autoRenew),
        isFreeTrial: Boolean(plan.isFreeTrial),
      });
    },
    [businessId, entityName, isPurchasing, purchasePlan, scanId, submitting],
  );

  const applyAutoRenew = useCallback(
    async (plan: MembershipPlan, enabled: boolean) => {
      if (!plan.membershipId || autoRenewBusyId) return;
      setAutoRenewBusyId(plan.membershipId);
      const res = await dispatch(patchMemberAutoRenew({ membershipId: plan.membershipId, enabled })).unwrap();
      setAutoRenewBusyId(null);
      if (!res.success) {
        showToastMessage(res.message || "Failed to update auto-renew.");
        return;
      }
      setLocalPlans((prev) =>
        prev.map((item) =>
          item.membershipId === plan.membershipId ? { ...item, autoRenew: enabled } : item,
        ),
      );
      showToastMessage(
        res.message ||
          (enabled
            ? "Auto-renew enabled. Your plan will renew 1 day before expiry."
            : "Auto-renew disabled. Gym access continues until the current plan end date."),
      );
    },
    [autoRenewBusyId, dispatch],
  );

  const handleAutoRenewChange = useCallback(
    (plan: MembershipPlan, enabled: boolean) => {
      if (!plan.membershipId) return;
      if (!enabled) {
        setConfirmDisablePlan(plan);
        return;
      }
      void applyAutoRenew(plan, true);
    },
    [applyAutoRenew],
  );

  const handleSelectEvent = useCallback(
    (event: EventItem) => {
      if (event.isEnrolled) {
        void handleEventCheckIn(event);
        return;
      }
      router.push({
        pathname: href.app.stronEvent,
        params: { key: event.eventKey || event.id },
      } as never);
    },
    [handleEventCheckIn, router],
  );

  if (checkInState) {
    return <CheckInResultOverlay state={checkInState} onDismiss={() => setCheckInState(null)} />;
  }

  const showEventsSection =
    viewMode !== "plans" &&
    viewMode !== "explore" &&
    (selectedCategory === "Events" ||
      selectedCategory === "Challenges" ||
      selectedCategory === "Games" ||
      selectedCategory === "All" ||
      selectedCategory === "In-Person Events");

  const showPlansSection =
    viewMode !== "listings" &&
    viewMode !== "explore" &&
    (selectedCategory === "Subscriptions" || selectedCategory === "All");

  const filteredEvents = showEventsSection
    ? events.filter((e) => {
        const format = (e.format || "").toLowerCase();
        if (
          selectedCategory === "Events" ||
          selectedCategory === "All" ||
          selectedCategory === "In-Person Events"
        ) {
          return true;
        }
        if (selectedCategory === "Challenges") {
          return format.includes("step") || format.includes("king") || format.includes("challenge");
        }
        if (selectedCategory === "Games") {
          return format.includes("face") || format.includes("game");
        }
        return false;
      })
    : [];

  const filteredPlans = showPlansSection
    ? isPartnerCatalog
      ? plans
      : plans.filter((p) => p.isBought)
    : [];

  const hasNoItems = !isLoading && filteredPlans.length === 0 && filteredEvents.length === 0;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={["#2563EB", "#1E40AF", "#050B18"]}
        locations={[0.0, 0.25, 0.5]}
        style={styles.gradient}
      >
        <ScreenSafeArea>
          <View
            style={[
              styles.content,
              {
                paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
              },
            ]}
          >
            <View style={styles.headerRow}>
              <PressableScale
                onPress={() => router.back()}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
              </PressableScale>

              <CustomText
                style={styles.headerTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {entityName}
              </CustomText>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="large" />
                <CustomText style={styles.loadingText}>
                  {isPartnerCatalog ? "Loading services…" : "Loading…"}
                </CustomText>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                <CategoryFilterBar
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  categories={filterCategories}
                />

                <View style={styles.offerBannerWrapper}>
                  <OfferBanner onPress={() => setIsSpecialOfferModalOpen(true)} />
                </View>

                {hasNoItems ? (
                  <View style={styles.emptyStateCard}>
                    <View style={styles.emptyIconCircle}>
                      <Ionicons name="receipt-outline" size={32} color="#FFFFFF" />
                    </View>
                    <CustomText style={styles.emptyTitle}>
                      No{" "}
                      {selectedCategory === "Subscriptions"
                        ? "Plans"
                        : selectedCategory === "Events"
                          ? "Events"
                          : selectedCategory}{" "}
                      Found
                    </CustomText>
                    <CustomText style={styles.emptySubtitle}>
                      {selectedCategory === "Subscriptions"
                        ? "You haven't purchased any membership plans yet."
                        : `No active ${selectedCategory.toLowerCase()} available for check-in.`}
                    </CustomText>
                    <PressableScale
                      onPress={() => router.push(href.app.explore as never)}
                      style={styles.exploreButton}
                    >
                      <CustomText style={styles.exploreButtonText}>
                        Explore Gyms & Plans
                      </CustomText>
                    </PressableScale>
                  </View>
                ) : (
                  <>
                    {filteredPlans.length > 0 ? (
                      <View style={styles.section}>
                        <CustomText style={styles.sectionTitle}>
                          {isPartnerCatalog ? "Subscriptions & Services" : "Plans"}
                        </CustomText>
                        {filteredPlans.map((plan) => (
                          <PlanSelectionCard
                            key={plan.id}
                            plan={plan}
                            onCheckIn={(item) => {
                              void handlePlanCheckIn(item);
                            }}
                            onSelectPlan={handleSelectPlan}
                            onAutoRenewChange={handleAutoRenewChange}
                            autoRenewBusy={Boolean(
                              plan.membershipId && autoRenewBusyId === plan.membershipId,
                            )}
                          />
                        ))}
                      </View>
                    ) : null}

                    {filteredPlans.length > 0 && filteredEvents.length > 0 ? (
                      <View style={styles.divider} />
                    ) : null}

                    {filteredEvents.length > 0 ? (
                      <View style={styles.section}>
                        <CustomText style={styles.sectionTitle}>
                          {selectedCategory === "All" ? "Events" : selectedCategory}
                        </CustomText>
                        {filteredEvents.map((event) => (
                          <EventSelectionCard
                            key={event.id}
                            event={event}
                            onCheckIn={(item) => {
                              void handleEventCheckIn(item);
                            }}
                            onSelectEvent={handleSelectEvent}
                          />
                        ))}
                      </View>
                    ) : null}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </ScreenSafeArea>
      </LinearGradient>

      <SpecialOfferModal
        visible={isSpecialOfferModalOpen}
        onClose={() => setIsSpecialOfferModalOpen(false)}
        offerCode="STRONMARATHON202526"
        redeemUrl="https://stron.in"
      />

      <ConfirmationModal
        visible={Boolean(confirmDisablePlan)}
        title="Turn off auto-renew?"
        message="Gym access continues until the current plan end date. You can turn auto-renew back on later."
        cancelText="Keep on"
        confirmText="Turn off"
        onCancel={() => setConfirmDisablePlan(null)}
        onConfirm={() => {
          const plan = confirmDisablePlan;
          setConfirmDisablePlan(null);
          if (plan) void applyAutoRenew(plan, false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050B18",
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
  },
  headerRow: {
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  headerTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
    flex: 1,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.7)",
    marginTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  offerBannerWrapper: {
    marginBottom: 20,
  },
  emptyStateCard: {
    marginVertical: 32,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    ...fontTextStyles.fourteenNormalBlack,
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    maxWidth: 260,
    marginBottom: 24,
  },
  exploreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#1E65FF",
  },
  exploreButtonText: {
    ...fontTextStyles.fourteenBoldBlack,
    color: "#FFFFFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 14,
  },
  divider: {
    marginVertical: 12,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
});

export default CheckInSelectionScreen;

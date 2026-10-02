import { useCallback, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMyActivity,
  selectManagedEventsActivity,
} from "@/features/managedEvents";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import { buildFormatGameRules } from "../../shared/formatGameRules";
import type { OrganizerContactSeed } from "@/components/sheets/OrganizerContactSheet";
import {
  type ActivityItem,
  type SectionGroup,
  type TicketFilter,
  getFormatSectionKey,
  isEventCompleted,
} from "./activity.types";

export const useActivityData = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<TicketFilter>("All");
  const rawActivity = useAppSelector(selectManagedEventsActivity);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactSeed, setContactSeed] = useState<OrganizerContactSeed | null>(null);

  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [selectedRulesItem, setSelectedRulesItem] = useState<ActivityItem | null>(null);

  const openContactModal = useCallback((item: ActivityItem) => {
    const initialPhone = (
      item.contactPhone ||
      item.organizerPhone ||
      item.supportPhone ||
      item.contactNumber ||
      item.phone ||
      ""
    ).trim();
    const initialEmail = (
      item.contactEmail ||
      item.organizerEmail ||
      item.supportEmail ||
      item.email ||
      ""
    ).trim();
    setContactSeed({
      organizerUid:
        item.organizerUid || item.organizerId || item.creatorUid || item.creatorId || null,
      eventKey: item.eventKey || null,
      phone: initialPhone,
      email: initialEmail,
    });
    setContactModalVisible(true);
  }, []);

  const openRulesModal = useCallback((item: ActivityItem) => {
    setSelectedRulesItem(item);
    setRulesModalVisible(true);
  }, []);

  const closeRulesModal = useCallback(() => {
    setRulesModalVisible(false);
  }, []);

  const closeContactModal = useCallback(() => {
    setContactModalVisible(false);
    setContactSeed(null);
  }, []);

  const rulesBullets = useMemo(() => {
    if (!selectedRulesItem) return [];
    return buildFormatGameRules({
      format: (selectedRulesItem.format || "marathon") as any,
      ticketTypes: (selectedRulesItem.ticketTypes || []) as any,
      endDate: selectedRulesItem.deadlineDate || null,
      durationDays: selectedRulesItem.targetDays ?? null,
      successfulDaysRequired: selectedRulesItem.requiredDays ?? null,
      rules: [],
    });
  }, [selectedRulesItem]);

  const recentItems = useMemo<ActivityItem[]>(() => {
    return (rawActivity || []).map((item) => {
      const raw = item as any;
      const winsFromBackend = raw.totalWins ?? raw.wins ?? raw.userWins;
      const rawOrgName =
        raw.organizerName || raw.organizer?.name || raw.creatorName || raw.organizationName;
      const tickets = Array.isArray(raw.ticketTypes) ? raw.ticketTypes : [];
      const matched =
        tickets.find(
          (t: any) => t && raw.ticketTypeId && String(t.id) === String(raw.ticketTypeId),
        ) || tickets[0];
      const format = String(raw.format || "");
      const dailyStepTarget =
        Number(raw.dailyStepTarget || matched?.dailyStepTarget || 0) || null;
      const targetSteps =
        format === "virtual_step_challenge"
          ? Number(dailyStepTarget || raw.targetSteps || 0) || null
          : Number(raw.targetSteps || matched?.targetSteps || 0) || null;
      const coveredSteps =
        raw.coveredSteps != null
          ? Number(raw.coveredSteps)
          : raw.currentSteps != null
            ? Number(raw.currentSteps)
            : null;

      return {
        id: item.id,
        role: item.role,
        eventKey: item.eventKey,
        title: item.title,
        tag: item.tag,
        date: item.date,
        actionLabel: item.actionLabel,
        eventStatus: item.eventStatus,
        participationStatus: item.participationStatus ?? null,
        format: item.format,
        progressPercent: item.progressPercent ?? null,
        progressLabel: item.progressLabel ?? null,
        rewardKind: item.rewardKind ?? null,
        medalTier: item.medalTier ?? null,
        rewardFormat: item.rewardFormat ?? null,
        contactPhone: item.contactPhone ?? null,
        contactEmail: item.contactEmail ?? null,
        organizerPhone: item.organizerPhone ?? null,
        organizerEmail: item.organizerEmail ?? null,
        supportPhone: raw.supportPhone ?? null,
        supportEmail: raw.supportEmail ?? null,
        contactNumber: raw.contactNumber ?? null,
        phone: item.phone ?? null,
        email: item.email ?? null,
        organizerUid: item.organizerUid ?? null,
        organizerId: item.organizerId ?? null,
        creatorUid: item.creatorUid ?? null,
        creatorId: item.creatorId ?? null,
        userId: item.userId ?? null,
        coverImageUrl: raw.coverImageUrl || raw.bannerUrl || null,
        organizerName: rawOrgName?.trim() || "Organizer",
        organizerLogoUrl:
          raw.organizerLogoUrl || raw.organizerAvatar || raw.organizer?.avatar || null,
        registrationCount:
          raw.registrationCount != null ? Number(raw.registrationCount) : undefined,
        rank: raw.rank ?? raw.resultRank ?? null,
        totalWins: typeof winsFromBackend === "number" ? winsFromBackend : null,
        kingTime: raw.kingTime ?? null,
        totalKingSeconds: raw.totalKingSeconds != null ? Number(raw.totalKingSeconds) : null,
        targetSteps,
        currentSteps: coveredSteps,
        coveredSteps,
        dailyStepTarget,
        targetDistanceKm:
          raw.targetDistanceKm != null
            ? Number(raw.targetDistanceKm)
            : matched?.distanceKm != null
              ? Number(matched.distanceKm)
              : null,
        currentDistanceKm: raw.currentDistanceKm != null ? Number(raw.currentDistanceKm) : null,
        daysLeft: raw.daysLeft ?? null,
        successfulDays: raw.successfulDays != null ? Number(raw.successfulDays) : null,
        requiredDays:
          raw.requiredDays != null
            ? Number(raw.requiredDays)
            : matched?.days != null
              ? Number(matched.days)
              : null,
        mapUrl: raw.mapUrl || raw.locationUrl || raw.mapLink || null,
        destination: raw.destination || null,
        deadlineDate: item.endDate || raw.deadlineDate || null,
        targetDays: raw.targetDays || null,
        isExternal: Boolean(
          raw.isExternal ||
            raw.listingType === "external" ||
            raw.listingType === "self_managed" ||
            raw.listingType === "redirect" ||
            raw.format === "external" ||
            raw.format === "redirect",
        ),
        listingType: raw.listingType || null,
        ticketTypes: tickets,
      };
    });
  }, [rawActivity]);

  const load = useCallback(async () => {
    try {
      await dispatch(fetchMyActivity()).unwrap();
    } catch (error) {
      showToastMessage(error instanceof Error ? error.message : "Could not load tickets.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      setActiveFilter("All");
      void load();
    }, [load]),
  );

  const openEvent = useCallback(
    (
      eventKey: string,
      _role: "participant" | "organizer" = "participant",
      eventStatus?: string | null,
    ) => {
      const targetKey = (eventKey || "").trim();
      if (!targetKey) {
        showToastMessage("Challenge key not found.");
        return;
      }
      captureEvent("ticket_opened", { event_key: targetKey, tab: activeFilter });
      if (isEventCompleted(eventStatus)) {
        router.push(href.app.eventRewards as never);
        return;
      }
      router.push({
        pathname: href.app.stronEvent,
        params: { key: targetKey },
      } as never);
    },
    [activeFilter, router],
  );

  const groupedSections = useMemo(() => {
    const filtered = recentItems.filter((item) => {
      const format = (item.format || "").toLowerCase();
      const isExternalEvent =
        item.isExternal ||
        item.listingType === "external" ||
        item.listingType === "self_managed" ||
        item.listingType === "redirect" ||
        format === "external" ||
        format === "redirect";

      switch (activeFilter) {
        case "Challenges":
          return (
            (format === "virtual_step_challenge" || format === "step_challenge") && !isExternalEvent
          );

        case "Events":
          return format === "marathon" || isExternalEvent;

        case "Games":
          return (
            format === "king_of_the_hill" ||
            format === "koth" ||
            format === "face_off" ||
            format === "faceoff"
          );

        case "All":
        default:
          return true;
      }
    });

    const map = new Map<string, SectionGroup>();
    const sectionOrder = [
      "marathon",
      "step_challenge",
      "koth",
      "face_off",
      "other_challenge",
      "external_event",
    ];

    for (const item of filtered) {
      const { key, title } = getFormatSectionKey(item, activeFilter);
      if (!map.has(key)) {
        map.set(key, { key, title, items: [] });
      }
      map.get(key)!.items.push(item);
    }

    return sectionOrder
      .map((k) => map.get(k))
      .filter((group): group is SectionGroup => group != null && group.items.length > 0);
  }, [recentItems, activeFilter]);

  const emptyMessage = useMemo(() => {
    switch (activeFilter) {
      case "Challenges":
        return "No challenge tickets found";
      case "Events":
        return "No event tickets found";
      case "Games":
        return "No game tickets found";
      case "All":
      default:
        return "No tickets found";
    }
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void load();
  }, [load]);

  return {
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
  };
};

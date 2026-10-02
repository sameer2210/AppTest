import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { uploadClanBannerThunk } from "@/features/core";
import {
  fetchEvent,
  fetchEventDashboard,
  updateManagedEvent,
  deleteManagedEvent,
  cancelManagedEvent,
} from "@/features/managedEvents";
import type { StronEventDashboard } from "@/features/managedEvents";
import type { StronEvent } from "@/models/stronManaged/event";
import type { DraftTicket } from "../create/components/CreateTicketModal";
import { showToastMessage } from "@/utils/app-utils";
import { shareEvent } from "@/utils/shareEvent";
import { resolveEventBannerUri } from "@/utils/resolveRemoteImageUri";
import { isEventOrganizer } from "@/utils/isEventOrganizer";
import { buildFormatGameRules } from "../../shared/formatGameRules";
import { formatLabelForEvent } from "../../shared/formatters";
import { resolveEventStatusBadge } from "../../shared/eventStatusBadge";
import { LIVE_LEADERBOARD_POLL_MS } from "../liveLeaderboard";
import { href } from "@/navigation/href";

const formatDayMonth = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
};

const dateRangeLabel = (startIso?: string | null, endIso?: string | null) => {
  const start = formatDayMonth(startIso);
  const end = formatDayMonth(endIso || startIso);
  if (start === end) return start;
  return `${start} - ${end}`;
};

export const useOrganizerPreview = (eventKey?: string) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<StronEvent | null>(null);
  const [dashboard, setDashboard] = useState<StronEventDashboard | null>(null);
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [stopSaleModalVisible, setStopSaleModalVisible] = useState(false);
  const [startSaleModalVisible, setStartSaleModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [editTicketModalVisible, setEditTicketModalVisible] = useState(false);

  const isLive = event?.status === "live";
  const isCancelled = event?.status === "cancelled";
  const isCompleted = event?.status === "completed" || event?.status === "settled";
  const isClosed = event?.status === "closed" || event?.status === "ended";
  const isSoldOut =
    event?.soldOut === true ||
    (event?.capacity != null &&
      event?.capacity > 0 &&
      (event?.registrationCount ?? 0) >= event?.capacity);
  const isTicketSaleStopped = event?.capacity === 0;
  const isDuelFormat = event?.format === "king_of_the_hill" || event?.format === "face_off";
  const isExternalListing =
    event?.listingType === "external" ||
    /^External listing \(/i.test(String(event?.description || ""));

  const load = useCallback(
    async (opts?: { soft?: boolean }) => {
      if (!eventKey) {
        setLoading(false);
        return;
      }
      if (!opts?.soft) setLoading(true);
      try {
        const next = await dispatch(fetchEvent(eventKey)).unwrap();
        setEvent(next);
        if (!opts?.soft) {
          setBannerUri(resolveEventBannerUri(next.bannerName) || null);
        }

        const isOwner = isEventOrganizer(user, next.organizerUid);
        if (isOwner) {
          try {
            const dash = await dispatch(fetchEventDashboard(eventKey)).unwrap();
            setDashboard(dash);
          } catch {
            if (!opts?.soft) setDashboard(null);
          }
        } else if (!opts?.soft) {
          setDashboard(null);
        }
      } catch (error) {
        if (!opts?.soft) {
          showToastMessage((error as Error)?.message || "Could not load event preview.");
        }
      } finally {
        if (!opts?.soft) setLoading(false);
      }
    },
    [dispatch, eventKey, user],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!eventKey) return;
    if (
      event?.status === "completed" ||
      event?.status === "settled" ||
      event?.status === "cancelled"
    ) {
      return;
    }
    const timer = setInterval(() => {
      void load({ soft: true });
    }, LIVE_LEADERBOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [eventKey, event?.status, load]);

  const share = useCallback(async () => {
    if (!event) return;
    await shareEvent({ title: event.title, eventKey: event.key });
  }, [event]);

  const onUploadBanner = useCallback(async () => {
    if (!event?.key || uploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToastMessage("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    setUploading(true);
    try {
      const localUri = result.assets[0].uri;
      setBannerUri(localUri);
      const url = await dispatch(uploadClanBannerThunk({ uri: localUri })).unwrap();
      const updated = await dispatch(
        updateManagedEvent({ key: event.key, payload: { bannerName: url } }),
      ).unwrap();
      setEvent(updated);
      setBannerUri(resolveEventBannerUri(updated.bannerName) || url);
      showToastMessage("Logo saved.");
    } catch (error) {
      setBannerUri(resolveEventBannerUri(event.bannerName) || null);
      showToastMessage((error as Error)?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [dispatch, event, uploading]);

  const handleSaveEditTickets = useCallback(
    async (ticket: DraftTicket) => {
      if (!event?.key) return;
      try {
        const existingTickets = (event.ticketTypes || []).map((t, idx) => ({
          id: t.id || `t${idx + 1}`,
          label: t.label,
          price: t.price,
          distanceKm: t.distanceKm != null ? t.distanceKm : undefined,
          dailyStepTarget: t.dailyStepTarget != null ? t.dailyStepTarget : undefined,
          days: t.days != null ? t.days : undefined,
          benefits: t.benefits || "",
        }));

        const idx = existingTickets.findIndex((t) => t.id === ticket.id || t.label === ticket.label);
        if (idx >= 0) {
          existingTickets[idx] = {
            ...existingTickets[idx],
            label: ticket.label || existingTickets[idx].label,
            price: Number(ticket.price) >= 0 ? Number(ticket.price) : existingTickets[idx].price,
            benefits: ticket.benefits || existingTickets[idx].benefits,
          };
        } else {
          existingTickets.push({
            id: ticket.id || `t${existingTickets.length + 1}`,
            label: ticket.label || "Standard",
            price: Number(ticket.price) || 0,
            distanceKm: ticket.distanceKm,
            dailyStepTarget: ticket.dailyStepTarget,
            days: ticket.days,
            benefits: ticket.benefits || "",
          });
        }

        await dispatch(
          updateManagedEvent({ key: event.key, payload: { tickets: existingTickets } }),
        ).unwrap();
        showToastMessage("Ticket and pricing updated successfully.");
        setEditTicketModalVisible(false);
        void load();
      } catch (error) {
        showToastMessage((error as Error)?.message || "Could not update ticket.");
      }
    },
    [dispatch, event, load],
  );

  const handleStopSale = useCallback(async () => {
    if (!event?.key) return;
    setStopSaleModalVisible(false);
    try {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      await dispatch(
        updateManagedEvent({
          key: event.key,
          payload: { capacity: 0, registrationEndDate: pastDate },
        }),
      ).unwrap();
      showToastMessage("Ticket sales stopped.");
      void load();
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not stop ticket sale.");
    }
  }, [dispatch, event?.key, load]);

  const handleStartSale = useCallback(async () => {
    if (!event?.key) return;
    setStartSaleModalVisible(false);
    try {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await dispatch(
        updateManagedEvent({
          key: event.key,
          payload: { capacity: 10000, registrationEndDate: futureDate },
        }),
      ).unwrap();
      showToastMessage("Ticket sales re-opened.");
      void load();
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not start ticket sale.");
    }
  }, [dispatch, event?.key, load]);

  const handleDeleteEvent = useCallback(async () => {
    if (!event?.key) return;
    setDeleteModalVisible(false);
    try {
      await dispatch(deleteManagedEvent(event.key)).unwrap();
      showToastMessage("Event deleted successfully.");
      router.replace(href.app.organizeCreate);
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not delete event.");
    }
  }, [dispatch, event?.key, router]);

  const handleCancelEvent = useCallback(async () => {
    if (!event?.key) return;
    setCancelModalVisible(false);
    try {
      await dispatch(cancelManagedEvent(event.key)).unwrap();
      showToastMessage("Event cancelled.");
      void load();
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not cancel event.");
    }
  }, [dispatch, event?.key, load]);

  const dateLabel = isDuelFormat
    ? dateRangeLabel(event?.startDate, event?.endDate)
    : formatDayMonth(event?.startDate);

  const statusBadge = resolveEventStatusBadge({
    status: event?.status,
    soldOut: isSoldOut,
    registrationClosed: isClosed || isTicketSaleStopped,
    format: event?.format,
    startDate: event?.startDate,
    endDate: event?.endDate,
    useDuelDayLabel: isDuelFormat,
    organizerStyle: true,
  });

  const gameRulesList = useMemo(() => {
    if (!event) return [];
    return buildFormatGameRules(event);
  }, [event]);

  const startingPriceLabel = useMemo(() => {
    if (!event?.ticketTypes?.length) return "Starting Price ₹299";
    const prices = event.ticketTypes.map((t) => t.price);
    const minPrice = Math.min(...prices);
    return minPrice === 0 ? "Free Event" : `Starting Price ₹${minPrice}`;
  }, [event?.ticketTypes]);

  const shortDateRange = useMemo(() => {
    if (!event?.startDate) return "25 Feb - 03 Mar";
    const start = new Date(event.startDate);
    const end = event.endDate ? new Date(event.endDate) : start;
    const startStr = start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const endStr = end.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    return startStr === endStr ? startStr : `${startStr} - ${endStr}`;
  }, [event?.startDate, event?.endDate]);

  const titleOverride = isDuelFormat && event?.format ? formatLabelForEvent(event.format) : null;

  return {
    loading,
    event,
    dashboard,
    bannerUri,
    uploading,
    isLive,
    isCancelled,
    isCompleted,
    isSoldOut,
    isTicketSaleStopped,
    isDuelFormat,
    isExternalListing,
    dateLabel,
    statusBadge,
    heroStatusBadge: statusBadge.text,
    heroStatusBadgeTone: statusBadge.tone,
    gameRulesList,
    startingPriceLabel,
    shortDateRange,
    titleOverride,
    stopSaleModalVisible,
    setStopSaleModalVisible,
    startSaleModalVisible,
    setStartSaleModalVisible,
    deleteModalVisible,
    setDeleteModalVisible,
    cancelModalVisible,
    setCancelModalVisible,
    editTicketModalVisible,
    setEditTicketModalVisible,
    load,
    share,
    onUploadBanner,
    handleSaveEditTickets,
    handleStopSale,
    handleStartSale,
    handleDeleteEvent,
    handleCancelEvent,
  };
};

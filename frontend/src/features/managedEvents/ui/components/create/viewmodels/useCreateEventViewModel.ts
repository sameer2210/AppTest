import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { showToastMessage } from "@/utils/app-utils";
import {
  fetchEvent,
  fetchMyOrganizer,
  upsertOrganizer,
  updateManagedEvent,
  createMarathonEvent,
  createStepChallengeEvent,
  publishManagedEvent,
  type StronApiError,
} from "@/features/managedEvents";
import { uploadClanBannerThunk } from "@/features/core";
import { href } from "@/navigation/href";
import type { DraftTicket } from "../components/CreateTicketModal";
import type { ListingType, MarathonMode, StronEventStatus } from "@/models/stronManaged/event";
import {
  isFreeEvent,
  stampFreeEventDescription,
  stampFreeEventRules,
  stripFreeEventMarker,
  stripFreeTicketMarker,
} from "@/utils/stronFreeTicket";

export const today = () => {
  const d = new Date();
  d.setHours(0, 0, 1, 0);
  return d;
};

export const tomorrow = () => {
  const d = new Date();
  d.setHours(0, 0, 1, 0);
  d.setDate(d.getDate() + 1);
  return d;
};

export const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfDay = (d: Date) => {
  const next = new Date(d);
  next.setHours(0, 0, 1, 0);
  return next;
};

export const endOfDay = (d: Date) => {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
};

export const diffDays = (start: Date, end: Date) => {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
};

const parseDay = (iso?: string | null, fallback: Date = today()) => {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return startOfDay(d);
};

type CreateEventOptions = {
  initialMarathonMode?: MarathonMode;
  listingType?: ListingType;
  /** When set, load this event and PATCH on save instead of create+publish. */
  editKey?: string;
};

export const useCreateEventViewModel = (
  format: "marathon" | "step_challenge",
  options: CreateEventOptions = {},
) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const editKey = (options.editKey || "").trim();
  const isEditing = Boolean(editKey);

  // Common Event State
  const [title, setTitle] = useState("");
  const [organizerName, setOrganizerName] = useState(
    user?.username?.trim() || user?.email?.split("@")[0] || "",
  );
  const [capacity, setCapacity] = useState(""); // Default empty string = unlimited/infinity
  const [quickPrice, setQuickPrice] = useState("");
  const [description, setDescription] = useState("");
  const [timeDate, setTimeDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 1, 0);
    return d;
  });
  const timeLabel = "12:00:01 AM IST";
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [startDate, setStartDate] = useState(tomorrow());
  const [registrationStartDate, setRegistrationStartDate] = useState(() => new Date());
  const [registrationEndDate, setRegistrationEndDate] = useState(() => addDays(tomorrow(), 30));

  // Marathon Specific
  const [marathonMode, setMarathonMode] = useState<MarathonMode>(
    options.initialMarathonMode ?? "virtual",
  );
  const [listingType, setListingType] = useState<ListingType>(
    options.listingType ?? "stron_managed",
  );
  const [venue, setVenue] = useState("");
  const [virtualLink, setVirtualLink] = useState("");
  const [endDate, setEndDate] = useState(() => addDays(today(), 30));

  // Marathon: distance (km). Step challenge: daily step target.
  // Days: ticket window / successful days — NOT event durationDays.
  const [goalAmount, setGoalAmount] = useState(format === "marathon" ? "5" : "10000");
  const [goalDays, setGoalDays] = useState(format === "marathon" ? "7" : "7");
  // Event calendar length for marathon / step challenge.
  const [durationDays, setDurationDays] = useState("3");
  const [successfulDaysRequired, setSuccessfulDaysRequired] = useState("7");

  const [rewardLabels, setRewardLabels] = useState<string[]>(["e-Certificate", "e-Medal"]);
  const [participantInfoFields, setParticipantInfoFields] = useState<string[]>([
    "T-Shirt Size",
    "Contact Name",
    "Contact Number",
    "Emergency Contact Number",
    "Blood Group",
  ]);
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  // UI State
  const [tickets, setTickets] = useState<DraftTicket[]>([]);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<DraftTicket | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [freeEvent, setFreeEvent] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [eventStatus, setEventStatus] = useState<StronEventStatus | null>(null);

  const [datePicker, setDatePicker] = useState<
    "start" | "end" | "reg" | "regStart" | "time" | null
  >(null);
  const [textEditor, setTextEditor] = useState<"description" | "virtualLink" | null>(null);
  const [textDraft, setTextDraft] = useState("");

  const canEditStartDate = !isEditing || eventStatus === "draft";

  useEffect(() => {
    if (!isEditing || !editKey) {
      setLoadingEdit(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      try {
        const event = await dispatch(fetchEvent(editKey)).unwrap();
        if (cancelled) return;

        setEventStatus(event.status || null);
        setVisibility(event.visibility === "private" ? "private" : "public");
        setTitle(event.title || "");
        setOrganizerName(user?.username?.trim() || user?.email?.split("@")[0] || "Organizer");
        setDescription(stripFreeEventMarker(event.description || ""));
        setCapacity(event.capacity != null ? String(event.capacity) : "");

        const banner = String(event.bannerName || "").trim();
        setBannerName(banner || null);
        setBannerUri(banner && /^https?:\/\//i.test(banner) ? banner : banner || null);

        const start = parseDay(event.startDate);
        setStartDate(start);
        const duration = Math.max(1, Number(event.durationDays) || 30);
        setDurationDays(String(duration));
        setEndDate(addDays(start, duration));
        setRegistrationStartDate(parseDay(event.registrationStartDate, startOfDay(new Date())));
        setRegistrationEndDate(parseDay(event.registrationEndDate, start));

        if (event.marathonMode === "in_person" || event.marathonMode === "virtual") {
          setMarathonMode(event.marathonMode);
        }
        if (
          event.listingType === "stron_managed" ||
          event.listingType === "self_managed" ||
          event.listingType === "external"
        ) {
          setListingType(event.listingType);
        }

        setVenue(event.destination || "");
        setVirtualLink(event.virtualLink || "");
        setRewardLabels(Array.isArray(event.rewardLabels) ? event.rewardLabels : []);
        setParticipantInfoFields(
          Array.isArray(event.participantInfoFields) ? event.participantInfoFields : [],
        );

        const free = isFreeEvent(event);
        setFreeEvent(free);

        const mappedTickets: DraftTicket[] = (event.ticketTypes || []).map((t: any, index: number) => ({
          id: t.id || `t${index + 1}`,
          label: t.label || (free ? "Free" : "Standard"),
          price: free ? 0 : Number(t.price) || 0,
          distanceKm: t.distanceKm != null ? Number(t.distanceKm) : undefined,
          days: t.days != null ? Number(t.days) : undefined,
          dailyStepTarget:
            t.dailyStepTarget != null
              ? Number(t.dailyStepTarget)
              : t.targetSteps != null
                ? Number(t.targetSteps)
                : undefined,
          benefits: stripFreeTicketMarker(t.benefits),
        }));
        setTickets(mappedTickets);

        const first = mappedTickets[0];
        if (format === "marathon") {
          const km = first?.distanceKm;
          setGoalAmount(km != null && km > 0 ? String(km) : "5");
          setGoalDays(first?.days != null && first.days > 0 ? String(first.days) : "7");
        } else {
          const steps = first?.dailyStepTarget;
          setGoalAmount(steps != null && steps > 0 ? String(steps) : "8000");
          const successDays =
            event.successfulDaysRequired != null && event.successfulDaysRequired > 0
              ? event.successfulDaysRequired
              : first?.days != null && first.days > 0
                ? first.days
                : 15;
          setGoalDays(String(successDays));
          setSuccessfulDaysRequired(String(successDays));
          if (free && first) {
            setQuickPrice("0");
          } else if (mappedTickets.length === 1 && first) {
            setQuickPrice(String(first.price));
          }
        }

        if (mappedTickets.length === 1 && first && format === "marathon") {
          setQuickPrice(free ? "0" : String(first.price));
        }
      } catch {
        if (!cancelled) {
          showToastMessage("Could not load event for editing.");
          router.back();
        }
      } finally {
        if (!cancelled) setLoadingEdit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, editKey, format, isEditing, router, user?.email, user?.username]);

  const [hasCustomRegEndDate, setHasCustomRegEndDate] = useState(false);

  // Auto-fill registration dates based on Event Start Date and Duration selected above
  useEffect(() => {
    if (isEditing) return;
    const daysNum = Math.max(1, parseInt(durationDays, 10) || 1);
    const calculatedEndDate = addDays(startDate, daysNum);
    setEndDate((prev) =>
      prev.getTime() !== calculatedEndDate.getTime() ? calculatedEndDate : prev,
    );
    setRegistrationEndDate((prev) => {
      if (!hasCustomRegEndDate || prev.getTime() > calculatedEndDate.getTime()) {
        return prev.getTime() !== calculatedEndDate.getTime() ? calculatedEndDate : prev;
      }
      return prev;
    });
  }, [startDate, durationDays, isEditing, hasCustomRegEndDate]);

  // Registration start defaults to "today" and must NOT follow event startDate —
  // syncing it to tomorrow blocked Get Free Ticket until the event day began.

  const handleSetRegistrationStartDate = (d: Date) => {
    setRegistrationStartDate(d);
  };

  const handleSetRegistrationEndDate = (d: Date) => {
    setHasCustomRegEndDate(true);
    setRegistrationEndDate(d);
  };

  const needsPhoneVerification = (error: unknown) => {
    const apiError = error as StronApiError;
    if (
      apiError?.code === "organizer_not_verified" ||
      apiError?.code === "organizer_profile_missing"
    ) {
      return true;
    }
    const message = String(apiError?.message || "").toLowerCase();
    return (
      message.includes("phone") || message.includes("mobile") || message.includes("verify your")
    );
  };

  const ensureOrganizer = useCallback(async () => {
    try {
      await dispatch(fetchMyOrganizer()).unwrap();
      return;
    } catch (error) {
      const apiError = error as StronApiError;
      if (apiError.code === "organizer_not_verified" || needsPhoneVerification(error)) {
        throw error;
      }
      if (apiError.code && apiError.code !== "organizer_not_found") {
        throw error;
      }
    }
    const fullName =
      organizerName.trim() || user?.username?.trim() || user?.email?.split("@")[0] || "Organizer";
    await dispatch(upsertOrganizer({ fullName, accountType: "individual" })).unwrap();
  }, [user, organizerName, dispatch]);

  const pickBanner = async () => {
    if (uploadingBanner) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToastMessage("Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    const uri = result.assets[0].uri;
    setBannerUri(uri);
    setUploadingBanner(true);
    try {
      const url = await dispatch(uploadClanBannerThunk({ uri })).unwrap();
      setBannerName(url);
      setBannerUri(url);
      showToastMessage("Logo uploaded.");
    } catch {
      showToastMessage(
        isEditing
          ? "Logo selected. Upload failed — you can still save."
          : "Logo selected. Upload failed — you can still publish.",
      );
    } finally {
      setUploadingBanner(false);
    }
  };

  const openTicketModal = (ticket?: DraftTicket | null) => {
    setEditingTicket(ticket ?? null);
    setTicketModalOpen(true);
  };

  const toggleFreeEvent = () => {
    setFreeEvent((prev) => {
      const next = !prev;
      if (next) {
        setQuickPrice("0");
        setTickets((ticketsPrev) =>
          ticketsPrev.slice(0, 1).map((t) => ({
            ...t,
            price: 0,
            label: "Free",
          })),
        );
      } else if (quickPrice === "0") {
        setQuickPrice("");
      }
      return next;
    });
  };

  const addTicketRow = () => {
    if (freeEvent) {
      showToastMessage("Cannot add paid tickets for a free event.");
      return;
    }
    if (tickets.length >= 3) {
      showToastMessage("Maximum 3 ticket tiers allowed.");
      return;
    }
    const newIdx = tickets.length + 1;
    const amount = Number(goalAmount) || 5;
    const days = parseInt(goalDays, 10) || 7;
    const newTicket: DraftTicket = {
      id: `t${Date.now()}_${newIdx}`,
      label: `Tier ${newIdx}`,
      price: 100 * newIdx,
      distanceKm: format === "marathon" ? amount : undefined,
      days: days,
      dailyStepTarget: format === "step_challenge" ? Number(goalAmount) || 8000 : undefined,
      benefits: "",
    };
    setTickets((prev) => [...prev, newTicket]);
    showToastMessage(`Added Ticket Tier ${newIdx}.`);
  };

  const removeTicketRow = (id: string) => {
    if (tickets.length <= 1) {
      showToastMessage("At least one ticket tier is required.");
      return;
    }
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTicketPrice = (id: string, priceStr: string) => {
    if (freeEvent && Number(priceStr) > 0) {
      showToastMessage("Cannot add paid tickets for a free event.");
      return;
    }
    const priceNum = Math.max(0, Number(priceStr) || 0);
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, price: freeEvent ? 0 : priceNum } : t)),
    );
  };

  const commitQuickTicket = () => {
    if (!freeEvent && !quickPrice) {
      showToastMessage("Please enter Price");
      return;
    }

    const price = freeEvent ? 0 : Number(quickPrice);
    if (!Number.isFinite(price) || price < 0 || (!freeEvent && price <= 0)) {
      showToastMessage(freeEvent ? "Free event price must be 0." : "Please enter a valid price");
      return;
    }

    if (capacity.trim() !== "") {
      const cap = Number(capacity);
      if (!Number.isFinite(cap) || cap <= 0) {
        showToastMessage("Please enter a valid capacity");
        return;
      }
    }

    setTickets((prev) => {
      if (prev.length > 0) {
        // Edit mode: update the first/only quick ticket in place.
        if (prev.length === 1) {
          const amount = Number(goalAmount);
          const days = parseInt(goalDays, 10) || (format === "step_challenge" ? 15 : 7);
          return [
            {
              ...prev[0],
              label: freeEvent ? "Free" : prev[0].label || "Standard",
              price,
              capacity: capacity.trim() !== "" ? Number(capacity) : prev[0].capacity,
              distanceKm:
                format === "marathon"
                  ? Number.isFinite(amount) && amount > 0
                    ? amount
                    : 5
                  : prev[0].distanceKm,
              days,
              dailyStepTarget:
                format === "step_challenge"
                  ? Number.isFinite(amount) && amount > 0
                    ? Math.floor(amount)
                    : 8000
                  : prev[0].dailyStepTarget,
              benefits: freeEvent ? "__STRON_FREE__" : stripFreeTicketMarker(prev[0].benefits),
            },
          ];
        }
        return prev;
      }
      const amount = Number(goalAmount);
      const days = parseInt(goalDays, 10) || (format === "step_challenge" ? 15 : 7);
      return [
        {
          id: `t${Date.now()}`,
          label: freeEvent ? "Free" : "Standard",
          price,
          capacity: capacity.trim() !== "" ? Number(capacity) : undefined,
          distanceKm:
            format === "marathon" ? (Number.isFinite(amount) && amount > 0 ? amount : 5) : 5,
          days,
          dailyStepTarget:
            format === "step_challenge"
              ? Number.isFinite(amount) && amount > 0
                ? Math.floor(amount)
                : 8000
              : undefined,
          benefits: freeEvent ? "__STRON_FREE__" : "",
        },
      ];
    });
    setQuickPrice(freeEvent ? "0" : "");
  };

  const saveTicket = (ticket: DraftTicket, options?: { addAnother?: boolean }) => {
    setTickets((prev) => {
      const idx = prev.findIndex((t) => t.id === ticket.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ticket;
        return next;
      }
      return [...prev, ticket];
    });
    setExpandedTicketId(ticket.id);
    setQuickPrice("");
    if (options?.addAnother) {
      setEditingTicket(null);
      setTicketModalOpen(true);
      showToastMessage("Ticket saved. Add the next tier.");
      return;
    }
    setTicketModalOpen(false);
    setEditingTicket(null);
    showToastMessage("Ticket saved.");
  };

  const resolveTickets = (): DraftTicket[] => {
    if (tickets.length > 0) {
      return freeEvent
        ? tickets.map((t) => ({
            ...t,
            price: 0,
            label:
              t.label?.trim() && !/^free/i.test(t.label) ? `Free ${t.label}` : t.label || "Free",
            benefits: t.benefits?.includes("__STRON_FREE__")
              ? t.benefits
              : [t.benefits, "__STRON_FREE__"].filter(Boolean).join("\n"),
          }))
        : tickets;
    }
    const price = freeEvent ? 0 : Number(quickPrice);
    if (!Number.isFinite(price) || price < 0 || (!freeEvent && !(price > 0))) return [];
    const amount = Number(goalAmount);
    const days = parseInt(goalDays, 10) || (format === "step_challenge" ? 15 : 7);
    return [
      {
        id: "t1",
        label: freeEvent ? "Free" : "Standard",
        price,
        distanceKm:
          format === "marathon" ? (Number.isFinite(amount) && amount > 0 ? amount : 5) : 5,
        days,
        dailyStepTarget:
          format === "step_challenge"
            ? Number.isFinite(amount) && amount > 0
              ? Math.floor(amount)
              : 8000
            : undefined,
        benefits: freeEvent ? "__STRON_FREE__" : "",
      },
    ];
  };

  const formatIsoDay = (d: Date) => {
    if (!d || Number.isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const validateCommon = (): { resolved: DraftTicket[]; finalCap?: number } | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      showToastMessage("Title is required.");
      return null;
    }
    if (format === "marathon") {
      if (marathonMode === "in_person" && !venue.trim()) {
        showToastMessage("Venue location is required for in-person events.");
        return null;
      }
      const km = Number(goalAmount);
      if (!(km > 0)) {
        showToastMessage("Enter a valid distance in Km.");
        return null;
      }
    } else {
      const steps = Number(goalAmount);
      if (!(steps > 0)) {
        showToastMessage("Enter a valid daily step target.");
        return null;
      }
      const days = parseInt(goalDays, 10);
      if (!(days > 0)) {
        showToastMessage("Enter how many successful days are required.");
        return null;
      }
      if (days > 90) {
        showToastMessage("Challenge duration cannot exceed 90 days.");
        return null;
      }
    }

    if (virtualLink.trim() && listingType !== "stron_managed") {
      const urlPattern =
        /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/i;
      if (!urlPattern.test(virtualLink.trim())) {
        showToastMessage("Enter a valid Virtual Link URL.");
        return null;
      }
    }

    const resolved = resolveTickets();
    if (!resolved.length) {
      showToastMessage("Add a ticket price, or use Add Ticket for multiple tiers.");
      return null;
    }

    let finalCap: number | undefined = undefined;
    if (capacity.trim() !== "") {
      const cap = Number(capacity);
      if (Number.isNaN(cap) || cap <= 0) {
        showToastMessage("Capacity must be a positive number greater than 0.");
        return null;
      }
      finalCap = Math.floor(cap);
    }

    if (resolved.some((t) => !(Number(t.price) >= 0))) {
      showToastMessage("Ticket price must be zero or more.");
      return null;
    }
    if (!freeEvent && resolved.some((t) => !(t.price > 0))) {
      showToastMessage("Set a price greater than 0, or mark this as a free event.");
      return null;
    }

    return { resolved, finalCap };
  };

  const onSaveEdit = async () => {
    if (!editKey) return;
    const validated = validateCommon();
    if (!validated) return;
    const { resolved, finalCap } = validated;
    const trimmedTitle = title.trim();

    setPublishing(true);
    try {
      const dDays = Math.max(1, parseInt(durationDays, 10) || 3);
      const computedEventEnd = addDays(startDate, dDays);
      let regEnd = registrationEndDate;
      if (regEnd > computedEventEnd) regEnd = computedEventEnd;
      if (regEnd < registrationStartDate) regEnd = registrationStartDate;
      const stepTarget = Math.floor(Number(goalAmount));
      const successDays = Math.min(Math.max(1, parseInt(goalDays, 10) || dDays), dDays);

      const patch: any = {
        title: trimmedTitle,
        description: freeEvent
          ? stampFreeEventDescription(description.trim())
          : description.trim() || "",
        rules: freeEvent ? stampFreeEventRules([]) : [],
        capacity: finalCap != null ? Math.floor(finalCap) : null,
        registrationStartDate: formatIsoDay(registrationStartDate),
        registrationEndDate: formatIsoDay(regEnd),
        bannerName: bannerName || null,
        destination: venue.trim() || null,
        virtualLink: listingType === "stron_managed" ? null : virtualLink.trim() || null,
        visibility,
        rewardLabels,
        participantInfoFields,
        tickets: resolved.map((t, index) =>
          format === "marathon"
            ? {
                id: t.id || `t${index + 1}`,
                label: t.label,
                price: t.price,
                distanceKm: Number(goalAmount) || t.distanceKm || 5,
                days: parseInt(goalDays, 10) || t.days || 7,
                benefits: t.benefits || "",
              }
            : {
                id: t.id || `t${index + 1}`,
                label: t.label,
                price: t.price,
                dailyStepTarget: Math.floor(Number(goalAmount)) || t.dailyStepTarget || stepTarget,
                days: parseInt(goalDays, 10) || t.days || successDays,
                benefits: t.benefits || "",
              },
        ),
      };

      // Backend only allows startDate/durationDays while draft.
      if (canEditStartDate) {
        patch.startDate = formatIsoDay(startDate);
        patch.durationDays = dDays;
      }

      if (format === "step_challenge") {
        patch.successfulDaysRequired = successDays;
      }

      await dispatch(updateManagedEvent({ key: editKey, payload: patch })).unwrap();
      showToastMessage("Event updated.");
      router.replace({
        pathname: href.app.organizerPreview,
        params: { key: editKey },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      showToastMessage(apiError.message || "Could not update event.");
    } finally {
      setPublishing(false);
    }
  };

  const onPublish = async (opts?: { phoneJustVerified?: boolean }) => {
    if (isEditing) {
      void onSaveEdit();
      return;
    }

    const validated = validateCommon();
    if (!validated) return;
    const { resolved, finalCap } = validated;
    const trimmedTitle = title.trim();

    setPublishing(true);
    try {
      await ensureOrganizer();

      let event;
      const dDays = Math.max(1, parseInt(durationDays, 10) || 3);
      const computedEventEnd = addDays(startDate, dDays);
      let regEnd = registrationEndDate;
      if (regEnd > computedEventEnd) regEnd = computedEventEnd;
      if (regEnd < registrationStartDate) regEnd = registrationStartDate;

      if (format === "marathon") {
        event = await dispatch(
          createMarathonEvent({
            title: trimmedTitle,
            description: freeEvent
              ? stampFreeEventDescription(description.trim())
              : description.trim() || undefined,
            rules: freeEvent ? stampFreeEventRules([]) : undefined,
            organizerName: organizerName.trim() || undefined,
            capacity: finalCap != null ? Math.floor(finalCap) : undefined,
            durationDays: dDays,
            startDate: formatIsoDay(startDate),
            registrationStartDate: formatIsoDay(registrationStartDate),
            registrationEndDate: formatIsoDay(regEnd),
            marathonMode,
            listingType,
            visibility,
            destination: venue.trim() || undefined,
            virtualLink:
              listingType === "stron_managed" ? undefined : virtualLink.trim() || undefined,
            bannerName: bannerName || undefined,
            rewardLabels,
            participantInfoFields,
            tickets: resolved.map((t, index) => ({
              id: t.id || `t${index + 1}`,
              label: t.label,
              price: t.price,
              distanceKm: t.distanceKm || Number(goalAmount) || 5,
              days: t.days || parseInt(goalDays, 10) || 7,
              benefits: t.benefits || "",
            })),
          }),
        ).unwrap();
      } else {
        const dDays = Math.max(1, parseInt(durationDays, 10) || 1);
        if (dDays > 90) {
          showToastMessage("Challenge duration cannot exceed 90 days.");
          setPublishing(false);
          return;
        }
        const successDays = Math.min(Math.max(1, parseInt(goalDays, 10) || dDays), dDays);
        const stepTarget = Math.floor(Number(goalAmount));
        if (!(stepTarget > 0)) {
          showToastMessage("Enter a valid daily step target.");
          setPublishing(false);
          return;
        }

        event = await dispatch(
          createStepChallengeEvent({
            title: trimmedTitle,
            description: freeEvent
              ? stampFreeEventDescription(description.trim())
              : description.trim() || undefined,
            rules: freeEvent ? stampFreeEventRules([]) : undefined,
            organizerName: organizerName.trim() || undefined,
            capacity: finalCap != null ? Math.floor(finalCap) : undefined,
            durationDays: dDays,
            startDate: formatIsoDay(startDate),
            registrationStartDate: formatIsoDay(registrationStartDate),
            registrationEndDate: formatIsoDay(regEnd),
            visibility,
            destination: venue.trim() || undefined,
            virtualLink:
              listingType === "stron_managed" ? undefined : virtualLink.trim() || undefined,
            bannerName: bannerName || undefined,
            successfulDaysRequired: successDays,
            rewardLabels,
            participantInfoFields,
            tickets: resolved.map((t, index) => ({
              id: t.id || `t${index + 1}`,
              label: t.label,
              price: t.price,
              dailyStepTarget: t.dailyStepTarget || stepTarget,
              benefits: t.benefits || "",
            })),
          }),
        ).unwrap();
      }

      const published = await dispatch(publishManagedEvent(event.key)).unwrap();
      router.replace({
        pathname: href.app.eventPublished,
        params: { key: published.key, title: published.title },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      if (needsPhoneVerification(error)) {
        showToastMessage("Phone verification required. Please go back and try again.");
        return;
      }
      if (apiError.code === "listing_limit_reached") {
        showToastMessage(apiError.message);
      } else {
        showToastMessage(apiError.message || "Could not publish event.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const openTextEditor = (key: "description" | "virtualLink") => {
    setTextDraft(key === "description" ? description : virtualLink);
    setTextEditor(key);
  };

  const commitTextEditor = () => {
    if (textEditor === "description") setDescription(textDraft);
    if (textEditor === "virtualLink") setVirtualLink(textDraft);
    setTextEditor(null);
  };

  return {
    title,
    setTitle,
    organizerName,
    setOrganizerName,
    capacity,
    setCapacity,
    quickPrice,
    setQuickPrice,
    description,
    setDescription,
    timeLabel,
    timeDate,
    setTimeDate,
    bannerUri,
    setBannerUri,
    bannerName,
    setBannerName,
    uploadingBanner,
    startDate,
    setStartDate,
    registrationStartDate,
    setRegistrationStartDate: handleSetRegistrationStartDate,
    registrationEndDate,
    setRegistrationEndDate: handleSetRegistrationEndDate,
    marathonMode,
    setMarathonMode,
    listingType,
    isStronManaged: listingType === "stron_managed",
    visibility,
    setVisibility,
    venue,
    setVenue,
    virtualLink,
    setVirtualLink,
    endDate,
    setEndDate,
    goalAmount,
    setGoalAmount,
    goalDays,
    setGoalDays,
    durationDays,
    setDurationDays,
    successfulDaysRequired,
    setSuccessfulDaysRequired,
    rewardLabels,
    setRewardLabels,
    participantInfoFields,
    setParticipantInfoFields,
    requiredParticipantFields: participantInfoFields,
    setRequiredParticipantFields: setParticipantInfoFields,
    tickets,
    setTickets,
    ticketModalOpen,
    setTicketModalOpen,
    editingTicket,
    setEditingTicket,
    expandedTicketId,
    setExpandedTicketId,
    publishing,
    freeEvent,
    toggleFreeEvent,
    isEditing,
    loadingEdit,
    eventStatus,
    canEditStartDate,

    datePicker,
    setDatePicker,
    textEditor,
    setTextEditor,
    textDraft,
    setTextDraft,

    addTicketRow,
    removeTicketRow,
    updateTicketPrice,
    pickBanner,
    openTicketModal,
    commitQuickTicket,
    saveTicket,
    onPublish,

    openTextEditor,
    commitTextEditor,
  };
};

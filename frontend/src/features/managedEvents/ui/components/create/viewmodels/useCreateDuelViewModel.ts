import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { showToastMessage } from "@/utils/app-utils";
import { uploadClanBannerThunk } from "@/features/core";
import {
  fetchEvent,
  updateManagedEvent,
  createKingOfTheHillEvent,
  createFaceOffEvent,
  publishManagedEvent,
  type StronApiError,
} from "@/features/managedEvents";
import { href } from "@/navigation/href";
import { isFreeTicket } from "@/utils/stronFreeTicket";
import type { ListingVisibility } from "../components/ListingVisibilityToggle";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 1, 0);
  return d;
};

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
};

const startOfDay = (d: Date) => {
  const next = new Date(d);
  next.setHours(0, 0, 1, 0);
  return next;
};

const parseDay = (iso?: string | null, fallback: Date = today()) => {
  if (!iso) return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return startOfDay(d);
};

const formatIsoDay = (d: Date) => {
  if (!d || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const useCreateDuelViewModel = (
  format: "king_of_the_hill" | "face_off",
  editKeyParam?: string,
) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const editKey = typeof editKeyParam === "string" ? editKeyParam.trim() : "";
  const isEditing = Boolean(editKey);

  const [loadingEdit, setLoadingEdit] = useState(isEditing);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [startDate, setStartDate] = useState(today());
  const [durationDays, setDurationDays] = useState("7");
  const [registrationStartDate, setRegistrationStartDate] = useState(() => today());
  const [registrationEndDate, setRegistrationEndDate] = useState(() => addDays(today(), 7));
  const [hasCustomRegEndDate, setHasCustomRegEndDate] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    const daysNum = Math.max(1, parseInt(durationDays, 10) || 1);
    const calculatedEndDate = addDays(startDate, daysNum);
    setRegistrationEndDate((prev) => {
      if (!hasCustomRegEndDate || prev.getTime() > calculatedEndDate.getTime()) {
        return prev.getTime() !== calculatedEndDate.getTime() ? calculatedEndDate : prev;
      }
      return prev;
    });
  }, [startDate, durationDays, isEditing, hasCustomRegEndDate]);

  const [capacity, setCapacity] = useState("");
  const [price, setPrice] = useState("");
  const [freeEvent, setFreeEvent] = useState(false);
  const [visibility, setVisibility] = useState<ListingVisibility>("public");
  const [rewardLabels, setRewardLabels] = useState<string[]>(["e-Certificate", "e-Medal"]);
  const [requiredParticipantFields, setRequiredParticipantFields] = useState<string[]>([
    "T-Shirt Size",
    "Contact Name",
    "Contact Number",
    "Emergency Contact Number",
    "Blood Group",
  ]);

  const [datePicker, setDatePicker] = useState<"start" | "regStart" | "reg" | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setOrganizerName(user?.username?.trim() || user?.email?.split("@")[0] || "");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingEdit(true);
      try {
        const event = await dispatch(fetchEvent(editKey)).unwrap();
        if (cancelled) return;
        const ticket = event.ticketTypes?.[0];
        const free = ticket ? isFreeTicket(ticket, event) : false;
        setTitle(event.title || "");
        setOrganizerName(user?.username?.trim() || user?.email?.split("@")[0] || "Organizer");
        setBannerName(event.bannerName || null);
        setBannerUri(event.bannerName || null);
        setStartDate(parseDay(event.startDate));
        setDurationDays(String(event.durationDays || 7));
        setCapacity(event.capacity != null ? String(event.capacity) : "");
        setFreeEvent(free);
        setVisibility(event.visibility === "private" ? "private" : "public");
        setPrice(free ? "0" : ticket?.price != null ? String(ticket.price) : "");
        setRewardLabels(
          Array.isArray(event.rewardLabels)
            ? event.rewardLabels.map((r) => String(r).trim()).filter(Boolean)
            : [],
        );
        setTicketId(ticket?.id || null);
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
  }, [dispatch, editKey, isEditing, router, user?.email, user?.username]);

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
      showToastMessage("Logo selected. Upload failed — you can still save.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const validate = useCallback(() => {
    if (!title.trim()) {
      showToastMessage("Title is required.");
      return false;
    }
    if (!organizerName.trim()) {
      showToastMessage("Organizer Name is required.");
      return false;
    }
    if (capacity.trim() !== "") {
      const cap = Number(capacity);
      if (!(cap > 0)) {
        showToastMessage("Capacity must be greater than 0.");
        return false;
      }
    }
    const ticketPrice = freeEvent ? 0 : Number(price);
    if (!Number.isFinite(ticketPrice) || ticketPrice < 0 || (!freeEvent && !(ticketPrice > 0))) {
      showToastMessage("Price must be greater than 0, or mark this as a free event.");
      return false;
    }
    const days = Number(durationDays);
    if (!Number.isInteger(days) || days <= 1) {
      showToastMessage("Duration must be a whole number greater than 1.");
      return false;
    }
    return true;
  }, [capacity, durationDays, freeEvent, organizerName, price, title]);

  const onSaveEdit = useCallback(async () => {
    if (!editKey || !validate()) return;
    setPublishing(true);
    try {
      const ticketPrice = freeEvent ? 0 : Number(price);
      const cap = capacity.trim() !== "" ? Math.floor(Number(capacity)) : null;
      const days = Math.max(1, Math.floor(Number(durationDays)) || 7);
      const computedEventEnd = addDays(startDate, days);
      let regEnd = registrationEndDate;
      if (regEnd > computedEventEnd) regEnd = computedEventEnd;
      if (regEnd < registrationStartDate) regEnd = registrationStartDate;

      await dispatch(
        updateManagedEvent({
          key: editKey,
          payload: {
            title: title.trim(),
            description: freeEvent ? "__STRON_FREE_EVENT__" : "",
            rules: freeEvent ? ["__STRON_FREE_EVENT__"] : [],
            capacity: cap,
            durationDays: days,
            startDate: formatIsoDay(startDate),
            registrationStartDate: formatIsoDay(registrationStartDate),
            registrationEndDate: formatIsoDay(regEnd),
            bannerName: bannerName || null,
            visibility,
            rewardLabels,
            participantInfoFields: requiredParticipantFields,
            tickets: [
              {
                id: ticketId || "t1",
                label: freeEvent ? "Free Entry" : "Entry",
                price: ticketPrice,
                benefits: freeEvent ? "__STRON_FREE__" : undefined,
              },
            ],
          },
        }),
      ).unwrap();
      showToastMessage("Event updated.");
      router.replace({
        pathname: href.app.eventDashboard,
        params: { key: editKey },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      showToastMessage(apiError.message || "Could not update event.");
    } finally {
      setPublishing(false);
    }
  }, [
    bannerName,
    capacity,
    dispatch,
    durationDays,
    editKey,
    freeEvent,
    price,
    rewardLabels,
    router,
    startDate,
    registrationStartDate,
    registrationEndDate,
    requiredParticipantFields,
    ticketId,
    title,
    validate,
    visibility,
  ]);

  const onPublish = async (opts?: { phoneJustVerified?: boolean }) => {
    if (isEditing) {
      void onSaveEdit();
      return;
    }
    if (!validate()) return;

    if (!opts?.phoneJustVerified && user?.phoneVerified !== true) {
      setPhoneVerifyOpen(true);
      return;
    }

    setPublishing(true);
    try {
      const ticketPrice = freeEvent ? 0 : Number(price);
      const days = Math.max(1, Math.floor(Number(durationDays)) || 7);
      const computedEventEnd = addDays(startDate, days);
      let regEnd = registrationEndDate;
      if (regEnd > computedEventEnd) regEnd = computedEventEnd;
      if (regEnd < registrationStartDate) regEnd = registrationStartDate;

      const payload = {
        title: title.trim(),
        description: freeEvent ? "__STRON_FREE_EVENT__" : undefined,
        rules: freeEvent ? ["__STRON_FREE_EVENT__"] : undefined,
        organizerName: organizerName.trim(),
        bannerName: bannerName || undefined,
        capacity: capacity.trim() !== "" ? Math.floor(Number(capacity)) : undefined,
        durationDays: days,
        startDate: formatIsoDay(startDate),
        registrationStartDate: formatIsoDay(registrationStartDate),
        registrationEndDate: formatIsoDay(regEnd),
        visibility,
        rewardLabels,
        participantInfoFields: requiredParticipantFields,
        tickets: [
          {
            label: freeEvent ? "Free Entry" : "Entry",
            price: ticketPrice,
            benefits: freeEvent ? "__STRON_FREE__" : undefined,
          },
        ],
      };

      const event =
        format === "king_of_the_hill"
          ? await dispatch(createKingOfTheHillEvent(payload)).unwrap()
          : await dispatch(createFaceOffEvent(payload)).unwrap();

      const published = await dispatch(publishManagedEvent(event.key)).unwrap();
      router.replace({
        pathname: href.app.eventPublished,
        params: { key: published.key, title: published.title },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      if (apiError.code === "organizer_not_verified") {
        setPhoneVerifyOpen(true);
      } else {
        showToastMessage(apiError.message || "Could not publish event.");
      }
    } finally {
      setPublishing(false);
    }
  };

  const toggleFreeEvent = useCallback(() => {
    setFreeEvent((prev) => {
      const next = !prev;
      if (next) setPrice("0");
      return next;
    });
  }, []);

  return {
    isEditing,
    loadingEdit,
    publishing,
    title,
    setTitle,
    organizerName,
    setOrganizerName,
    bannerUri,
    bannerName,
    uploadingBanner,
    pickBanner,
    startDate,
    setStartDate,
    durationDays,
    setDurationDays,
    registrationStartDate,
    setRegistrationStartDate,
    registrationEndDate,
    setRegistrationEndDate,
    setHasCustomRegEndDate,
    capacity,
    setCapacity,
    price,
    setPrice,
    freeEvent,
    toggleFreeEvent,
    visibility,
    setVisibility,
    rewardLabels,
    setRewardLabels,
    requiredParticipantFields,
    setRequiredParticipantFields,
    datePicker,
    setDatePicker,
    phoneVerifyOpen,
    setPhoneVerifyOpen,
    onPublish,
  };
};

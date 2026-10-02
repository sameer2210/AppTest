import { useEffect, useRef, useState } from "react";
import { fontTextStyles } from "@/utils/typography";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { href } from "@/navigation/href";
import { showToastMessage } from "@/utils/app-utils";
import { uploadClanBannerThunk } from "@/features/core";
import {
  fetchEvent,
  updateManagedEvent,
  fetchMyOrganizer,
  upsertOrganizer,
  createMarathonEvent,
  publishManagedEvent,
} from "../../model/managedEvents.thunks";
import type { StronApiError } from "@/features/managedEvents";
import HorizontalDateStrip from "../components/create/components/HorizontalDateStrip";
import { PhoneVerifyModal } from "@/features/auth";
import CreateGlassField from "@/components/form/CreateGlassField";
import FreeEventCheckbox from "../components/create/components/FreeEventCheckbox";
import PublishActionBar from "@/components/actionBar/PublishActionBar";
import { ListingVisibilityToggle } from "../components/create/components/ListingVisibilityToggle";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addDays, tomorrow } from "../components/create/viewmodels/useCreateEventViewModel";
import {
  SCREEN_CONTENT_PADDING_BOTTOM,
  SCREEN_CONTENT_PADDING_TOP,
  SCREEN_HORIZONTAL_PADDING_WIDE,
} from "@/utils/screen-layout";

type FieldKey = "title" | "venue" | "url" | "category" | "price";

const parseCategoryFromDescription = (description?: string | null) => {
  const match = String(description || "").match(/External listing \((.+?)\)\./i);
  return match?.[1]?.trim() || "In-Person";
};

const ExternalListingScreen = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const headerTopPadding = topInset + 8;
  const { height: windowHeight } = useWindowDimensions();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ url?: string; key?: string }>();
  const user = useAppSelector((state) => state.auth.user);

  const editKey = typeof params.key === "string" ? params.key.trim() : "";
  const isEditMode = Boolean(editKey);

  const scrollRef = useRef<ScrollView>(null);
  const focusedFieldRef = useRef<FieldKey | null>(null);

  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [freeEvent, setFreeEvent] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [externalUrl, setExternalUrl] = useState(String(params.url || "").trim());
  const [startDate, setStartDate] = useState(tomorrow());
  const [ticketId, setTicketId] = useState("external");
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [bannerName, setBannerName] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [eventStatus, setEventStatus] = useState<string | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(isEditMode);
  const [publishing, setPublishing] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  /** Manual lift — edge-to-edge Android often ignores adjustResize. */
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const keyboardOpen = keyboardHeight > 0;
  const canEditStartDate = !isEditMode || eventStatus === "draft";

  const formatIsoDay = (d: Date) => d.toISOString().split("T")[0];

  const scrollActiveField = (field: FieldKey) => {
    // Bottom fields need to be scrolled up into the visible area above the keyboard.
    if (field === "category" || field === "price") {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 280);
      return;
    }
    if (field === "venue" || field === "url") {
      scrollRef.current?.scrollTo({ y: 80, animated: true });
      return;
    }
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      // Prefer overlap vs window so we don't double-lift when adjustResize already works.
      const winH = Dimensions.get("window").height;
      const overlap = Math.max(0, Math.round(winH - e.endCoordinates.screenY));
      const lift = overlap > 48 ? overlap : e.endCoordinates.height;
      setKeyboardHeight(lift);

      const field = focusedFieldRef.current;
      if (field) {
        setTimeout(() => scrollActiveField(field), 50);
        setTimeout(() => scrollActiveField(field), 200);
      }
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!editKey) return;

    let cancelled = false;
    (async () => {
      setLoadingEvent(true);
      try {
        const event = await dispatch(fetchEvent(editKey)).unwrap();
        if (cancelled) return;

        const firstTicket = event.ticketTypes?.[0];
        setTitle(event.title || "");
        setCategory(parseCategoryFromDescription(event.description));
        const link =
          String(event.virtualLink || "").trim() ||
          String(params.url || "").trim() ||
          (/^https?:\/\//i.test(String(event.destination || ""))
            ? String(event.destination).trim()
            : "");
        setExternalUrl(link);
        // If destination was only the redirect URL, don't treat it as the venue.
        setVenue(
          link && String(event.destination || "").trim() === link ? "" : event.destination || "",
        );
        setPrice(
          firstTicket?.price != null && Number.isFinite(Number(firstTicket.price))
            ? String(firstTicket.price)
            : "0",
        );
        setFreeEvent(Number(firstTicket?.price) === 0);
        setVisibility(event.visibility === "private" ? "private" : "public");
        setTicketId(firstTicket?.id || "external");
        const banner = String(event.bannerName || "").trim();
        if (banner) {
          setBannerName(banner);
          setBannerUri(/^https?:\/\//i.test(banner) ? banner : null);
        }
        setEventStatus(event.status || null);
        if (event.startDate) {
          const parsed = new Date(event.startDate);
          if (!Number.isNaN(parsed.getTime())) setStartDate(parsed);
        }
      } catch (error) {
        if (!cancelled) {
          const apiError = error as StronApiError;
          showToastMessage(apiError.message || "Could not load listing.");
          router.back();
        }
      } finally {
        if (!cancelled) setLoadingEvent(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, editKey, params.url, router]);

  const onFieldFocus = (field: FieldKey) => {
    focusedFieldRef.current = field;
    scrollActiveField(field);
  };

  const pickBanner = async () => {
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
      showToastMessage("Banner uploaded.");
    } catch {
      showToastMessage("Banner selected. Upload failed — you can still save.");
    } finally {
      setUploadingBanner(false);
    }
  };

  const onPreview = () => {
    if (!title.trim()) {
      showToastMessage("Add a title to preview.");
      return;
    }
    if (isEditMode && editKey) {
      router.push({
        pathname: href.app.organizerPreview,
        params: { key: editKey },
      });
      return;
    }
    showToastMessage("Preview uses your entered details after publish.");
  };

  const buildNormalizedFields = () => {
    const trimmedTitle = title.trim();
    const trimmedUrl = externalUrl.trim();
    const rawPrice = String(price).trim();
    const parsedPrice = rawPrice === "" ? 0 : Number(rawPrice);
    const isFree = freeEvent || parsedPrice === 0;
    const normalizedPrice =
      isFree || (Number.isFinite(parsedPrice) && parsedPrice >= 0) ? (isFree ? 0 : parsedPrice) : 0;
    const normalizedCategory = category.trim() || "In-Person";
    return {
      trimmedTitle,
      trimmedUrl,
      normalizedPrice,
      normalizedCategory,
      isFree,
    };
  };

  const onSaveEdit = async () => {
    const { trimmedTitle, trimmedUrl, normalizedPrice, normalizedCategory } =
      buildNormalizedFields();

    if (!trimmedTitle) {
      showToastMessage("Title is required.");
      return;
    }
    if (!trimmedUrl) {
      showToastMessage("External registration URL is missing.");
      return;
    }
    if (!editKey) return;

    setPublishing(true);
    try {
      const patch: any = {
        title: trimmedTitle,
        description: `External listing (${normalizedCategory}). Registrations redirect to the organizer site.`,
        destination: venue.trim() || trimmedUrl,
        virtualLink: trimmedUrl,
        bannerName: bannerName || null,
        visibility,
        tickets: [
          {
            id: ticketId || "external",
            price: Number(normalizedPrice) || 0,
            label:
              Number(normalizedPrice) === 0
                ? "Free External Registration"
                : "External Registration",
          },
        ],
      };

      if (canEditStartDate) {
        const endDate = addDays(startDate, 30);
        patch.startDate = formatIsoDay(startDate);
        patch.durationDays = 30;
        patch.registrationEndDate = formatIsoDay(endDate);
      }

      const updated = await dispatch(
        updateManagedEvent({ key: editKey, payload: patch }),
      ).unwrap();
      showToastMessage("Listing updated.");
      router.replace({
        pathname: href.app.organizerPreview,
        params: { key: updated.key },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      showToastMessage(apiError.message || "Could not update listing.");
    } finally {
      setPublishing(false);
    }
  };

  const onPublish = async (opts?: { phoneJustVerified?: boolean }) => {
    if (isEditMode) {
      await onSaveEdit();
      return;
    }

    const { trimmedTitle, trimmedUrl, normalizedPrice, normalizedCategory } =
      buildNormalizedFields();

    if (!trimmedTitle) {
      showToastMessage("Title is required.");
      return;
    }
    if (!trimmedUrl) {
      showToastMessage("External registration URL is missing. Go back and paste your link.");
      return;
    }

    if (!opts?.phoneJustVerified && user?.phoneVerified !== true) {
      setShowVerifyModal(true);
      return;
    }

    setPublishing(true);
    try {
      const organizerName = user?.username?.trim() || user?.email?.split("@")[0] || "Organizer";

      try {
        await dispatch(fetchMyOrganizer()).unwrap();
      } catch {
        await dispatch(
          upsertOrganizer({
            fullName: organizerName,
            accountType: "individual",
          }),
        ).unwrap();
      }

      const endDate = addDays(startDate, 30);
      const ticketPayload = {
        id: "external",
        label:
          Number(normalizedPrice) === 0 ? "Free External Registration" : "External Registration",
        price: Number(normalizedPrice) || 0,
        days: 30,
        distanceKm: 5,
      };

      const event = await dispatch(
        createMarathonEvent({
          title: trimmedTitle,
          description: `External listing (${normalizedCategory}). Registrations redirect to the organizer site.`,
          capacity: 500,
          durationDays: 30,
          startDate: formatIsoDay(startDate),
          registrationEndDate: formatIsoDay(endDate),
          marathonMode: "in_person",
          listingType: "external",
          visibility,
          destination: venue.trim() || trimmedUrl,
          virtualLink: trimmedUrl,
          bannerName: bannerName || undefined,
          tickets: [ticketPayload],
        }),
      ).unwrap();

      const published = await dispatch(publishManagedEvent(event.key)).unwrap();
      router.replace({
        pathname: href.app.eventPublished,
        params: { key: published.key, title: published.title },
      });
    } catch (error) {
      const apiError = error as StronApiError;
      showToastMessage(apiError.message || "Could not publish external listing.");
    } finally {
      setPublishing(false);
    }
  };

  if (loadingEvent) {
    return (
      <View style={[styles.screen, styles.loadingWrap]}>
        <ActivityIndicator color="#086CFF" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/*
        Lift the whole screen by the keyboard height.
        Needed because edge-to-edge Android often does not resize the window.
      */}
      <View style={[styles.screen, { marginBottom: keyboardHeight }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: Math.max(windowHeight - keyboardHeight, windowHeight * 0.6),
              paddingTop: headerTopPadding + 60,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topSection}>
            <CustomText style={styles.labelMuted}>Title</CustomText>
            <View style={styles.darkField}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. City Fun Run Listing"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.input}
                onFocus={() => onFieldFocus("title")}
              />
            </View>

            <View style={styles.venueBannerRow}>
              <View style={styles.venueCol}>
                <CustomText style={styles.labelMuted}>Venue</CustomText>
                <View style={styles.darkField}>
                  <TextInput
                    value={venue}
                    onChangeText={setVenue}
                    placeholder="e.g. Central Park Gate 2"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    style={styles.input}
                    onFocus={() => onFieldFocus("venue")}
                  />
                </View>
              </View>

              <View style={styles.bannerCol}>
                <CustomText style={styles.labelMuted}>Banner</CustomText>
                <PressableScale
                  onPress={() => void pickBanner()}
                  disabled={uploadingBanner}
                  style={styles.bannerBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Upload event banner"
                >
                  {bannerUri ? (
                    <Image source={{ uri: bannerUri }} style={styles.bannerPreview} />
                  ) : (
                    <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.65)" />
                  )}
                  {uploadingBanner ? (
                    <View style={styles.bannerBusy}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    </View>
                  ) : null}
                </PressableScale>
              </View>
            </View>

            <CustomText style={styles.labelMuted}>External registration URL</CustomText>
            <View style={styles.darkField}>
              <TextInput
                value={externalUrl}
                onChangeText={setExternalUrl}
                placeholder="https://…"
                placeholderTextColor="rgba(255,255,255,0.3)"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                onFocus={() => onFieldFocus("url")}
              />
            </View>
          </View>

          <View style={styles.dateBlock}>
            <HorizontalDateStrip
              selected={startDate}
              onSelect={canEditStartDate ? setStartDate : () => undefined}
              contentInset={20}
            />
          </View>

          <LinearGradient
            colors={["#7EB6FF", "#3B82F0", "#0B3FA8"]}
            locations={[0, 0.42, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.bottomCard,
              {
                paddingBottom: keyboardOpen ? 28 : 130,
              },
            ]}
          >
            <CustomText style={styles.basicDetailTitle}>Basic Detail</CustomText>

            <CreateGlassField
              label="Category"
              placeholder="e.g. In-Person"
              value={category}
              onChangeText={setCategory}
              onFocus={() => onFieldFocus("category")}
              containerStyle={styles.glassFieldGap}
            />

            <FreeEventCheckbox
              checked={freeEvent}
              onToggle={() => {
                setFreeEvent((prev) => {
                  const next = !prev;
                  if (next) setPrice("0");
                  else if (price === "0") setPrice("");
                  return next;
                });
              }}
            />

            <CreateGlassField
              label="Starting Price"
              value={freeEvent ? "0" : price}
              onChangeText={setPrice}
              placeholder="e.g. 499"
              keyboardType="number-pad"
              editable={!freeEvent}
              onFocus={() => onFieldFocus("price")}
              containerStyle={styles.ticketFieldGap}
            />

            <ListingVisibilityToggle value={visibility} onChange={setVisibility} />
          </LinearGradient>
        </ScrollView>

        {/* Overlay header — transparent so content shows through while scrolling */}
        <View
          pointerEvents="box-none"
          style={[styles.headerOverlay, { paddingTop: headerTopPadding }]}
        >
          <PressableScale
            onPress={() => router.back()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </PressableScale>
          <PressableScale
            onPress={onPreview}
            accessibilityRole="button"
            accessibilityLabel="Preview"
          >
            <CustomText style={styles.previewLabel}>Preview</CustomText>
          </PressableScale>
        </View>

        {/* Sticky Save / Publish — hide while typing so the active field stays above the keyboard */}
        {!keyboardOpen ? (
          <View
            pointerEvents="box-none"
            style={[styles.stickyFooterOverlay, { paddingBottom: 30 }]}
          >
            <PublishActionBar
              label={isEditMode ? "Save Changes" : "Publish Event"}
              onPress={() => void onPublish()}
              loading={publishing}
              variant="glass"
              circleVariant="white"
            />
          </View>
        ) : null}
      </View>

      <PhoneVerifyModal
        visible={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        onVerified={() => {
          setShowVerifyModal(false);
          void onPublish({ phoneJustVerified: true });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000000",
  },
  loadingWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM + 80,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 10,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.75)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  previewLabel: {
    ...fontTextStyles.size24NormalBlack,
    color: "#FFFFFF",
  },
  topSection: {
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingBottom: 4,
  },
  venueBannerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  venueCol: {
    flex: 1,
  },
  bannerCol: {
    width: 72,
  },
  bannerBtn: {
    height: 52,
    width: 72,
    borderRadius: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 14,
  },
  bannerPreview: {
    width: "100%",
    height: "100%",
  },
  bannerBusy: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  labelMuted: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
    marginTop: 4,
  },
  darkField: {
    height: 52,
    borderRadius: 12,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    justifyContent: "center",
    marginBottom: 14,
  },
  input: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
    padding: 0,
    margin: 0,
    width: "100%",
  },
  dateBlock: {
    marginTop: 2,
    marginBottom: 10,
    overflow: "visible",
  },
  bottomCard: {
    flexGrow: 1,
    flex: 1,
    marginTop: 4,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 28,
  },
  basicDetailTitle: {
    ...fontTextStyles.twentyEightNormalBlack,
    color: "#FFFFFF",
    marginBottom: 22,
  },
  glassFieldGap: {
    marginBottom: 4,
  },
  ticketFieldGap: {
    marginTop: 18,
  },
  stickyFooterOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
    paddingTop: 10,
    backgroundColor: "transparent",
    zIndex: 10,
  },
});

export default ExternalListingScreen;

import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
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
import { fontTextStyles } from "@/utils/typography";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useEffect, useRef, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { GlassBackButton, PressableScale } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { images } from "@/utils/images";
import { href } from "@/navigation/href";
import { STAGGER_MS } from "@/utils/motion";
import { showToastMessage } from "@/utils/app-utils";
import ChallengeFormatCard from "../components/organize/components/ChallengeFormatCard";
import ListYourEventButton from "../components/organize/components/ListYourEventButton";
import ExternalListingRow from "../components/organize/components/ExternalListingRow";
import ActiveListingLimitModal from "../components/organize/components/ActiveListingLimitModal";
import {
  fetchMyOrganizer,
  upsertOrganizer,
  fetchMyOrganizerEvents,
} from "../../model/managedEvents.thunks";
import { useRequireAuth, updateUser, refreshCurrentUserProfile, PhoneVerifyModal } from "@/features/auth";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { captureEvent } from "@/analytics/posthog/events";

import { useProSubscription } from "@/features/gymBusiness";

const H_PAD = 13;
const CARD_GAP = 5;
const CARD_HEIGHT = 142;
/** Extra lift so the dock clears Gboard's suggestion bar / rounded keys. */
const KEYBOARD_CLEARANCE = Platform.OS === "android" ? 28 : 16;

const OrganizeCreateScreen = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { returnTo, from } = useLocalSearchParams<{ returnTo?: string; from?: string }>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const requireAuth = useRequireAuth();
  const { isPro } = useProSubscription();
  const cardWidth = (width - H_PAD * 2 - CARD_GAP) / 2;

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [redirectExpanded, setRedirectExpanded] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [submittingRedirect, setSubmittingRedirect] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      const frameH = Math.round(e.endCoordinates?.height || 0);
      const winH = Dimensions.get("window").height;
      const screenY = e.endCoordinates?.screenY;
      const overlap = typeof screenY === "number" ? Math.max(0, Math.round(winH - screenY)) : 0;
      setKeyboardHeight(Math.max(frameH, overlap, 0));
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const isStronManagedListing = (listingType?: string | null) =>
    !listingType || listingType === "stron_managed";

  const navigateToCreate = async (
    pathname: string,
    params?: Record<string, string>,
    options?: { skipManagedLimit?: boolean; format?: string },
  ) => {
    if (!user || user.isGuest) {
      requireAuth(() => {
        void navigateToCreate(pathname, params, options);
      });
      return;
    }
    captureEvent("create_format_selected", {
      format: options?.format || params?.format || pathname.split("/").pop() || pathname,
    });
    const finalParams = {
      ...(params || {}),
      ...(returnTo ? { returnTo } : {}),
    };
    try {
      await dispatch(fetchMyOrganizer()).unwrap();

      if (!options?.skipManagedLimit && !isPro) {
        const myEvents = await dispatch(fetchMyOrganizerEvents()).unwrap();
        const activeManagedCount = myEvents.filter(
          (event) =>
            (event.status === "published" || event.status === "live") &&
            isStronManagedListing(event.listingType),
        ).length;
        if (activeManagedCount >= 1) {
          setPendingNavigation(
            () => () => router.push((finalParams ? { pathname, params: finalParams } : pathname) as never),
          );
          setShowLimitModal(true);
          return;
        }
      }

      router.push((finalParams ? { pathname, params: finalParams } : pathname) as never);
    } catch (error) {
      const apiError = error as any;
      const isMissingProfile =
        apiError?.code === "organizer_not_verified" ||
        apiError?.code === "organizer_profile_missing" ||
        apiError?.code === "organizer_not_found" ||
        String(apiError?.message || "")
          .toLowerCase()
          .includes("phone");

      if (isMissingProfile) {
        let phoneOk = user?.phoneVerified === true;
        if (!phoneOk && user?.uid) {
          try {
            await dispatch(refreshCurrentUserProfile(user.uid)).unwrap();
            phoneOk = true;
          } catch {
            // Keep existing status
          }
        }

        if (phoneOk) {
          try {
            await dispatch(upsertOrganizer({
              fullName: user?.username?.trim() || user?.email?.split("@")[0] || "Organizer",
              mobileNumber: user?.contactNo || undefined,
            })).unwrap();
            router.push((finalParams ? { pathname, params: finalParams } : pathname) as never);
          } catch (upsertError) {
            const upsertApiError = upsertError as { code?: string; message?: string };
            if (
              upsertApiError?.code === "organizer_not_verified" ||
              String(upsertApiError?.message || "")
                .toLowerCase()
                .includes("phone")
            ) {
              setPendingNavigation(
                () => () => router.push((finalParams ? { pathname, params: finalParams } : pathname) as never),
              );
              setShowVerifyModal(true);
              return;
            }
            showToastMessage("Failed to setup organizer profile.");
          }
        } else {
          setPendingNavigation(
            () => () => router.push((finalParams ? { pathname, params: finalParams } : pathname) as never),
          );
          setShowVerifyModal(true);
        }
      } else {
        showToastMessage("Failed to verify organizer status.");
      }
    }
  };

  const handleBack = useCallback(() => {
    if (redirectExpanded) {
      Keyboard.dismiss();
      setRedirectExpanded(false);
      return;
    }
    const target = returnTo || from;
    if (target === "business" || target === "plan" || target === "analytics") {
      router.replace(href.app.businessPlan as never);
      return;
    }
    if (target === "listings") {
      router.replace(href.app.listings as never);
      return;
    }
    if (target) {
      router.replace(target as never);
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(href.app.businessPlan as never);
    }
  }, [redirectExpanded, returnTo, from, router]);

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };
      const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => sub.remove();
    }, [handleBack]),
  );

  const toggleRedirect = () => {
    if (redirectExpanded) {
      Keyboard.dismiss();
      setRedirectExpanded(false);
      return;
    }
    setRedirectExpanded(true);
    // Focus after panel mounts — single input, no remount loops.
    requestAnimationFrame(() => {
      setTimeout(() => inputRef.current?.focus(), 100);
    });
  };

  const submitRedirectUrl = async () => {
    if (!user || user.isGuest) {
      router.push({
        pathname: href.auth.login,
        params: { slide: 0 },
      });
      return;
    }
    const trimmed = redirectUrl.trim();
    if (!trimmed) {
      showToastMessage("Paste your external listing URL.");
      return;
    }
    const urlPattern =
      /^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/i;
    if (!urlPattern.test(trimmed)) {
      showToastMessage("Enter a valid URL.");
      return;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    setSubmittingRedirect(true);
    try {
      Keyboard.dismiss();
      await navigateToCreate(
        href.app.externalListing,
        { url: withProtocol },
        { skipManagedLimit: true, format: "external_listing" },
      );
    } finally {
      setSubmittingRedirect(false);
    }
  };

  // Panel stays mounted while expanded; only `bottom` moves with keyboard height.
  const panelBottom = keyboardHeight > 0 ? keyboardHeight + KEYBOARD_CLEARANCE : 0;

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topInset + 8,
            paddingBottom: redirectExpanded ? 200 + keyboardHeight : 30,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Animated.View entering={FadeInDown.duration(360).delay(0)} style={styles.headerRow}>
          <GlassBackButton onPress={handleBack} sticky={false} size={42} iconSize={22} />
          <CustomText style={styles.titleText}>
            Create
          </CustomText>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(STAGGER_MS)}>
          <CustomText style={styles.sectionLabel}>STRON Virtual Challenges</CustomText>
          <View style={styles.grid}>
            <View style={[styles.cardSlot, { width: cardWidth }]}>
              <ChallengeFormatCard
                title="Marathon"
                description="Complete a long-distance goal at your own pace."
                illustration={images.CREATE_V2.ICON_MARATHON}
                illustrationStyle={styles.marathonArt}
                fallbackGlyph="walk-outline"
                onPress={() =>
                  navigateToCreate(
                    href.app.createMarathon,
                    { listingType: "stron_managed" },
                    { format: "marathon" },
                  )
                }
              />
            </View>
            <View style={[styles.cardSlot, { width: cardWidth }]}>
              <ChallengeFormatCard
                title="Step Challenge"
                description="Compete by achieving the highest step count."
                illustration={images.CREATE_V2.ICON_STEP_CHALLENGE}
                illustrationStyle={styles.stepArt}
                fallbackGlyph="footsteps-outline"
                onPress={() =>
                  navigateToCreate(
                    href.app.createStepChallenge,
                    { listingType: "stron_managed" },
                    { format: "step_challenge" },
                  )
                }
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(STAGGER_MS * 2)}>
          <CustomText style={styles.sectionLabel}>STRON Virtual Fitness Games</CustomText>
          <View style={styles.grid}>
            <View style={[styles.cardSlot, { width: cardWidth }]}>
              <ChallengeFormatCard
                title="King of the Hill"
                description="Defend your lead until the challenge ends."
                illustration={images.CREATE_V2.ICON_KOTH}
                illustrationStyle={styles.kothArt}
                fallbackGlyph="trophy-outline"
                onPress={() =>
                  navigateToCreate(href.app.createKingOfTheHill, {
                    format: "king_of_the_hill",
                    listingType: "stron_managed",
                  })
                }
              />
            </View>
            <View style={[styles.cardSlot, { width: cardWidth }]}>
              <ChallengeFormatCard
                title="Face-Off"
                description="Beat your opponent in a direct showdown."
                illustration={images.CREATE_V2.ICON_FACE_OFF}
                illustrationStyle={styles.faceOffArt}
                fallbackGlyph="flash-outline"
                onPress={() =>
                  navigateToCreate(href.app.createFaceOff, {
                    format: "face_off",
                    listingType: "stron_managed",
                  })
                }
              />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(360).delay(STAGGER_MS * 3)}>
          <CustomText style={styles.eventListingTitle}>Event Listing</CustomText>
          <ListYourEventButton
            onPress={() =>
              navigateToCreate(
                href.app.createMarathon,
                { marathonMode: "in_person", listingType: "self_managed" },
                { skipManagedLimit: true, format: "in_person_listing" },
              )
            }
          />
          <View style={styles.redirectWrap}>
            <ExternalListingRow expanded={redirectExpanded} onToggle={toggleRedirect} />
          </View>
        </Animated.View>
      </ScrollView>

      {redirectExpanded ? (
        <Animated.View
          entering={FadeInUp.duration(280)}
          style={[
            styles.redirectPanel,
            {
              bottom: panelBottom,
              paddingBottom: keyboardHeight > 0 ? 18 : 30,
            },
          ]}
        >
          <View style={styles.redirectHandle} />
          <View style={styles.redirectTitleRow}>
            <View style={styles.redirectIconBadge}>
              <Ionicons name="link-outline" size={16} color="#086CFF" />
            </View>
            <View style={styles.redirectTitleCopy}>
              <CustomText style={styles.redirectTitle}>External redirect</CustomText>
              <CustomText style={styles.redirectHint}>
                Paste your event URL — users will open your page directly
              </CustomText>
            </View>
          </View>
          <View style={styles.redirectRow}>
            <View style={styles.inputWrap}>
              <Ionicons
                name="globe-outline"
                size={18}
                color="rgba(255,255,255,0.35)"
                style={styles.inputLeadingIcon}
              />
              <TextInput
                ref={inputRef}
                value={redirectUrl}
                onChangeText={setRedirectUrl}
                placeholder="https://your-event.com"
                placeholderTextColor="rgba(255,255,255,0.32)"
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                returnKeyType="go"
                blurOnSubmit={false}
                onSubmitEditing={() => void submitRedirectUrl()}
              />
            </View>
            <PressableScale
              onPress={() => void submitRedirectUrl()}
              disabled={submittingRedirect}
              style={[styles.submitBtn, submittingRedirect && styles.submitBtnDisabled]}
              accessibilityRole="button"
              accessibilityLabel="Continue with external URL"
            >
              {submittingRedirect ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              )}
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}

      <PhoneVerifyModal
        visible={showVerifyModal}
        onClose={() => {
          setShowVerifyModal(false);
          setPendingNavigation(null);
        }}
        onVerified={async (contactNo: string) => {
          dispatch(
            updateUser({
              contactNo,
              phoneVerified: true,
            }),
          );
          try {
            await dispatch(upsertOrganizer({
              fullName: user?.username?.trim() || user?.email?.split("@")[0] || "Organizer",
              mobileNumber: contactNo,
            })).unwrap();
          } catch {
            // Profile may already exist; create flow will ensure organizer if needed.
          }
          setShowVerifyModal(false);
          if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
          }
        }}
      />
      <ActiveListingLimitModal
        visible={showLimitModal}
        onClose={() => {
          setShowLimitModal(false);
          setPendingNavigation(null);
        }}
        onGoToLive={() => {
          setShowLimitModal(false);
          setPendingNavigation(null);
          router.push(href.app.profile);
        }}
        onUpgradeSuccess={() => {
          setShowLimitModal(false);
          if (pendingNavigation) {
            pendingNavigation();
            setPendingNavigation(null);
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#090909",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: H_PAD,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleText: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 32,
    lineHeight: 44,
    paddingBottom: 4,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "right",
    letterSpacing: -0.5,
  },
  sectionLabel: {
    ...fontTextStyles.twentyFourNormalBlack,
    marginTop: 18,
    marginBottom: 10,
    color: "rgba(255,255,255,0.6)",
  },
  eventListingTitle: {
    ...fontTextStyles.twentyFourNormalBlack,
    marginTop: 28,
    marginBottom: 12,
    color: "#FFFFFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  cardSlot: {
    height: CARD_HEIGHT,
  },
  redirectWrap: {
    marginTop: 14,
  },
  redirectPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    backgroundColor: "#111111",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 24,
  },
  redirectHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 14,
  },
  redirectTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  redirectIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(8,108,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(8,108,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  redirectTitleCopy: {
    flex: 1,
    paddingTop: 1,
  },
  redirectTitle: {
    ...fontTextStyles.eighteenNormalBlack,
    color: "#FFFFFF",
    marginBottom: 3,
  },
  redirectHint: {
    ...fontTextStyles.sixteenNormalBlack,
    color: "rgba(255,255,255,0.48)",
  },
  redirectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  inputLeadingIcon: {
    marginRight: 10,
  },
  input: {
    ...fontTextStyles.sixteenNormalBlack,
    flex: 1,
    color: "#FFFFFF",
    padding: 0,
    margin: 0,
  },
  submitBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#086CFF",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  marathonArt: {
    width: 82,
    height: 82,
    right: 4,
    top: 4,
  },
  stepArt: {
    width: 82,
    height: 82,
    right: 4,
    top: 4,
  },
  kothArt: {
    width: 84,
    height: 84,
    right: 4,
    top: 2,
  },
  faceOffArt: {
    width: 88,
    height: 88,
    right: 2,
    top: 2,
  },
});

export default OrganizeCreateScreen;

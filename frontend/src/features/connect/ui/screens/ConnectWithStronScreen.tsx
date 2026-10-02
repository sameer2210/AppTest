import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { href } from "@/navigation/href";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
import { PressableScale, ScreenImageBackground, ScreenSafeArea } from "@/components/ui";
import CustomText from "@/components/CustomText";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { showToastMessage } from "@/utils/app-utils";
import { shareMessageWithLink } from "@/utils/shareMessage";
import { getShareBaseUrl } from "@/utils/shareBaseUrl";
import { captureEvent } from "@/analytics/posthog/events";
import { images } from "@/utils/images";
import { SCREEN_CONTENT_PADDING_BOTTOM, SCREEN_HORIZONTAL_PADDING_WIDE } from "@/utils/screen-layout";
import { getExpoCamera } from "@/provider/expoCameraLazy";
import { buildConnectDisplayCode, buildConnectQrPayload } from "../../lib/connectQr.utils";
import type { ConnectCheckInPlan, ConnectQrMe, ConnectScanItem } from "@/features/connect";
import {
  getTodayCheckInsThunk,
  getMyQrThunk,
  scanConnectQr,
  setCheckInCatalogThunk,
} from "../../model/connect.thunks";
import {
  CameraScannerView,
  CheckInResultOverlay,
  type CheckInResultState,
  ManualCodeInputView,
  ProfileQrView,
  TodayCheckInsModal,
} from "../components";


type TabKey = "profile" | "scan";

const cameraModule = getExpoCamera();
const CameraView = cameraModule?.CameraView ?? null;
const useCameraPermissionsHook =
  cameraModule?.useCameraPermissions ??
  (() => [{ granted: false }, async () => ({ granted: false })]);

const ConnectWithStronScreen = () => {
  const { width: windowWidth } = useWindowDimensions();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const uid = user?.uid?.trim() || "";
  const cardSize = useMemo(() => Math.min(windowWidth - 48, 380), [windowWidth]);

  const [tab, setTab] = useState<TabKey>("scan");
  const [scanMode, setScanMode] = useState<"camera" | "manual">("camera");
  const [manualInputCode, setManualInputCode] = useState("");
  const [torch, setTorch] = useState(false);
  const [permission, requestPermission] = useCameraPermissionsHook();
  const [qrMe, setQrMe] = useState<ConnectQrMe | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [scanning, setScanning] = useState(false);

  const [checkInState, setCheckInState] = useState<CheckInResultState | null>(null);
  const [showTodayCheckInsModal, setShowTodayCheckInsModal] = useState(false);
  const [checkInsList, setCheckInsList] = useState<ConnectScanItem[]>([]);
  const [loadingCheckIns, setLoadingCheckIns] = useState(false);

  const scanLockRef = useRef(false);
  const checkInStateRef = useRef<CheckInResultState | null>(null);
  const lastSeenScanIdRef = useRef<string | null>(null);
  const lastScannedPayloadRef = useRef<{ payload: string; time: number }>({
    payload: "",
    time: 0,
  });
  const lastScanTimeRef = useRef(0);
  const hasRequestedPermissionRef = useRef(false);

  const cameraAvailable = Boolean(CameraView);

  const updateCheckInState = useCallback((val: CheckInResultState | null) => {
    checkInStateRef.current = val;
    setCheckInState(val);
  }, []);

  const resetScanLock = useCallback(() => {
    scanLockRef.current = false;
    setScanning(false);
  }, []);

  const dismissCheckInState = useCallback(() => {
    updateCheckInState(null);
    resetScanLock();
  }, [updateCheckInState, resetScanLock]);

  const displayCode = useMemo(() => {
    return qrMe?.displayCode || (uid ? buildConnectDisplayCode(uid) : "â”€â”€â”€â”€â”€");
  }, [qrMe?.displayCode, uid]);

  const qrPayload = useMemo(() => {
    return qrMe?.qrPayload || (uid ? buildConnectQrPayload(uid) : "");
  }, [qrMe?.qrPayload, uid]);

  const fetchTodayCheckIns = useCallback(async () => {
    setLoadingCheckIns(true);
    try {
      const scans = await dispatch(getTodayCheckInsThunk()).unwrap();
      setCheckInsList(scans);
    } catch {
      // ignore network errors
    } finally {
      setLoadingCheckIns(false);
    }
  }, [dispatch]);

  const fetchMyQr = useCallback(
    async (refresh = false) => {
      if (!uid) {
        setLoadingQr(false);
        return;
      }
      if (refresh) setLoadingQr(true);
      try {
        const me = await dispatch(getMyQrThunk(refresh)).unwrap();
        setQrMe(me);
        if (refresh) {
          showToastMessage("New code generated!");
        }

        // Show success screen on target user's device when scanned.
        // On first load (lastSeenScanIdRef is null), just record the current
        // scanId so we don't show a stale check-in from a previous session.
        if (me.latestIncomingScan?.scanId) {
          if (lastSeenScanIdRef.current === null) {
            // First load â€“ just seed the ref, don't show overlay
            lastSeenScanIdRef.current = me.latestIncomingScan.scanId;
          } else if (
            me.latestIncomingScan.scanId !== lastSeenScanIdRef.current &&
            !checkInStateRef.current
          ) {
            lastSeenScanIdRef.current = me.latestIncomingScan.scanId;
            if (me.latestIncomingScan.openExplore) {
              showToastMessage(
                `${me.latestIncomingScan.scannerName || "Someone"} connected — opening Explore`,
              );
              router.push(href.app.explore as never);
            } else if (me.latestIncomingScan.hasMultiple) {
              const entityName =
                me.latestIncomingScan.entityName || me.latestIncomingScan.scannerName || "Check-in";
              let plans = [];
              let events = [];
              try {
                plans = JSON.parse(me.latestIncomingScan.plansJson || "[]");
              } catch {
                plans = [];
              }
              try {
                events = JSON.parse(me.latestIncomingScan.eventsJson || "[]");
              } catch {
                events = [];
              }
              dispatch(
                setCheckInCatalogThunk({
                  scanId: me.latestIncomingScan.scanId,
                  entityName,
                  plans,
                  events,
                }),
              );
              router.push({
                pathname: href.app.checkInSelection as never,
                params: {
                  entityName,
                  scanId: me.latestIncomingScan.scanId,
                  targetUid: me.latestIncomingScan.providerUid || me.latestIncomingScan.scannerUid,
                  providerUid: me.latestIncomingScan.providerUid,
                  businessId: me.latestIncomingScan.businessId || undefined,
                  viewMode: me.latestIncomingScan.viewMode || undefined,
                },
              });
            } else {
              updateCheckInState({
                status: "success",
                title: "Check in\nSuccessful",
                subtitle: `${me.latestIncomingScan.scannerName} connected with you`,
                buttonText: "Great, Let's Go",
                // Stay on Connect QR â default overlay success navigates away.
                onPressAction: () => {
                  dismissCheckInState();
                },
              });
            }
          }
        }
      } catch {
        setQrMe({
          uid,
          username: user?.username || null,
          profileImageUrl: user?.profileImageUrl || null,
          displayCode: buildConnectDisplayCode(uid),
          qrPayload: buildConnectQrPayload(uid),
        });
      } finally {
        setLoadingQr(false);
      }
    },
    [dispatch, uid, user?.username, user?.profileImageUrl, updateCheckInState, dismissCheckInState],
  );

  // Poll for incoming scans only when on "Your Profile" tab (showing QR code to be scanned by a provider).
  useFocusEffect(
    useCallback(() => {
      void fetchMyQr(false);

      if (tab !== "profile") {
        return;
      }

      let interval: ReturnType<typeof setInterval> | null = null;

      const startPolling = () => {
        if (!interval) {
          interval = setInterval(() => {
            if (!checkInStateRef.current && AppState.currentState === "active") {
              void fetchMyQr(false);
            }
          }, 3500);
        }
      };

      const stopPolling = () => {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      startPolling();

      const subscription = AppState.addEventListener("change", (nextState) => {
        if (nextState === "active") {
          startPolling();
        } else {
          stopPolling();
        }
      });

      return () => {
        stopPolling();
        subscription.remove();
      };
    }, [fetchMyQr, tab]),
  );

  // Request camera permission on mount to scan tab
  useEffect(() => {
    if (
      tab === "scan" &&
      scanMode === "camera" &&
      cameraAvailable &&
      permission &&
      !permission.granted &&
      !hasRequestedPermissionRef.current
    ) {
      hasRequestedPermissionRef.current = true;
      void requestPermission();
    }
    if (tab !== "scan") {
      hasRequestedPermissionRef.current = false;
    }
  }, [tab, scanMode, cameraAvailable, permission, requestPermission]);

  // Reset scan mode when switching away from scan tab
  useEffect(() => {
    if (tab !== "scan") {
      setTorch(false);
      setScanMode("camera");
      resetScanLock();
      updateCheckInState(null);
    }
  }, [tab, resetScanLock, updateCheckInState]);

  const onShare = useCallback(async () => {
    if (!uid) {
      showToastMessage("Sign in to share your code.");
      return;
    }
    try {
      const shareUrl = `${getShareBaseUrl()}/api/connect/${encodeURIComponent(uid)}`;
      const message = `Connect with me on STRON!\nCode: ${displayCode}\n\nOpen profile: ${shareUrl}`;
      await shareMessageWithLink({
        message,
        url: shareUrl,
        title: "Connect with STRON",
      });
      captureEvent("connect_qr_shared", { method: "share" });
    } catch {
      // user cancelled
    }
  }, [uid, displayCode]);

  const onCopy = useCallback(async () => {
    if (!uid) {
      showToastMessage("Sign in to copy your code.");
      return;
    }
    await Clipboard.setStringAsync(displayCode);
    captureEvent("connect_qr_shared", { method: "copy" });
    showToastMessage("Code copied");
  }, [uid, displayCode]);

  const handleScanPayload = useCallback(
    async (payload: string) => {
      const trimmed = payload.trim();
      if (!trimmed) return;

      const now = Date.now();
      if (
        lastScannedPayloadRef.current.payload === trimmed &&
        now - lastScannedPayloadRef.current.time < 4000
      ) {
        return;
      }

      if (scanLockRef.current || checkInStateRef.current) {
        return;
      }

      lastScannedPayloadRef.current = { payload: trimmed, time: now };
      scanLockRef.current = true;
      setScanning(true);

      try {
        const result = await dispatch(scanConnectQr(trimmed)).unwrap();

        // Gym owner scanned a member → show attendance result before Explore/catalog.
        if (
          result.kind === "user_connect" &&
          result.isProviderScan &&
          (result.checkedIn || result.alreadyCheckedIn)
        ) {
          updateCheckInState({
            status: result.alreadyCheckedIn ? "failed" : "success",
            title: result.alreadyCheckedIn ? "Already\nChecked In" : "Check in\nSuccessful",
            subtitle: result.message || `Checked in ${result.user?.username || "member"}`,
            buttonText: "Done",
            onPressAction: () => {
              dismissCheckInState();
              if (result.openExploreForScanner || result.viewMode === "explore") {
                router.push(href.app.explore as never);
              } else if (result.openCatalogForScanner || result.hasMultiple) {
                const entityName = result.entityName || result.user?.username || "Check-in";
                dispatch(
                  setCheckInCatalogThunk({
                    scanId: result.scanId,
                    entityName,
                    plans: (result.plans || []) as ConnectCheckInPlan[],
                    events: result.events || [],
                  }),
                );
                router.push({
                  pathname: href.app.checkInSelection as never,
                  params: {
                    entityName,
                    scanId: result.scanId || undefined,
                    viewMode: result.viewMode || undefined,
                    targetUid: result.providerUid || result.targetUid,
                    providerUid: result.providerUid,
                    businessId: result.business?.id ? String(result.business.id) : undefined,
                  },
                });
              } else {
                void fetchMyQr(true);
              }
            },
          });
        } else if (
          result.kind === "user_connect" &&
          (result.openExploreForScanner || result.viewMode === "explore")
        ) {
          showToastMessage(result.message || "Connected — opening Explore");
          router.push(href.app.explore as never);
        } else if (result.kind === "user_connect") {
          const plans = Array.isArray(result.plans)
            ? result.plans
            : (() => {
                try {
                  return result.plansJson ? JSON.parse(result.plansJson) : [];
                } catch {
                  return [];
                }
              })();
          const events = Array.isArray(result.events)
            ? result.events
            : (() => {
                try {
                  return result.eventsJson ? JSON.parse(result.eventsJson) : [];
                } catch {
                  return [];
                }
              })();
          const providerUid = result.providerUid || result.targetUid;
          const myUid = result.me?.uid || uid;
          const scannerIsProvider = Boolean(providerUid) && Boolean(myUid) && providerUid === myUid;
          const shouldOpenCatalog =
            result.isSelfListing ||
            result.openCatalogForScanner === true ||
            (result.openCatalogForScanner !== false &&
              !scannerIsProvider &&
              (result.hasMultiple || plans.length > 0 || events.length > 0 || result.business));

          const targetUid =
            providerUid || result.user?.uid || (result.isSelfListing ? result.me?.uid : undefined);
          const entityName =
            result.entityName ||
            result.provider?.username ||
            (result.isSelfListing ? "My Business" : undefined) ||
            result.user?.username ||
            "Check-in";
          const scanId = result.scanId ? String(result.scanId) : undefined;

          if (shouldOpenCatalog && targetUid) {
            dispatch(
              setCheckInCatalogThunk({
                scanId,
                entityName,
                plans,
                events,
              }),
            );
            router.push({
              pathname: href.app.checkInSelection as never,
              params: {
                entityName,
                scanId,
                targetUid,
                providerUid: providerUid || targetUid,
                businessId: result.business?.id ? String(result.business.id) : undefined,
                viewMode: result.viewMode || undefined,
              },
            });
          } else {
            updateCheckInState({
              status: "success",
              title: "Connected\nSuccessfully",
              subtitle:
                result.message ||
                (scannerIsProvider
                  ? "Member can view your plans on their phone."
                  : "You are now connected!"),
              buttonText: "Great, Let's Go",
              onPressAction: () => {
                dismissCheckInState();
              },
            });
          }
        } else if (result.hasMultiple) {
          const entityName =
            ("entityName" in result && result.entityName) ||
            (result.kind === "multi_selection" ? result.gymName : undefined) ||
            "Check-in";
          const plans =
            ("plans" in result && Array.isArray(result.plans) ? result.plans : null) ||
            (() => {
              try {
                return "plansJson" in result && result.plansJson
                  ? JSON.parse(result.plansJson)
                  : [];
              } catch {
                return [];
              }
            })();
          const events =
            ("events" in result && Array.isArray(result.events) ? result.events : null) ||
            (() => {
              try {
                return "eventsJson" in result && result.eventsJson
                  ? JSON.parse(result.eventsJson)
                  : [];
              } catch {
                return [];
              }
            })();
          dispatch(
            setCheckInCatalogThunk({
              entityName,
              plans: plans as ConnectCheckInPlan[],
              events,
            }),
          );
          const catalogMeta = result as {
            business?: { id?: string };
            viewMode?: string;
            scanId?: string;
          };
          router.push({
            pathname: href.app.checkInSelection as never,
            params: {
              entityName,
              businessId: catalogMeta.business?.id ? String(catalogMeta.business.id) : undefined,
              viewMode: catalogMeta.viewMode,
              scanId: catalogMeta.scanId,
            },
          });
        } else if (result.kind === "event_check_in") {
          if (result.alreadyCheckedIn) {
            updateCheckInState({
              status: "failed",
              title: "Already\nChecked In",
              subtitle: result.message || "You are already checked in for this event.",
              buttonText: "View Event",
              onPressAction: () => {
                dismissCheckInState();
                if (result.eventKey) {
                  router.push({
                    pathname: href.app.stronEvent,
                    params: { key: result.eventKey },
                  } as never);
                } else {
                  router.replace(href.app.home as never);
                }
              },
            });
          } else {
            updateCheckInState({
              status: "success",
              title: "Check in\nSuccessful",
              subtitle: result.message || `Checked into ${result.eventTitle || "event"}`,
              buttonText: "View Event",
              onPressAction: () => {
                if (result.eventKey) {
                  router.push({
                    pathname: href.app.stronEvent,
                    params: { key: result.eventKey },
                  } as never);
                } else {
                  router.replace(href.app.home as never);
                }
              },
            });
          }
        } else if (result.kind === "station_check_in" || result.kind === "gym_check_in") {
          const entityName =
            result.kind === "station_check_in" ? result.entityName : result.gymName;
          updateCheckInState({
            status: result.alreadyCheckedIn ? "failed" : "success",
            title: result.alreadyCheckedIn ? "Already\nChecked In" : "Check-In\nSuccessful",
            subtitle: result.message || `Checked into ${entityName}`,
            buttonText: "Done",
            onPressAction: () => {
              dismissCheckInState();
            },
          });
        } else {
          router.replace(href.app.home as never);
        }
      } catch (err: unknown) {
        let errorMsg = "Something went wrong. Try again.";
        if (err instanceof Error) {
          errorMsg = err.message;
        }
        updateCheckInState({
          status: "failed",
          title: "Check in\nFailed",
          subtitle: errorMsg,
          buttonText: "Try Again",
        });
      } finally {
        scanLockRef.current = false;
        setScanning(false);
      }
    },
    [dispatch, updateCheckInState, dismissCheckInState, uid, fetchMyQr],
  );

  const onBarcodeScanned = useCallback(
    (result: { data?: string }) => {
      const now = Date.now();
      if (now - lastScanTimeRef.current < 500) return;
      const payload = String(result.data || "").trim();
      if (!payload) return;
      lastScanTimeRef.current = now;
      void handleScanPayload(payload);
    },
    [handleScanPayload],
  );

  const onPickFromGallery = useCallback(async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      showToastMessage("Photo library permission is required.");
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    if (picked.canceled || !picked.assets[0]?.uri) return;
    setTab("scan");
    setScanMode("camera");
    showToastMessage("Select a QR image to scan.");
  }, []);

  const handleCodeTextChange = useCallback((text: string) => {
    const formatted = text
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 5);
    setManualInputCode(formatted);
  }, []);

  const onPasteFromClipboard = useCallback(async () => {
    const text = await Clipboard.getStringAsync();
    if (text?.trim()) {
      const formatted = text
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 5);
      setManualInputCode(formatted);
      showToastMessage("Pasted code from clipboard");
    } else {
      showToastMessage("Clipboard is empty");
    }
  }, []);

  const openTodayCheckInsModal = useCallback(() => {
    setShowTodayCheckInsModal(true);
    void fetchTodayCheckIns();
  }, [fetchTodayCheckIns]);

  // —— 1. CHECK IN RESULT OVERLAY (SUCCESS / FAILED) ——
  if (checkInState) {
    return <CheckInResultOverlay state={checkInState} onDismiss={dismissCheckInState} />;
  }

  // —— 2. MAIN CONNECT WITH STRON SCREEN ——
  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScreenImageBackground source={images.HOME_V2.BG} flipY edgeToEdge />

      <ScreenSafeArea>
        <View
          style={[
            styles.content,
            {
              paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
            },
          ]}
        >
          {/* Top Header with Back button, Title & Subtitle */}
          <View style={styles.headerRow}>
            <PressableScale
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={23} color="#FFFFFF" />
            </PressableScale>

            <View style={styles.headerTitleContainer}>
              <CustomText style={styles.headerTitle}>
                Connect with STRON
              </CustomText>
              <CustomText style={styles.headerSubtitle}>
                Share or Scan to Connect
              </CustomText>
            </View>
          </View>

          {/* Segmented Tab Pill ("Your Profile" | "Scan QR") */}
          <View style={styles.tabContainer}>
            <PressableScale
              key="tab-btn-profile"
              onPress={() => {
                captureEvent("connect_tab_switched", { tab: "profile" });
                setTab("profile");
                setScanMode("camera");
              }}
              style={[
                styles.tabButton,
                tab === "profile" ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
            >
              <CustomText
                style={[
                  styles.tabText,
                  tab === "profile" ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Your Profile
              </CustomText>
            </PressableScale>
            <PressableScale
              key="tab-btn-scan"
              onPress={() => {
                captureEvent("connect_tab_switched", { tab: "scan" });
                setTab("scan");
              }}
              style={[
                styles.tabButton,
                tab === "scan" ? styles.tabButtonActive : styles.tabButtonInactive,
              ]}
            >
              <CustomText
                style={[
                  styles.tabText,
                  tab === "scan" ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                Scan QR
              </CustomText>
            </PressableScale>
          </View>

          {/* Main Square Card Container */}
          <View
            style={[
              styles.cardContainer,
              { width: cardSize, height: cardSize },
            ]}
          >
            {tab === "profile" ? (
              <ProfileQrView
                loadingQr={loadingQr}
                qrPayload={qrPayload}
                displayCode={displayCode}
                cardSize={cardSize}
              />
            ) : (
              <View style={styles.scannerWrapper}>
                <CameraScannerView
                  cameraAvailable={cameraAvailable}
                  CameraView={CameraView}
                  permission={permission}
                  torch={torch}
                  setTorch={setTorch}
                  scanning={scanning}
                  scanMode={scanMode}
                  checkInState={checkInState}
                  onPickFromGallery={onPickFromGallery}
                  onRequestPermission={() => void requestPermission()}
                  onBarcodeScanned={onBarcodeScanned}
                />

                {scanMode === "manual" && (
                  <ManualCodeInputView
                    manualInputCode={manualInputCode}
                    onChangeText={handleCodeTextChange}
                    onPaste={onPasteFromClipboard}
                    onSubmit={(code) => void handleScanPayload(code)}
                  />
                )}
              </View>
            )}
          </View>

          {/* Action Buttons below Card */}
          <View style={styles.actionsContainer}>
            <View style={styles.buttonsRow}>
              {tab === "profile" ? (
                <>
                  <PressableScale
                    onPress={() => void onShare()}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
                    <CustomText style={styles.actionBtnText}>Share</CustomText>
                  </PressableScale>

                  <PressableScale
                    onPress={() => void onCopy()}
                    style={styles.actionBtn}
                  >
                    <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                    <CustomText style={styles.actionBtnText}>Copy Code</CustomText>
                  </PressableScale>
                </>
              ) : scanMode === "camera" ? (
                <PressableScale
                  onPress={() => setScanMode("manual")}
                  style={styles.actionBtn}
                >
                  <Ionicons name="keypad-outline" size={18} color="#FFFFFF" />
                  <CustomText style={styles.actionBtnText}>
                    Enter Code Manually
                  </CustomText>
                </PressableScale>
              ) : (
                <PressableScale
                  onPress={() => setScanMode("camera")}
                  style={styles.actionBtn}
                >
                  <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                  <CustomText style={styles.actionBtnText}>Scan QR Code</CustomText>
                </PressableScale>
              )}
            </View>

            {/* Reusable View Today's Check-In Trigger */}
            <PressableScale onPress={openTodayCheckInsModal} style={styles.todayCheckInsButton}>
              <CustomText style={styles.todayCheckInsText}>
                View Today&apos;s Check-In
              </CustomText>
            </PressableScale>
          </View>
        </View>
      </ScreenSafeArea>

      {/* Today's Check-In Modal */}
      <TodayCheckInsModal
        visible={showTodayCheckInsModal}
        onClose={() => setShowTodayCheckInsModal(false)}
        loading={loadingCheckIns}
        checkInsList={checkInsList}
        onRefresh={fetchTodayCheckIns}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050B18",
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
  },
  headerRow: {
    marginBottom: 24,
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
  headerTitleContainer: {
    alignItems: "flex-end",
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontFamily: "SpaceGrotesk-Bold",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "right",
  },
  headerSubtitle: {
    marginTop: 2,
    fontFamily: "SpaceGrotesk-Regular",
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "right",
  },
  tabContainer: {
    marginBottom: 24,
    flexDirection: "row",
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    padding: 4,
  },
  tabButton: {
    height: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9999,
  },
  tabButtonActive: {
    backgroundColor: "#000000",
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
  },
  tabText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 14,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabTextInactive: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  cardContainer: {
    alignSelf: "center",
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    backgroundColor: "#0B1E42",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.58,
    shadowRadius: 16,
  },
  scannerWrapper: {
    position: "relative",
    height: "100%",
    width: "100%",
    backgroundColor: "#D9D9D9",
  },
  actionsContainer: {
    marginTop: 24,
    width: "100%",
    alignItems: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  actionBtn: {
    height: 52,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    backgroundColor: "rgba(42, 74, 122, 0.7)",
  },
  actionBtnText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 15,
    color: "#FFFFFF",
  },
  todayCheckInsButton: {
    marginTop: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  todayCheckInsText: {
    fontFamily: "SpaceGrotesk-Medium",
    fontSize: 16,
    color: "#FFFFFF",
    textDecorationLine: "underline",
  },
});

export default ConnectWithStronScreen;

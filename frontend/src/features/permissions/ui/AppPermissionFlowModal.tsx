import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { usePathname } from "expo-router";
import PermissionModal, { type PermissionType } from "@/components/permissions/PermissionModal";
import {
  registerPermissionSheetOpener,
  notifyPermissionSettled,
  type StartupPermissionSheet,
} from "../api/permissions.api";
import {
  loadDismissedPermissionSheetsThunk,
  markPermissionSheetDismissedThunk,
  markPermissionSheetsDismissedThunk,
  clearPermissionSheetDismissedThunk,
  checkActivityPermissionThunk,
  checkHealthStoreLinkedThunk,
  checkPushPermissionThunk,
  requestActivityPermissionThunk,
  requestHealthStoreAuthorizationThunk,
  requestPushPermissionThunk,
  initializeTrackingForUserThunk,
  initializeNotificationsForUserThunk,
} from "../model/permissions.thunks";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser, selectIsAuthenticated } from "@/features/auth";
import { logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";

const toAnalyticsPermissionType = (
  permission: PermissionType,
): "activity" | "health" | "notification" =>
  permission === "healthConnect"
    ? "health"
    : permission === "activity"
      ? "activity"
      : "notification";

/** Pause so the in-app sheet is gone before the OS dialog. */
const BEFORE_OS_DIALOG_MS = 180;
/** Pause after OS dialog so the next in-app sheet can present cleanly. */
const AFTER_OS_DIALOG_MS = 160;

const REQUIRED_STARTUP_CHAIN: StartupPermissionSheet[] = [
  "activity",
  "healthConnect",
  "notification",
];

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(() => resolve(), ms);
  });

const isStartupSheet = (type: PermissionType): type is StartupPermissionSheet =>
  type === "activity" || type === "healthConnect" || type === "notification";

/** App Review 5.1.1(iv): iOS Motion/Health soft-ask must always proceed to the system dialog. */
const mustProceedToSystemDialog = (type: PermissionType | null): boolean =>
  Platform.OS === "ios" && (type === "activity" || type === "healthConnect");

type AppPermissionFlowModalProps = {
  visible?: boolean;
  onFinish?: () => void;
};

export const AppPermissionFlowModal = ({
  visible: propVisible,
  onFinish,
}: AppPermissionFlowModalProps) => {
  const dispatch = useAppDispatch();
  const [currentPermission, setCurrentPermission] = useState<PermissionType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [dismissalReady, setDismissalReady] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname || "";
  const authUser = useAppSelector(selectAuthUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);
  const isRequestingRef = useRef(false);
  const skippedThisSessionRef = useRef<Set<PermissionType>>(new Set());
  const dismissedRef = useRef<Set<StartupPermissionSheet>>(new Set());
  const isManualRef = useRef(false);
  const manualResolveRef = useRef<((granted: boolean) => void) | null>(null);
  /** iOS system dialogs must be requested only after the in-app modal has fully dismissed. */
  const pendingOsGrantRef = useRef<{ permission: PermissionType; wasManual: boolean } | null>(
    null,
  );

  const isAuthPage = currentPath.includes("/auth/");
  const isUserAuthenticated = isAuthenticated && Boolean(authUser?.uid);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (modalVisible && currentPermission) {
      captureEvent("permission_sheet_shown", {
        type: toAnalyticsPermissionType(currentPermission),
      });
    }
  }, [modalVisible, currentPermission]);

  const showSheet = useCallback((type: PermissionType) => {
    if (!isMountedRef.current) return;
    setCurrentPermission(type);
    setModalVisible(true);
  }, []);

  const hideSheet = useCallback(() => {
    if (!isMountedRef.current) return;
    setModalVisible(false);
  }, []);

  const isAutoSuppressed = useCallback((type: PermissionType) => {
    // Only skip for this cold-start session after the user taps Next/close.
    // Persisted dismissal must not hide the startup sheet — if OS permission
    // is still missing we ask again on the next launch.
    return skippedThisSessionRef.current.has(type);
  }, []);

  const settleManual = useCallback((granted: boolean) => {
    const resolve = manualResolveRef.current;
    manualResolveRef.current = null;
    isManualRef.current = false;
    if (isMountedRef.current) setIsManualOpen(false);
    resolve?.(granted);
    notifyPermissionSettled();
  }, []);

  const persistDismissed = useCallback(
    async (type: PermissionType) => {
      if (!isStartupSheet(type)) return;
      skippedThisSessionRef.current.add(type);
      dismissedRef.current.add(type);
      await dispatch(markPermissionSheetDismissedThunk(type)).unwrap();
    },
    [dispatch],
  );

  const checkNextPermission = useCallback(async () => {
    if (propVisible === false || isAuthPage || !isUserAuthenticated) {
      hideSheet();
      if (isMountedRef.current) setCurrentPermission(null);
      return;
    }
    if (isRequestingRef.current || isManualRef.current) return;
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      if (!isAutoSuppressed("activity")) {
        const activityGranted = await dispatch(checkActivityPermissionThunk()).unwrap();
        if (activityGranted) {
          dismissedRef.current.delete("activity");
          void dispatch(clearPermissionSheetDismissedThunk("activity"));
        } else {
          showSheet("activity");
          return;
        }
      }

      if (!isAutoSuppressed("healthConnect")) {
        const healthLinked = await dispatch(checkHealthStoreLinkedThunk()).unwrap();
        if (healthLinked) {
          dismissedRef.current.delete("healthConnect");
          void dispatch(clearPermissionSheetDismissedThunk("healthConnect"));
        } else {
          showSheet("healthConnect");
          return;
        }
      }

      if (!isAutoSuppressed("notification")) {
        const notificationGranted = await dispatch(checkPushPermissionThunk()).unwrap();
        if (notificationGranted) {
          dismissedRef.current.delete("notification");
          void dispatch(clearPermissionSheetDismissedThunk("notification"));
        } else {
          showSheet("notification");
          return;
        }
      }

      hideSheet();
      if (isMountedRef.current) setCurrentPermission(null);
      onFinish?.();
    } catch (error) {
      logError("[PermissionFlow] Failed checking permissions", error);
      hideSheet();
    } finally {
      isCheckingRef.current = false;
    }
  }, [
    dispatch,
    hideSheet,
    isAuthPage,
    isAutoSuppressed,
    isUserAuthenticated,
    onFinish,
    propVisible,
    showSheet,
  ]);

  useEffect(() => {
    skippedThisSessionRef.current = new Set();
    if (manualResolveRef.current) {
      manualResolveRef.current(false);
      manualResolveRef.current = null;
    }
    isManualRef.current = false;
    setIsManualOpen(false);
    let cancelled = false;
    setDismissalReady(false);
    void dispatch(loadDismissedPermissionSheetsThunk())
      .unwrap()
      .then((dismissed) => {
        if (cancelled) return;
        dismissedRef.current = new Set(dismissed);
        setDismissalReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [dispatch, isUserAuthenticated, authUser?.uid]);

  useEffect(() => {
    if (propVisible !== false && !isAuthPage && isUserAuthenticated && dismissalReady) {
      void checkNextPermission();
    }
  }, [propVisible, isAuthPage, isUserAuthenticated, dismissalReady, checkNextPermission]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        nextAppState === "active" &&
        propVisible !== false &&
        !isAuthPage &&
        isUserAuthenticated &&
        dismissalReady &&
        !isRequestingRef.current &&
        !isManualRef.current
      ) {
        void checkNextPermission();
      }
    });
    return () => subscription.remove();
  }, [propVisible, isAuthPage, isUserAuthenticated, dismissalReady, checkNextPermission]);

  useEffect(() => {
    registerPermissionSheetOpener((type, resolve) => {
      if (!isMountedRef.current || isRequestingRef.current || isAuthPage || !isUserAuthenticated) {
        resolve(false);
        return;
      }
      if (isManualRef.current && manualResolveRef.current) {
        manualResolveRef.current(false);
      }
      isManualRef.current = true;
      if (isMountedRef.current) setIsManualOpen(true);
      manualResolveRef.current = resolve;
      showSheet(type);
    });
    return () => registerPermissionSheetOpener(null);
  }, [isAuthPage, isUserAuthenticated, showSheet]);

  const startTrackingInBackground = () => {
    const uid = authUser?.uid;
    if (!uid) return;
    void dispatch(initializeTrackingForUserThunk(uid));
  };

  const continueGrant = async (permission: PermissionType, wasManual: boolean) => {
    let granted = false;
    try {
      if (permission === "activity") {
        granted = await dispatch(requestActivityPermissionThunk()).unwrap();
        if (granted) startTrackingInBackground();
      } else if (permission === "healthConnect") {
        granted = await dispatch(
          requestHealthStoreAuthorizationThunk(Platform.OS === "ios" && wasManual),
        ).unwrap();
        if (granted) startTrackingInBackground();
      } else if (permission === "notification") {
        granted = await dispatch(requestPushPermissionThunk()).unwrap();
        const uid = authUser?.uid;
        if (granted && uid) {
          void dispatch(initializeNotificationsForUserThunk(uid));
        }
      }

      if (permission !== "notification") {
        captureEvent("permission_result", {
          type: toAnalyticsPermissionType(permission),
          result: granted ? "granted" : "denied",
        });
      }

      await sleep(AFTER_OS_DIALOG_MS);

      if (granted) {
        skippedThisSessionRef.current.add(permission);
        if (isStartupSheet(permission)) {
          dismissedRef.current.delete(permission);
          void dispatch(clearPermissionSheetDismissedThunk(permission));
        }
        isRequestingRef.current = false;
        setIsRequesting(false);
        if (wasManual) {
          hideSheet();
          if (isMountedRef.current) setCurrentPermission(null);
          settleManual(true);
          return;
        }
        await checkNextPermission();
        notifyPermissionSettled();
        return;
      }

      // OS denied: persist and advance (do not re-show soft-ask — avoids a trap once
      // "Not now" is removed). Home cards re-engage later.
      await persistDismissed(permission);
      isRequestingRef.current = false;
      setIsRequesting(false);
      if (wasManual) {
        hideSheet();
        if (isMountedRef.current) setCurrentPermission(null);
        settleManual(false);
        return;
      }
      hideSheet();
      if (isMountedRef.current) setCurrentPermission(null);
      notifyPermissionSettled();
      void checkNextPermission();
    } catch (error) {
      logError(`[PermissionFlow] Error requesting ${permission}`, error);
      await persistDismissed(permission);
      isRequestingRef.current = false;
      setIsRequesting(false);
      if (wasManual) {
        hideSheet();
        if (isMountedRef.current) setCurrentPermission(null);
        settleManual(false);
        return;
      }
      hideSheet();
      if (isMountedRef.current) setCurrentPermission(null);
      notifyPermissionSettled();
      void checkNextPermission();
    } finally {
      isRequestingRef.current = false;
      setIsRequesting(false);
    }
  };

  const handleGrant = () => {
    if (!currentPermission || isRequestingRef.current) return;

    const permission = currentPermission;
    const wasManual = isManualRef.current;
    isRequestingRef.current = true;
    setIsRequesting(true);

    if (Platform.OS === "ios") {
      pendingOsGrantRef.current = { permission, wasManual };
      hideSheet();
      return;
    }

    hideSheet();

    void (async () => {
      await sleep(BEFORE_OS_DIALOG_MS);
      await continueGrant(permission, wasManual);
    })();
  };

  const handleModalDismiss = () => {
    const pending = pendingOsGrantRef.current;
    if (!pending) return;
    pendingOsGrantRef.current = null;
    void continueGrant(pending.permission, pending.wasManual);
  };

  const handleSkip = () => {
    if (mustProceedToSystemDialog(currentPermission)) {
      void handleGrant();
      return;
    }
    void (async () => {
      const permission = currentPermission;
      hideSheet();
      if (permission) {
        captureEvent("permission_result", {
          type: toAnalyticsPermissionType(permission),
          result: "denied",
        });
        await persistDismissed(permission);
      }
      if (isManualRef.current) {
        if (isMountedRef.current) setCurrentPermission(null);
        settleManual(false);
        return;
      }
      notifyPermissionSettled();
      void checkNextPermission();
    })();
  };

  const handleClose = () => {
    if (mustProceedToSystemDialog(currentPermission)) {
      void handleGrant();
      return;
    }
    void (async () => {
      const permission = currentPermission;
      hideSheet();
      if (permission) {
        captureEvent("permission_result", {
          type: toAnalyticsPermissionType(permission),
          result: "denied",
        });
      }

      if (isManualRef.current) {
        if (permission) await persistDismissed(permission);
        if (isMountedRef.current) setCurrentPermission(null);
        settleManual(false);
        return;
      }

      const remaining = REQUIRED_STARTUP_CHAIN.filter((type) => !isAutoSuppressed(type));
      for (const type of remaining) {
        skippedThisSessionRef.current.add(type);
        dismissedRef.current.add(type);
      }
      await dispatch(markPermissionSheetsDismissedThunk(remaining)).unwrap();
      if (isMountedRef.current) setCurrentPermission(null);
      notifyPermissionSettled();
    })();
  };

  if (isAuthPage || !isUserAuthenticated || !currentPermission) {
    return null;
  }

  return (
    <PermissionModal
      visible={modalVisible}
      type={currentPermission}
      stepIndex={
        isManualOpen
          ? 0
          : Math.max(0, REQUIRED_STARTUP_CHAIN.indexOf(currentPermission as StartupPermissionSheet))
      }
      totalSteps={isManualOpen ? 1 : REQUIRED_STARTUP_CHAIN.length}
      requesting={isRequesting}
      onGrant={() => void handleGrant()}
      onSkip={handleSkip}
      onClose={handleClose}
      onDismiss={handleModalDismiss}
    />
  );
};

export default AppPermissionFlowModal;

import { Platform, AppState } from "react-native";
import { memo, useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { images } from "@/utils/images";
import { useAppDispatch } from "@/store/hooks";
import {
  StepService,
  checkHealthConnectSyncNeededThunk,
  hasActivityPermission,
  isHealthStoreLinked,
  requestHealthStoreAuthorization,
} from "@/features/steps";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import {
  clearPermissionSheetDismissed,
  isPermissionSheetDismissed,
  openPermissionSheet,
  subscribePermissionSettled,
} from "@/features/permissions";
import HomePermissionPromptCard from "./HomePermissionPromptCard";

const HealthConnectSyncCard = () => {
  const dispatch = useAppDispatch();
  const [visible, setVisible] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshVisibility = useCallback(async () => {
    try {
      const activityGranted = await hasActivityPermission();
      if (!activityGranted) {
        setVisible(false);
        return;
      }
      // iOS: hide when Apple Health is unavailable or already linked.
      // Android: Health Connect not installed / not authorized still needs the card.
      const needsConnect = await dispatch(checkHealthConnectSyncNeededThunk()).unwrap();
      if (!needsConnect) {
        setVisible(false);
        if (await isHealthStoreLinked()) {
          void clearPermissionSheetDismissed("healthConnect");
        }
        return;
      }
      setVisible(await isPermissionSheetDismissed("healthConnect"));
    } catch {
      setVisible(false);
    }
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      void refreshVisibility();
    }, [refreshVisibility]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshVisibility();
    });
    return () => sub.remove();
  }, [refreshVisibility]);

  useEffect(
    () =>
      subscribePermissionSettled(() => {
        void refreshVisibility();
      }),
    [refreshVisibility],
  );

  if (!visible) return null;

  const onSyncSteps = async () => {
    setSyncing(true);
    try {
      captureEvent("health_sync_connect_tapped", {
        provider: Platform.OS === "ios" ? "apple_health" : "health_connect",
      });
      let granted = await openPermissionSheet("healthConnect");
      if (!granted && Platform.OS === "ios") {
        granted = await requestHealthStoreAuthorization(false);
      }
      if (granted) {
        await clearPermissionSheetDismissed("healthConnect");
        setVisible(false);
        void StepService.forceRefreshSteps();
        return;
      }
    } catch {
      showToastMessage(
        Platform.OS === "ios"
          ? "Could not connect Apple Health"
          : "Could not sync with Health Connect",
      );
    } finally {
      setSyncing(false);
      void refreshVisibility();
    }
  };

  const isIos = Platform.OS === "ios";

  return (
    <HomePermissionPromptCard
      icon={images.PERMISSIONS.STABLE}
      title={isIos ? "Sync Apple Health" : "Sync Fitness Data"}
      subtitle={
        isIos
          ? "STRON uses Apple Health to import your steps for accurate battles and events"
          : "STRON uses Health Connect to import your steps for accurate battles and events"
      }
      buttonLabel={isIos ? "Enable" : "Sync Steps"}
      requesting={syncing}
      onPress={() => void onSyncSteps()}
    />
  );
};

export default memo(HealthConnectSyncCard);

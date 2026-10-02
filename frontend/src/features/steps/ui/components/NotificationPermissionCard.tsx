import { memo, useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { images } from "@/utils/images";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import { hasPushNotificationPermission } from "@/features/notifications";
import {
  clearPermissionSheetDismissed,
  isPermissionSheetDismissed,
  openPermissionSheet,
  subscribePermissionSettled,
} from "@/features/permissions";
import HomePermissionPromptCard from "./HomePermissionPromptCard";

const NotificationPermissionCard = () => {
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const refreshVisibility = useCallback(async () => {
    try {
      const granted = await hasPushNotificationPermission();
      if (granted) {
        setVisible(false);
        void clearPermissionSheetDismissed("notification");
        return;
      }
      setVisible(await isPermissionSheetDismissed("notification"));
    } catch {
      setVisible(false);
    }
  }, []);

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

  const onEnableNotifications = async () => {
    captureEvent("notification_enable_tapped");
    setRequesting(true);
    try {
      const granted = await openPermissionSheet("notification");
      if (granted) {
        setVisible(false);
        return;
      }
    } catch {
      showToastMessage("Could not enable notifications");
    } finally {
      setRequesting(false);
      void refreshVisibility();
    }
  };

  return (
    <HomePermissionPromptCard
      icon={images.PERMISSIONS.ACTIVE}
      title="Enable Notifications"
      subtitle="Get race, event, and step updates from STRON"
      buttonLabel="Enable"
      requesting={requesting}
      onPress={() => void onEnableNotifications()}
    />
  );
};

export default memo(NotificationPermissionCard);

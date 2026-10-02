import { memo, useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { images } from "@/utils/images";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { advanceStepTrackingPermission } from "@/features/steps";
import { hasActivityPermission } from "@/features/steps";
import { showToastMessage } from "@/utils/app-utils";
import { captureEvent } from "@/analytics/posthog/events";
import {
  isPermissionSheetDismissed,
  openPermissionSheet,
  subscribePermissionSettled,
} from "@/features/permissions";
import HomePermissionPromptCard from "./HomePermissionPromptCard";

const ActivityTrackingPermissionCard = () => {
  const dispatch = useAppDispatch();
  const uid = useAppSelector(selectAuthUser)?.uid;
  const [visible, setVisible] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const refreshVisibility = useCallback(async () => {
    try {
      const granted = await hasActivityPermission();
      if (granted) {
        setVisible(false);
        return;
      }
      setVisible(await isPermissionSheetDismissed("activity"));
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

  const onEnableTracking = async () => {
    captureEvent("activity_tracking_enable_tapped");
    if (!uid) return;
    setRequesting(true);
    try {
      const granted = await openPermissionSheet("activity");
      if (granted) {
        setVisible(false);
        return;
      }
      await dispatch(advanceStepTrackingPermission());
    } catch {
      showToastMessage("Could not enable step tracking");
    } finally {
      setRequesting(false);
      void refreshVisibility();
    }
  };

  return (
    <HomePermissionPromptCard
      tone="alert"
      icon={images.PERMISSIONS.WEAK}
      title="Enable activity tracking"
      subtitle="STRON needs motion access to count your steps in battles and events"
      buttonLabel="Enable"
      requesting={requesting}
      onPress={() => void onEnableTracking()}
    />
  );
};

export default memo(ActivityTrackingPermissionCard);

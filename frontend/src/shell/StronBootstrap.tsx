import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectAuthUser, selectIsAuthenticated, signOutUser } from "@/features/auth";
import {
  initializeStepTracking,
  teardownStepTracking,
  resetStepsState,
  selectTodaySteps,
  StepService,
  clearIosStepNotification,
  invalidateStepNotificationHistoryCache,
  syncStepNotificationFromStore,
} from "@/features/steps";
import { registerBackgroundStepSync } from "@/registerBackgroundTask";
import { setSelectedCity as setExploreSelectedCity } from "@/features/explore";
import { setSelectedCity as setEventsSelectedCity } from "@/features/events";
import { saveLastCity } from "@/utils/exploreStorage";
import { DeepLinkService } from "@/features/core";
import { initializePushNotifications } from "@/features/notifications";
import { initializePostLoginPermissions } from "@/features/permissions";
import { RevenueCatService } from "@/features/payments";
import { syncActiveRaceForUser } from "@/features/stepRace";
import { registerSessionExpiryHandler } from "@/services/core/sessionExpiry";

export const StronBootstrap = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectAuthUser);
  const uid = user?.uid;
  const todaySteps = useAppSelector(selectTodaySteps);
  const trackingUidRef = useRef<string | null>(null);
  const uidRef = useRef<string | null | undefined>(uid);
  uidRef.current = uid;

  useEffect(() => {
    registerSessionExpiryHandler(() => {
      void dispatch(signOutUser());
    });
  }, [dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !uid) {
      if (trackingUidRef.current !== null) {
        trackingUidRef.current = null;
        void dispatch(teardownStepTracking());
      } else {
        dispatch(resetStepsState());
      }
      void clearIosStepNotification();
      invalidateStepNotificationHistoryCache();
      return;
    }

    const bootstrap = async () => {
      await initializePostLoginPermissions();
      await initializePushNotifications(uid);
      void registerBackgroundStepSync();
      // Soft reconnect only — never prompt Health / Notifications / Motion here.
      // AppPermissionFlowModal owns system dialogs after the user taps Continue.
      if (trackingUidRef.current !== uid) {
        trackingUidRef.current = uid;
        const activityGranted = await StepService.hasActivityPermission();
        if (activityGranted) {
          void dispatch(initializeStepTracking(uid));
        }
      }
      void DeepLinkService.processPendingInvite(uid);
    };

    void bootstrap();
  }, [dispatch, isAuthenticated, uid]);

  useEffect(() => {
    if (!user || user.isGuest) {
      void RevenueCatService.ensureConfigured().catch(() => {
        // RevenueCat requires a native build; ignore in Expo Go.
      });
      return;
    }
    void RevenueCatService.identifyLoggedInUser(user).catch(() => {
      // RevenueCat requires a native build; ignore in Expo Go.
    });
  }, [user, user?.id, user?.uid, user?.isGuest, user?.email, user?.username, user?.contactNo]);

  // Sync user's profile location across explore and events slices
  const userCity = user?.city;
  const userLocation = user?.location;
  const userState = user?.state;

  useEffect(() => {
    if (!isAuthenticated) return;
    const rawLoc = userCity || userLocation;
    if (rawLoc && rawLoc.trim()) {
      const cityName = rawLoc.split(",")[0].trim();
      const fullLabel = userLocation || userCity || cityName;
      if (cityName) {
        dispatch(setEventsSelectedCity(cityName));
        const cityObj = {
          id: cityName.toLowerCase().replace(/\s+/g, "_"),
          name: cityName,
          label: fullLabel,
          state: userState ?? null,
          country: "IN",
        };
        dispatch(setExploreSelectedCity(cityObj));
        void saveLastCity(cityObj);
      }
    }
  }, [isAuthenticated, userCity, userLocation, userState, dispatch]);

  useEffect(() => {
    if (!isAuthenticated || !uid) return;
    syncStepNotificationFromStore();
    void syncActiveRaceForUser(uid, todaySteps, user?.profileImageUrl);
  }, [isAuthenticated, uid, todaySteps, user?.profileImageUrl]);

  // Register once so cold-start getInitialURL is not re-processed on uid changes.
  useEffect(() => {
    return DeepLinkService.initListener(() => uidRef.current);
  }, []);

  return null;
};

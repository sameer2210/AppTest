import { useState, useEffect, useCallback, useRef } from "react";
import { Linking, Platform } from "react-native";
import {
  selectGymProfile,
  selectProSubscription,
  setProSubscription,
} from "../../model/gymBusiness.slice";
import {
  fetchProSubscriptionThunk,
  fetchProFeaturesThunk,
  checkProTrialEligibilityThunk,
  syncRevenueCatThunk,
  cancelProSubscriptionThunk,
  pauseProSubscriptionThunk,
  resumeProSubscriptionThunk,
} from "@/features/gymBusiness";
import {
  fetchProOfferingsCatalogThunk,
  checkEntitlementAccessThunk,
  restoreProPurchasesThunk,
  presentStronProPaywallThunk,
  getCustomerInfoThunk,
  PurchaseCancelledError,
  PurchaseLoginRequiredError,
  RevenueCatService,
  defaultStronProPrices,
  type StronProOfferingsPrices,
} from "@/features/payments";
import type {
  ProSubscriptionInfo,
  ProFeatureEntitlements,
} from "@/types/gym/proSubscription.types";
import { showToastMessage } from "@/utils/app-utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logError } from "@/config/devLogger";
import { AppInstallTracker } from "../../api/gymBusiness.api";
import { AuthApi, selectAuthUser, setAuthenticatedUser, useAuthModal } from "@/features/auth";
import { getAppStore } from "@/store/getAppStore";
import { isMongoObjectIdString, isStronProPurchaser } from "@/models/user";

export const useProSubscription = () => {
  const dispatch = useAppDispatch();
  const { showAuthModal } = useAuthModal();
  const authUser = useAppSelector(selectAuthUser);
  const gymProfile = useAppSelector(selectGymProfile);
  const reduxSub = useAppSelector(selectProSubscription);
  const businessId = gymProfile?.id || (gymProfile as { _id?: string } | null)?._id;

  const [subscription, setSubscription] = useState<ProSubscriptionInfo | null>(reduxSub || null);
  const [features, setFeatures] = useState<ProFeatureEntitlements | null>(null);
  const [isTrialEligible, setIsTrialEligible] = useState<boolean>(false);
  const [daysUntilTrial, setDaysUntilTrial] = useState<number>(0);
  const [offeringsPrices, setOfferingsPrices] = useState<StronProOfferingsPrices>(
    defaultStronProPrices(false),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const inFlightRef = useRef(false);
  const lastFetchedAtRef = useRef(0);
  const CACHE_TTL_MS = 30_000;

  useEffect(() => {
    if (reduxSub) {
      setSubscription(reduxSub);
    }
  }, [reduxSub]);

  const applyBackendSubscription = useCallback(
    (subData: ProSubscriptionInfo) => {
      setSubscription(subData);
      dispatch(setProSubscription(subData));
    },
    [dispatch],
  );

  const authUserRef = useRef(authUser);
  authUserRef.current = authUser;
  const authUserUid = authUser?.uid;
  const authUserId = authUser?.id;
  const isGuest = authUser?.isGuest;

  const resolvePurchaser = useCallback(async () => {
    const storeUser = getAppStore().getState().auth.user;
    let user = storeUser ?? authUserRef.current;
    if (user && !user.isGuest && user.uid && !isMongoObjectIdString(user.id)) {
      try {
        const refreshed = await AuthApi.ensureUserHasMongoId(user);
        if (refreshed && isMongoObjectIdString(refreshed.id)) {
          dispatch(setAuthenticatedUser(refreshed));
          user = refreshed;
        }
      } catch (error) {
        logError("[useProSubscription] Mongo id refresh failed", error);
      }
    }
    return user;
  }, [authUserUid, authUserId, isGuest, dispatch]);

  const fetchProData = useCallback(async (forceRefresh = false) => {
    if (inFlightRef.current) return;
    const now = Date.now();
    if (!forceRefresh && now - lastFetchedAtRef.current < CACHE_TTL_MS) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const purchaser = await resolvePurchaser();
      if (isStronProPurchaser(purchaser)) {
        await RevenueCatService.identifyLoggedInUser(purchaser);
      }

      const [subAction, featAction, rcHasProAction, rcCustomerAction, trialAction, rcCatalogAction] =
        await Promise.allSettled([
          dispatch(fetchProSubscriptionThunk()).unwrap(),
          dispatch(fetchProFeaturesThunk()).unwrap(),
          dispatch(checkEntitlementAccessThunk()).unwrap(),
          dispatch(getCustomerInfoThunk()).unwrap(),
          dispatch(checkProTrialEligibilityThunk()).unwrap(),
          dispatch(fetchProOfferingsCatalogThunk()).unwrap(),
        ]);

      let backendSub: ProSubscriptionInfo | null = null;
      if (
        subAction.status === "fulfilled" &&
        subAction.value.success &&
        subAction.value.data
      ) {
        backendSub = subAction.value.data;
      }

      const rcCustomerInfo =
        rcCustomerAction.status === "fulfilled" ? rcCustomerAction.value : null;
      const purchasedIds = (
        rcCustomerInfo as { allPurchasedProductIdentifiers?: string[] } | null
      )?.allPurchasedProductIdentifiers;
      const hasPriorRcPro = Boolean(purchasedIds && purchasedIds.length > 0);

      const hasRcPro =
        rcHasProAction.status === "fulfilled" && rcHasProAction.value === true;
      if (hasRcPro && !backendSub?.isPro) {
        const syncRes = await dispatch(syncRevenueCatThunk()).unwrap().catch(() => null);
        if (syncRes?.success && syncRes.data) {
          backendSub = syncRes.data;
        }
      }

      if (backendSub) {
        applyBackendSubscription(backendSub);
      } else {
        setSubscription({
          planCode: "FREE",
          status: "INACTIVE",
          isPro: false,
        });
      }

      const installPermitted = await AppInstallTracker.isTrialOfferPermittedByInstall();
      const installDaysUntil = await AppInstallTracker.getDaysUntilTrialByInstall();

      const backendAllowsTrial =
        trialAction.status === "fulfilled" &&
        trialAction.value.success &&
        trialAction.value.data?.isEligible === true;
      const backendHasUsedTrialOrPro =
        trialAction.status === "fulfilled" &&
        trialAction.value.success &&
        trialAction.value.data?.hasUsedTrialOrPro === true;
      const backendUntil =
        trialAction.status === "fulfilled" && trialAction.value.success
          ? Number(trialAction.value.data?.daysUntilTrial) || 0
          : 0;
      const effectiveUntil = Math.max(installDaysUntil, backendUntil);
      setDaysUntilTrial(effectiveUntil);
      const showTrial = Boolean(
        !backendSub?.isPro &&
          installPermitted &&
          !backendHasUsedTrialOrPro &&
          !hasPriorRcPro &&
          backendAllowsTrial,
      );
      setIsTrialEligible(showTrial);

      const rcCatalog =
        rcCatalogAction.status === "fulfilled" ? rcCatalogAction.value : null;
      const rcSlot = showTrial ? rcCatalog?.trial : rcCatalog?.noTrial;
      if (rcSlot?.offeringMissing) {
        logError(
          "[useProSubscription] STRON PRO offering missing in RevenueCat catalog",
          showTrial ? "trial" : "no-trial",
        );
        setOfferingsPrices(defaultStronProPrices(false));
      } else if (rcSlot?.pricing) {
        setOfferingsPrices(rcSlot.pricing);
      } else if (rcSlot?.monthly?.product) {
        const fallback = defaultStronProPrices(showTrial);
        fallback.monthly = rcSlot.monthly.product.priceString;
        fallback.amount = showTrial
          ? fallback.amount
          : rcSlot.monthly.product.priceString || fallback.amount;
        setOfferingsPrices(fallback);
      } else {
        setOfferingsPrices(defaultStronProPrices(rcCatalog ? false : showTrial));
      }

      if (
        featAction.status === "fulfilled" &&
        featAction.value.success &&
        featAction.value.data
      ) {
        const isPro = Boolean(backendSub?.isPro);
        setFeatures({
          ...featAction.value.data,
          platformFeePercentage: 5,
          advancedAnalytics: isPro || featAction.value.data.advancedAnalytics,
          customBranding: isPro || featAction.value.data.customBranding,
          automatedWhatsApp: isPro || featAction.value.data.automatedWhatsApp,
          prioritySupport: isPro || featAction.value.data.prioritySupport,
        });
      } else {
        const isPro = Boolean(backendSub?.isPro);
        setFeatures({
          platformFeePercentage: 5,
          advancedAnalytics: isPro,
          customBranding: isPro,
          automatedWhatsApp: isPro,
          prioritySupport: isPro,
        });
      }
    } catch (err) {
      logError("[useProSubscription] fetch error:", err);
    } finally {
      inFlightRef.current = false;
      lastFetchedAtRef.current = Date.now();
      setIsLoading(false);
    }
  }, [applyBackendSubscription, dispatch, resolvePurchaser]);

  useEffect(() => {
    fetchProData();
  }, [fetchProData]);

  // CTA → trial eligibility → RC Paywall → POST /pro/sync-revenuecat
  const openPaywall = useCallback(async (): Promise<boolean> => {
    const purchaser = await resolvePurchaser();
    if (!isStronProPurchaser(purchaser)) {
      if (purchaser?.uid && !purchaser.isGuest) {
        showToastMessage("Could not load your account. Please try again.");
        return false;
      }
      showAuthModal("methods", () => {
        void openPaywall();
      }, { allowGuest: false });
      showToastMessage("Sign in with Google, Apple, or phone to subscribe to STRON PRO.");
      return false;
    }

    setIsSubmitting(true);
    try {
      const installPermitted = await AppInstallTracker.isTrialOfferPermittedByInstall();
      const installDaysUntil = await AppInstallTracker.getDaysUntilTrialByInstall();
      const [trialRes, customerInfo] = await Promise.all([
        dispatch(checkProTrialEligibilityThunk()).unwrap().catch(() => null),
        dispatch(getCustomerInfoThunk()).unwrap().catch(() => null),
      ]);
      const purchasedIds = (
        customerInfo as { allPurchasedProductIdentifiers?: string[] } | null
      )?.allPurchasedProductIdentifiers;
      const hasPriorRcPro = Boolean(purchasedIds && purchasedIds.length > 0);
      const backendHasUsedTrialOrPro = Boolean(
        trialRes?.success && trialRes.data?.hasUsedTrialOrPro,
      );
      const backendUntil =
        trialRes?.success && trialRes.data ? Number(trialRes.data.daysUntilTrial) || 0 : 0;
      const eligible = Boolean(
        !subscription?.isPro &&
          installPermitted &&
          !backendHasUsedTrialOrPro &&
          !hasPriorRcPro &&
          trialRes?.success &&
          trialRes.data?.isEligible === true,
      );
      setIsTrialEligible(eligible);
      setDaysUntilTrial(eligible ? 0 : Math.max(installDaysUntil, backendUntil));

      let rcCustomerInfo = null;
      try {
        rcCustomerInfo = await dispatch(
          presentStronProPaywallThunk({ businessId, isTrialEligible: eligible }),
        ).unwrap();
      } catch (rcErr: unknown) {
        const message =
          typeof rcErr === "string"
            ? rcErr
            : rcErr instanceof Error
              ? rcErr.message
              : "In-app purchase failed. Please try again.";
        if (
          rcErr instanceof PurchaseCancelledError ||
          message.toLowerCase().includes("cancel")
        ) {
          return false;
        }
        if (
          rcErr instanceof PurchaseLoginRequiredError ||
          message.toLowerCase().includes("sign in")
        ) {
          showAuthModal("methods", undefined, { allowGuest: false });
          showToastMessage(
            rcErr instanceof PurchaseLoginRequiredError
              ? rcErr.message
              : "Sign in with Google, Apple, or phone to subscribe to STRON PRO.",
          );
          return false;
        }
        showToastMessage(message);
        return false;
      }

      if (!rcCustomerInfo) {
        showToastMessage("In-app purchase was not completed. Please try again.");
        return false;
      }

      const syncRes = await dispatch(syncRevenueCatThunk()).unwrap().catch(() => null);
      if (syncRes?.success && syncRes.data?.isPro) {
        applyBackendSubscription(syncRes.data);
        const trialStarted = syncRes.data.status === "TRIAL";
        showToastMessage(
          trialStarted
            ? "14-day STRON PRO trial started. Auto-renew is on in Play Store or App Store."
            : businessId
              ? "STRON PRO activated successfully! Enjoy all premium PRO features."
              : "STRON PRO activated successfully! Enjoy unlimited event listings & pro benefits.",
        );
        await fetchProData(true);
        return true;
      }

      const entitled = await dispatch(checkEntitlementAccessThunk()).unwrap().catch(() => false);
      if (entitled) {
        showToastMessage("STRON PRO activated successfully! Enjoy your Pro benefits.");
        await fetchProData(true);
        return true;
      }

      const rawError = syncRes?.message;
      const isBusinessProfileError = rawError && /business profile/i.test(rawError);
      const displayError = isBusinessProfileError
        ? "Failed to verify purchase with server. Please try again."
        : rawError || "Failed to verify purchase with server. Please contact support.";
      showToastMessage(displayError);
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      showToastMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [applyBackendSubscription, businessId, dispatch, fetchProData, resolvePurchaser, showAuthModal, subscription?.isPro]);

  const handleStartFreeTrial = useCallback(() => openPaywall(), [openPaywall]);
  const handleSubscribe = useCallback(() => openPaywall(), [openPaywall]);

  const handleRestorePurchases = async (): Promise<boolean> => {
    setIsRestoring(true);
    try {
      const purchaser = await resolvePurchaser();
      if (!isStronProPurchaser(purchaser)) {
        if (purchaser?.uid && !purchaser.isGuest) {
          showToastMessage("Could not load your account. Please try again.");
          return false;
        }
        showAuthModal("methods", undefined, { allowGuest: false });
        showToastMessage("Sign in to restore STRON PRO purchases.");
        return false;
      }
      await dispatch(restoreProPurchasesThunk()).unwrap();
      const syncRes = await dispatch(syncRevenueCatThunk()).unwrap().catch(() => null);
      if (syncRes?.success && syncRes.data?.isPro) {
        applyBackendSubscription(syncRes.data);
        showToastMessage("Purchases restored! STRON PRO is active.");
        await fetchProData();
        return true;
      }
      showToastMessage("No active STRON PRO subscription found to restore.");
      return false;
    } catch (err: unknown) {
      const message =
        typeof err === "string"
          ? err
          : err instanceof Error
            ? err.message
            : "Failed to restore purchases.";
      if (err instanceof PurchaseCancelledError || message.toLowerCase().includes("cancel")) {
        return false;
      }
      if (err instanceof PurchaseLoginRequiredError || message.toLowerCase().includes("sign in")) {
        showAuthModal("methods", undefined, { allowGuest: false });
        showToastMessage(
          err instanceof PurchaseLoginRequiredError
            ? err.message
            : "Sign in to restore STRON PRO purchases.",
        );
        return false;
      }
      showToastMessage(message);
      return false;
    } finally {
      setIsRestoring(false);
    }
  };

  const handleCancel = async (): Promise<boolean> => {
    setIsSubmitting(true);
    try {
      const isTrial = subscription?.status === "TRIAL";
      const customerInfo = await dispatch(getCustomerInfoThunk()).unwrap().catch(() => null);
      const managementUrl = customerInfo?.managementURL;
      if (managementUrl) {
        await Linking.openURL(managementUrl);
      } else {
        const storeName = Platform.OS === "ios" ? "App Store" : "Play Store";
        showToastMessage(
          `Cancel auto-renew in ${storeName}. STRON PRO stays active until the current period ends.`,
        );
      }

      const res = await dispatch(cancelProSubscriptionThunk()).unwrap().catch(() => null);
      if (res?.success) {
        if (isTrial) {
          showToastMessage("Trial cancellation requested. Confirm in the store if prompted.");
        }
        await fetchProData();
        return true;
      }
      showToastMessage(res?.message || "Failed to cancel subscription");
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      showToastMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePause = async (pauseDays = 14) => {
    setIsSubmitting(true);
    try {
      const res = await dispatch(pauseProSubscriptionThunk(pauseDays)).unwrap().catch(() => null);
      if (res?.success) {
        showToastMessage(
          `STRON PRO stays on for ${pauseDays} days. Store billing is unchanged until you cancel in Play Store or App Store.`,
        );
        await fetchProData();
        return true;
      }
      showToastMessage(res?.message || "Failed to pause subscription");
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to pause subscription";
      showToastMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async () => {
    setIsSubmitting(true);
    try {
      const res = await dispatch(resumeProSubscriptionThunk()).unwrap().catch(() => null);
      if (res?.success) {
        showToastMessage("STRON PRO subscription resumed!");
        await fetchProData();
        return true;
      }
      showToastMessage(res?.message || "Failed to resume subscription");
      return false;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to resume subscription";
      showToastMessage(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUserPro = Boolean(subscription?.isPro);

  return {
    subscription,
    features,
    isPro: isUserPro,
    isPaused: subscription?.status === "PAUSED" || subscription?.isPaused === true,
    isTrialEligible,
    daysUntilTrial,
    offeringsPrices,
    isLoading,
    isSubmitting,
    isRestoring,
    openPaywall,
    startFreeTrial: handleStartFreeTrial,
    subscribe: handleSubscribe,
    restorePurchases: handleRestorePurchases,
    cancel: handleCancel,
    pause: handlePause,
    resume: handleResume,
    refresh: () => fetchProData(true),
  };
};

export default useProSubscription;

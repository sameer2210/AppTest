import { createAsyncThunk } from "@reduxjs/toolkit";
import { router } from "expo-router";
import { AuthApi } from "../api/auth.api";
import { href } from "@/navigation/href";
import { resolveBootstrapRoute, resolvePostAuthRoute } from "@/navigation/authNavigation";
import { waitForSplashEnd } from "@/constants/splash";
import { PermissionsApi } from "@/features/permissions";
import { setLoaderStatus } from "@/features/system";
import { logError } from "@/config/devLogger";
import { captureEvent } from "@/analytics/posthog/events";
import { identifyUser } from "@/analytics/posthog/client";
import { createMinimalUser, isMongoObjectIdString, type StronUser } from "@/models/user";
import { RevenueCatService } from "@/features/payments";
import {
  ensureValidAccessToken,
  wasLastAuthRecoveryNetworkFailure,
} from "@/services/core/apiClient.service";
import { isSessionExpiryInFlight } from "@/services/core/sessionExpiry";
import {
  clearAuth,
  setAuthLoading,
  setAuthenticatedUser,
  setBootstrapComplete,
  setBootstrapError,
  updateUser,
} from "./auth.slice";
import type { RootState } from "@/store/store";
const {
  postLogin: { resetPostLoginPermissionsState },
} = PermissionsApi;

const BOOTSTRAP_STEP_TIMEOUT_MS = 10000;

const isUnauthorizedError = (error: unknown): boolean => {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 401) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /authentication required|sign in again|session expired|invalid or expired/i.test(message);
};

const withBootstrapTimeout = async <T>(label: string, promise: Promise<T>): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(new Error(`${label} timed out. Please check your connection and try again.`)),
          BOOTSTRAP_STEP_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const bootstrapAuth = createAsyncThunk<void, void, { state: RootState }>(
  "auth/bootstrap",
  async (_, { dispatch }) => {
    dispatch(setAuthLoading(true));
    const splashWait = waitForSplashEnd();

    try {
      const loggedIn = await AuthApi.isLoggedIn();
      if (!loggedIn) {
        dispatch(setBootstrapComplete());
        await splashWait;
        router.replace(href.auth.login);
        return;
      }

      const firebaseUser = AuthApi.currentUser;
      if (!firebaseUser) {
        dispatch(setBootstrapComplete());
        await splashWait;
        router.replace(href.auth.login);
        return;
      }

      // Restore JWTs before hydrating cache — avoid zombie Home when tokens are gone.
      const sessionOk = await withBootstrapTimeout("Session restore", ensureValidAccessToken()).catch(
        () => false,
      );
      if (!sessionOk && !wasLastAuthRecoveryNetworkFailure()) {
        // ensureValidAccessToken already kicked notifySessionExpired when recovery
        // failed for auth reasons; only hard-clear if that path hasn't started.
        if (!isSessionExpiryInFlight()) {
          void AuthApi.signOut().catch(() => undefined);
        }
        dispatch(setBootstrapComplete());
        await splashWait;
        router.replace(href.auth.login);
        return;
      }

      // Fire-and-forget profile repair when profile is missing
      void AuthApi.repairProfileIfNeeded(firebaseUser.uid);

      const cached = await AuthApi.getCachedUserSession();
      let user = cached;
      if (!user) {
        user = await withBootstrapTimeout("Profile load", AuthApi.refreshUserProfile(firebaseUser.uid));
      } else if (!user.isGuest && !isMongoObjectIdString(user.id)) {
        try {
          const fresh = await withBootstrapTimeout(
            "Profile load",
            AuthApi.refreshUserProfile(firebaseUser.uid),
          );
          if (fresh) user = fresh;
        } catch (error) {
          if (isUnauthorizedError(error)) {
            throw error;
          }
          // Keep the cached session; paywall hydrates Mongo id on demand.
        }
      }

      if (!user) {
        throw new Error("Could not load your profile. Please sign in again.");
      }

      dispatch(setAuthenticatedUser(user));
      await splashWait;
      const skipOnboarding = await AuthApi.shouldSkipOnboarding(user.uid);
      router.replace(resolveBootstrapRoute(user, { skipOnboarding }));
    } catch (error) {
      void AuthApi.signOut().catch(() => undefined);
      dispatch(setBootstrapError(error instanceof Error ? error.message : "Bootstrap failed"));
      await splashWait;
      router.replace(href.auth.login);
    }
  },
);

export const completeLogin = createAsyncThunk<
  void,
  {
    mode: "google" | "apple" | "guest" | "otp";
    phone?: string;
    otp?: string;
    username?: string;
    location?: string;
    navigate?: boolean;
    onboardingRole?: "individual" | "business";
    onboardingBusinessName?: string;
    onboardingBusinessOffers?: string[];
    onboardingBusinessFeatures?: string[];
  },
  { state: RootState }
>(
  "auth/completeLogin",
  async (
    {
      mode,
      phone,
      otp,
      username,
      location,
      navigate = true,
      onboardingRole,
      onboardingBusinessName,
      onboardingBusinessOffers,
      onboardingBusinessFeatures,
    },
    { dispatch },
  ) => {
    dispatch(setAuthLoading(true));
    try {
      if (mode === "guest") {
        const guestSignIn = await AuthApi.signInAsGuest({
          username,
          location,
          onboardingRole,
          onboardingBusinessName,
          onboardingBusinessOffers,
          onboardingBusinessFeatures,
        });
        if (!guestSignIn) {
          throw new Error("Sign in cancelled");
        }

        dispatch(setAuthenticatedUser(guestSignIn.profile));
        if (navigate) {
          router.replace(resolvePostAuthRoute(guestSignIn.profile));
        }
        return;
      }

      let firebaseUser = AuthApi.currentUser;
      let isNewPhoneUser: boolean | undefined;
      if (mode === "google") {
        firebaseUser = await AuthApi.signInWithGoogle();
      } else if (mode === "apple") {
        firebaseUser = await AuthApi.signInWithApple();
      } else if (mode === "otp" && phone && otp) {
        const otpResult = await AuthApi.verifyPhoneOtp(phone, otp);
        firebaseUser = otpResult.firebaseUser;
        isNewPhoneUser = otpResult.isNewUser;
      }

      if (!firebaseUser) {
        throw new Error("Sign in cancelled");
      }

      const user = await AuthApi.navigateAfterLogin(firebaseUser);
      // Ensure phone is on the profile after OTP (backend sync can lag a beat).
      const otpPhone = mode === "otp" && phone ? phone.trim().replace(/\D/g, "").slice(-10) : null;
      const userWithPhone = user
        ? {
            ...user,
            ...(otpPhone
              ? {
                  contactNo: user.contactNo || otpPhone,
                  phoneVerified: true,
                  isGuest: false,
                }
              : {}),
          }
        : user;

      if (userWithPhone && otpPhone) {
        try {
          const persisted = await AuthApi.updateUserProfile(userWithPhone);
          // Keep local session non-guest even if API still echoes isGuest.
          await AuthApi.saveUserSession({
            ...(persisted ?? userWithPhone),
            contactNo: userWithPhone.contactNo,
            phoneVerified: true,
            isGuest: false,
          });
        } catch {
          try {
            await AuthApi.saveUserSession(userWithPhone);
          } catch {
            // Non-fatal — Redux already has the upgraded session.
          }
        }
      }

      let userForStore = userWithPhone;
      if (userForStore && !userForStore.isGuest) {
        try {
          userForStore = await AuthApi.ensureUserHasMongoId(userForStore);
        } catch {
          // Paywall hydrates Mongo id on demand if this refresh fails.
        }
      }

      dispatch(setAuthenticatedUser(userForStore));
      if (mode === "google" || mode === "apple" || mode === "otp") {
        captureEvent("login_completed", { method: mode === "otp" ? "phone" : mode });
      }
      if (navigate) {
        // New OTP user → onboarding immediately (never send back to login).
        if (mode === "otp" && isNewPhoneUser === true) {
          router.replace(href.auth.onboarding);
        } else if (mode === "otp" && isNewPhoneUser === false) {
          router.replace(href.app.tabs);
        } else {
          router.replace(
            resolvePostAuthRoute(userForStore, {
              isNewPhoneUser: mode === "otp" ? isNewPhoneUser : undefined,
            }),
          );
        }
      }
    } catch (error) {
      dispatch(setAuthLoading(false));
      throw error;
    }
  },
);

export const signOutUser = createAsyncThunk<void, void, { state: RootState }>(
  "auth/signOut",
  async (_, { dispatch }) => {
    dispatch(setLoaderStatus(true));
    // Before AuthApi.signOut() runs resetAnalyticsUser(), so the event attributes to the user.
    captureEvent("logged_out");
    try {
      const { teardownStepTracking } = await import("@/features/steps");
      await dispatch(teardownStepTracking());

      // Clear Redux auth immediately so guards don't keep the user in-app
      // while Firebase/Google cleanup may still be running.
      await AuthApi.signOut();
      resetPostLoginPermissionsState();
      void RevenueCatService.logOutUser().catch(() => undefined);
      dispatch(clearAuth());
      dispatch(setAuthLoading(false));
      router.replace(href.auth.login);
    } catch (error) {
      logError("signOutUser failed", error);
      dispatch(clearAuth());
      dispatch(setAuthLoading(false));
      router.replace(href.auth.login);
    } finally {
      dispatch(setLoaderStatus(false));
    }
  },
);

export const sendOtp = createAsyncThunk<void, string>("auth/sendOtp", async (phone) => {
  await AuthApi.sendPhoneOtp(phone);
});

export const sendPhoneVerificationOtp = createAsyncThunk<void, string>(
  "auth/sendPhoneVerificationOtp",
  async (phone) => {
    await AuthApi.sendPhoneOtp(phone);
  },
);

export const resendPhoneVerificationOtp = createAsyncThunk<void, string>(
  "auth/resendPhoneVerificationOtp",
  async (phone) => {
    await AuthApi.resendPhoneOtp(phone);
  },
);

export const verifyPhoneForCurrentUser = createAsyncThunk<
  { contactNo: string; phoneVerified: boolean },
  { phone: string; code: string },
  { state: RootState }
>("auth/verifyPhoneForCurrentUser", async ({ phone, code }, { dispatch }) => {
  const result = await AuthApi.verifyPhoneForCurrentUser(phone, code);
  dispatch(
    updateUser({
      contactNo: result.contactNo,
      phoneVerified: result.phoneVerified !== false,
      isGuest: false,
    }),
  );
  return {
    contactNo: result.contactNo,
    phoneVerified: result.phoneVerified !== false,
  };
});

export const refreshCurrentUserProfile = createAsyncThunk<
  void,
  string | undefined,
  { state: RootState }
>("auth/refreshCurrentUserProfile", async (uidParam, { getState, dispatch }) => {
  const uid = uidParam || (getState() as RootState).auth.user?.uid || AuthApi.currentUser?.uid;
  if (!uid) return;
  const refreshed = await AuthApi.refreshUserProfile(uid);
  if (refreshed) {
    dispatch(setAuthenticatedUser(refreshed));
  }
});

export const restoreCachedSession = createAsyncThunk<void, void, { state: RootState }>(
  "auth/restoreCachedSession",
  async (_, { dispatch }) => {
    const cachedSession = await AuthApi.getCachedUserSession();
    if (cachedSession) {
      dispatch(setAuthenticatedUser(cachedSession));
      return;
    }
    const fbUser = AuthApi.currentUser;
    if (fbUser?.uid) {
      const refreshed = await AuthApi.refreshUserProfile(fbUser.uid);
      if (refreshed) {
        dispatch(setAuthenticatedUser(refreshed));
      }
    }
  },
);

export const updateUserProfileThunk = createAsyncThunk<
  StronUser,
  Partial<StronUser> & { uid: string },
  { state: RootState }
>("auth/updateUserProfile", async (payload, { getState, dispatch }) => {
  const currentUser = (getState() as RootState).auth.user;
  const merged: StronUser = {
    ...(currentUser ?? createMinimalUser(payload.uid)),
    ...payload,
  } as StronUser;
  const updated = await AuthApi.updateUserProfile(merged);
  try {
    await AuthApi.syncUserWithBackend(updated.uid, updated.email);
  } catch {
    // Non-fatal if backend sync lags
  }
  identifyUser(updated);
  dispatch(updateUser(updated));
  return updated;
});


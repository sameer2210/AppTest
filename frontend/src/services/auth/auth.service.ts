import {
  AppleAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithCustomToken,
  signOut,
  type FirebaseAuthTypes,
} from "@react-native-firebase/auth";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createMinimalUser,
  isMongoObjectIdString,
  stronUserFromJson,
  stronUserToApiJson,
  type StronUser,
} from "@/models/user";
import {
  apiClient,
  authPublicApi,
  exchangeFirebaseToken,
  publicApi,
} from "../core/apiClient.service";
import { STRON_BACKEND_URL } from "@/constants/stron";
import { TokenStorage } from "./tokenStorage.service";
import { getGuestDeviceIdentity } from "./deviceGuestId.service";
import { logError } from "@/config/devLogger";
import { getFirebaseAuth } from "../core/firebase.service";
import { setClarityUserIdentity } from "@/analytics/clarity";
import { identifyUser, resetAnalyticsUser } from "@/analytics/posthog/client";
import { getExpoNotifications } from "@/provider/expoNotificationsLazy";
import { clearPushRegistrationFlag } from "../notification/pushNotification.service";
import { clearIosStepNotification } from "../step/stepNotificationSync.service";
import { RevenueCatService } from "../payment/revenueCat.service";
import {
  RATING_PROMPT_DISMISSED_KEY,
  RATING_PROMPT_OPEN_COUNT_KEY,
} from "@/utils/ratingPromptStorage";

const GUEST_BACKEND_TIMEOUT_MS = 30000;
const USER_SESSION_KEY = "stron_user_session";

/** Web OAuth client (Firebase client_type 3) — required for Android Google Sign-In idToken. */
const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ||
  "955460127665-hp09qv2hvb63e3b2g3fkdhinf6lcaod4.apps.googleusercontent.com";

/** Debug keystore SHA-1 for `android/app/debug.keystore` — register in Firebase if sign-in fails. */
export const ANDROID_DEBUG_SHA1 = "5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25";

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

const formatGoogleSignInError = (error: unknown): Error => {
  if (!(error instanceof Error)) {
    return new Error("Google sign-in failed");
  }

  const code = String((error as { code?: string | number }).code ?? "");
  const message = error.message;

  if (code === "10" || message.includes("DEVELOPER_ERROR")) {
    return new Error(
      `Google Sign-In is not configured for this build. In Firebase Console → Project settings → Your apps → Android, add SHA-1: ${ANDROID_DEBUG_SHA1}, then download an updated google-services.json and rebuild.`,
    );
  }

  if (code === "7" || message.includes("NETWORK_ERROR")) {
    return new Error(
      "Google Sign-In could not reach Google services. Check emulator internet, or add the debug SHA-1 to Firebase and rebuild the app.",
    );
  }

  return error;
};

const generateRandomUsername = (length = 6) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const LOGOUT_REQUEST_TIMEOUT_MS = 5000;
const GUEST_SIGN_IN_TIMEOUT_MS = 8000;

const withAuthServiceTimeout = async <T>(
  label: string,
  promise: Promise<T>,
  timeoutMs = GUEST_SIGN_IN_TIMEOUT_MS,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

export const AuthService = {
  get currentUser() {
    return getFirebaseAuth().currentUser;
  },

  async isLoggedIn() {
    return !!getFirebaseAuth().currentUser;
  },

  async ensureJwtTokens(username?: string) {
    // After Google/Apple sign-in the Firebase ID token is already fresh —
    // avoid forceRefresh (slow network call to Google) on the happy path.
    let ok = await exchangeFirebaseToken(false, username);
    if (!ok) {
      ok = await exchangeFirebaseToken(true, username);
    }
    if (!ok) {
      const base = STRON_BACKEND_URL?.trim();
      throw new Error(
        base
          ? `Cannot reach API at ${base}. Check Wi‑Fi / API URL, then try again.`
          : "API URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.",
      );
    }
  },

  async saveUserSession(user: StronUser) {
    await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
  },

  async getCachedUserSession(): Promise<StronUser | null> {
    const raw = await AsyncStorage.getItem(USER_SESSION_KEY);
    if (!raw) return null;
    try {
      return stronUserFromJson(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  },

  async refreshUserProfile(uid: string): Promise<StronUser | null> {
    const response = await apiClient.get<Record<string, unknown>>(`/api/user/profile/${uid}`);
    const user = stronUserFromJson(response.data);
    if (user?.uid && this.currentUser?.uid === user.uid) {
      await this.saveUserSession(user);
    }
    return user;
  },

  /**
   * RevenueCat App User ID is Mongo `_id`. Cached sessions from older app
   * versions often omit it — refresh the profile before identify/paywall.
   */
  async ensureUserHasMongoId(user: StronUser | null | undefined): Promise<StronUser | null> {
    if (!user) return null;
    if (user.isGuest || isMongoObjectIdString(user.id)) return user;
    const uid = user.uid?.trim();
    if (!uid) return user;
    const refreshed = await this.refreshUserProfile(uid);
    if (!refreshed) return user;
    return {
      ...user,
      ...refreshed,
      id: refreshed.id ?? user.id,
    };
  },

  async cacheUserProfile(uid: string) {
    const user = await this.refreshUserProfile(uid);
    if (user) {
      await this.saveUserSession(user);
    }
  },

  async isNewUser(uid: string) {
    try {
      const user = await this.refreshUserProfile(uid);
      if (!user) return true;
      if (user.onboardingRole) return false;
      if (
        user.username &&
        !user.username.startsWith("guest_") &&
        !/^User\d+$/.test(user.username)
      ) {
        return false;
      }
      if (user.gender || user.weight || user.height || user.location) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async createMinimalUserProfile(firebaseUser: FirebaseAuthTypes.User) {
    const username =
      firebaseUser.displayName || firebaseUser.email?.split("@")[0] || `User${Date.now()}`;

    const userModel = createMinimalUser(
      firebaseUser.uid,
      firebaseUser.email,
      username,
      firebaseUser.photoURL,
    );
    await this.updateUserProfile(userModel);
  },

  async updateUserProfile(user: StronUser) {
    if (!user.uid?.trim()) {
      throw new Error("Attempted to update profile with an empty user ID.");
    }

    const response = await apiClient.put<Record<string, unknown>>(
      `/api/user/profile/${user.uid}`,
      stronUserToApiJson(user),
    );

    const body = stronUserFromJson(response.data);
    if (body?.uid) {
      await this.saveUserSession(body);
      return body;
    }

    // Non-JSON success responses fall back to refreshUserProfile.
    const refreshed = await this.refreshUserProfile(user.uid);
    if (refreshed) {
      await this.saveUserSession(refreshed);
      return refreshed;
    }

    await this.saveUserSession(user);
    return user;
  },

  async syncUserWithBackend(uid: string, email?: string | null, contactNo?: string | null) {
    try {
      await apiClient.post("/api/auth/sync-user", {
        uid,
        email,
        ...(contactNo ? { contactNo } : {}),
      });
    } catch {
      // Non-blocking profile sync
    }
  },

  /** OTP 1/3 — send via APITxT */
  async sendPhoneOtp(phone: string) {
    try {
      await publicApi.post("/api/auth/send-otp", { phone: phone.trim() });
    } catch (error: unknown) {
      throw new Error(this.extractOtpApiError(error, "Failed to send OTP"));
    }
  },

  /** OTP 2/3 — resend via APITxT */
  async resendPhoneOtp(phone: string) {
    try {
      await publicApi.post("/api/auth/resend-otp", { phone: phone.trim() });
    } catch (error: unknown) {
      throw new Error(this.extractOtpApiError(error, "Failed to resend OTP"));
    }
  },

  /**
   * OTP 3/3 — verify (login).
   * Backend returns Firebase custom token + access/refresh JWTs.
   *
   * isNewUser:
   * - false → phone already linked to an account (log in, skip onboarding)
   * - true  → new phone (assign to account, show onboarding)
   */
  async verifyPhoneOtp(
    phone: string,
    otp: string,
  ): Promise<{ firebaseUser: FirebaseAuthTypes.User; isNewUser: boolean }> {
    try {
      await TokenStorage.clearTokens();

      const response = await publicApi.post<{
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        isNewUser?: boolean;
        error?: string;
        user?: Record<string, unknown>;
      }>("/api/auth/verify-otp", {
        phone: phone.trim(),
        otp,
      });

      const {
        token: customToken,
        accessToken,
        refreshToken,
        isNewUser: isNewUserFlag,
      } = response.data ?? {};
      if (!customToken) {
        throw new Error("Authentication token was not received from the server.");
      }

      // Explicit false = existing account; anything else treat as new phone user.
      const isNewUser = isNewUserFlag !== false;

      if (accessToken && refreshToken) {
        await TokenStorage.saveTokens(accessToken, refreshToken);
      }

      const credential = await signInWithCustomToken(getFirebaseAuth(), customToken);
      const firebaseUser = credential.user;
      if (!firebaseUser) {
        throw new Error("Authentication failed after OTP verification.");
      }

      if (!accessToken || !refreshToken) {
        await this.ensureJwtTokens();
      }

      // verify-otp already created/linked the Mongo user with this phone.
      try {
        await this.syncUserWithBackend(firebaseUser.uid, firebaseUser.email);
      } catch {
        // Non-fatal — session tokens from verify-otp are already valid.
      }

      if (!isNewUser) {
        await this.markOnboardingSkipped(firebaseUser.uid);
        await this.cacheUserProfile(firebaseUser.uid);
      } else {
        await this.clearOnboardingSkipped(firebaseUser.uid);
      }

      return { firebaseUser, isNewUser };
    } catch (error: unknown) {
      throw new Error(this.extractOtpApiError(error, "Invalid OTP"));
    }
  },

  async markOnboardingSkipped(uid: string) {
    if (!uid) return;
    await AsyncStorage.setItem(`stron_skip_onboarding_${uid}`, "1");
  },

  async clearOnboardingSkipped(uid: string) {
    if (!uid) return;
    await AsyncStorage.removeItem(`stron_skip_onboarding_${uid}`);
  },

  async shouldSkipOnboarding(uid: string) {
    if (!uid) return false;
    return (await AsyncStorage.getItem(`stron_skip_onboarding_${uid}`)) === "1";
  },

  /**
   * Link phone to the already-logged-in user (organizer create gate).
   * Same /verify-otp endpoint with Bearer JWT — does not switch accounts.
   */
  async verifyPhoneForCurrentUser(
    phone: string,
    otp: string,
  ): Promise<{ contactNo: string; phoneVerified: boolean }> {
    try {
      await this.ensureJwtTokens();

      const { data } = await apiClient.post<{
        success?: boolean;
        contactNo?: string;
        phoneVerified?: boolean;
        token?: string;
        accessToken?: string;
        refreshToken?: string;
        uid?: string;
        error?: string;
        message?: string;
        user?: Record<string, unknown>;
      }>("/api/auth/verify-otp", {
        phone: phone.trim(),
        otp: otp.trim(),
      });

      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data?.success && !data?.contactNo) {
        throw new Error(data?.message || "Failed to verify phone number.");
      }

      const contactNo = data.contactNo || phone.trim().replace(/\D/g, "").slice(-10);
      const phoneVerified = data?.phoneVerified !== false;

      // Linking must stay on the current account — never silently switch sessions.
      if (data?.uid && data.uid !== this.currentUser?.uid) {
        throw new Error(
          "This phone number is already linked to another account. Sign in with that account instead.",
        );
      }

      // Persist so create-event / Business edit gates stay unlocked after restart.
      // Phone OTP upgrades guest → full account (isGuest must be cleared).
      const uid = this.currentUser?.uid;
      if (uid) {
        const applyUpgrade = async (base: StronUser) => {
          const upgraded: StronUser = {
            ...base,
            contactNo: base.contactNo || contactNo,
            phoneVerified: base.phoneVerified === true || phoneVerified,
            isGuest: false,
          };
          try {
            const persisted = await this.updateUserProfile(upgraded);
            // Keep local session non-guest even if API still echoes isGuest.
            await this.saveUserSession({
              ...(persisted ?? upgraded),
              contactNo: upgraded.contactNo,
              phoneVerified: true,
              isGuest: false,
            });
          } catch {
            await this.saveUserSession(upgraded);
          }
        };

        try {
          const refreshed = await this.refreshUserProfile(uid);
          if (refreshed) {
            await applyUpgrade(refreshed);
          }
        } catch {
          const cached = await this.getCachedUserSession();
          if (cached?.uid === uid) {
            await applyUpgrade(cached);
          }
        }
      }

      return { contactNo, phoneVerified };
    } catch (error: unknown) {
      if (error instanceof Error && !(error as { response?: unknown }).response) {
        throw error;
      }
      throw new Error(this.extractOtpApiError(error, "Invalid OTP"));
    }
  },

  extractOtpApiError(error: unknown, fallback: string) {
    const data = (
      error as {
        response?: { data?: { error?: string; message?: string; retryAfterSeconds?: number } };
      }
    )?.response?.data;
    if (data?.retryAfterSeconds) {
      return `${data.error ?? data.message ?? fallback} Try again in ${data.retryAfterSeconds}s.`;
    }
    return data?.error ?? data?.message ?? (error instanceof Error ? error.message : fallback);
  },

  async finalizeOAuthSignIn(user: FirebaseAuthTypes.User | null, username?: string) {
    if (!user) return null;

    // Drop stale JWTs so refresh does not race with a fresh Firebase exchange.
    await TokenStorage.clearTokens();

    // Obtain JWT first (exchange-token creates the Mongo user too),
    // then sync additional profile fields.
    await this.ensureJwtTokens(username);
    await this.syncUserWithBackend(user.uid, user.email);

    if (!(await this.isNewUser(user.uid))) {
      await this.cacheUserProfile(user.uid);
    }

    setClarityUserIdentity(user.uid);
    identifyUser({ uid: user.uid, email: user.email });

    return user;
  },

  async signInWithGoogle() {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any cached Google session so the account picker always appears.
      try {
        const previous = await GoogleSignin.hasPreviousSignIn();
        if (previous) {
          await GoogleSignin.signOut();
        }
      } catch {
        // ignore — still attempt interactive sign-in
      }

      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type !== "success") {
        return null;
      }

      const idToken = signInResult.data.idToken;
      if (!idToken) {
        throw new Error(
          "Google sign-in succeeded but no ID token was returned. Check webClientId / Firebase OAuth setup.",
        );
      }

      // Firebase only needs the ID token; skip getTokens() to avoid GoogleAuthUtil NETWORK_ERROR.
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(getFirebaseAuth(), credential);
      return this.finalizeOAuthSignIn(result.user);
    } catch (error) {
      throw formatGoogleSignInError(error);
    }
  },

  async signInWithApple() {
    // Generate nonce — Apple requires the SHA-256 digest; Firebase needs the raw value.
    const rawNonce = Array.from(
      { length: 32 },
      () =>
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[
          Math.floor(Math.random() * 62)
        ],
    ).join("");
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    const { identityToken, fullName } = appleCredential;
    if (!identityToken) return null;

    // Apple only provides fullName on the first sign-in — forward it to exchange-token.
    const username =
      [fullName?.givenName, fullName?.familyName].filter(Boolean).join(" ").trim() || undefined;

    const provider = AppleAuthProvider.credential(identityToken, rawNonce);

    const result = await signInWithCredential(getFirebaseAuth(), provider);
    return this.finalizeOAuthSignIn(result.user, username);
  },

  /**
   * Device-bound guest login.
   * Backend maps deviceId → uid so progress restores after uninstall on the same device.
   */
  async signInAsGuest(draft?: {
    username?: string;
    location?: string;
    onboardingRole?: "individual" | "business";
    onboardingBusinessName?: string;
    onboardingBusinessOffers?: string[];
    onboardingBusinessFeatures?: string[];
  }): Promise<{
    firebaseUser: FirebaseAuthTypes.User;
    profile: StronUser;
  } | null> {
    const existingUser = this.currentUser;
    if (existingUser) {
      await TokenStorage.clearTokens();
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      await withAuthServiceTimeout(
        "Clearing old guest session",
        signOut(getFirebaseAuth()),
        3000,
      ).catch((error) => {
        logError("Existing guest session could not be cleared", error);
      });
    }

    const { deviceId, platform } = await withAuthServiceTimeout(
      "Guest device id",
      getGuestDeviceIdentity(),
    );

    await TokenStorage.clearTokens();

    const onboardingName = draft?.username?.trim();
    const onboardingLocation = draft?.location?.trim();

    let response;
    try {
      response = await withAuthServiceTimeout(
        "Guest backend sign-in",
        authPublicApi.post<{
          token?: string;
          accessToken?: string;
          refreshToken?: string;
          uid?: string;
          email?: string | null;
          username?: string | null;
          location?: string | null;
          restored?: boolean;
          error?: string;
        }>("/api/auth/guest", {
          deviceId,
          platform,
          ...(onboardingName ? { username: onboardingName } : {}),
          ...(onboardingLocation ? { location: onboardingLocation } : {}),
          ...(draft?.onboardingRole ? { onboardingRole: draft.onboardingRole } : {}),
          ...(draft?.onboardingBusinessName
            ? { onboardingBusinessName: draft.onboardingBusinessName }
            : {}),
          ...(draft?.onboardingBusinessOffers?.length
            ? { onboardingBusinessOffers: draft.onboardingBusinessOffers }
            : {}),
          ...(draft?.onboardingBusinessFeatures?.length
            ? { onboardingBusinessFeatures: draft.onboardingBusinessFeatures }
            : {}),
        }),
        GUEST_BACKEND_TIMEOUT_MS,
      );
    } catch (error) {
      throw new Error(
        this.extractOtpApiError(
          error,
          `Cannot reach API at ${STRON_BACKEND_URL}. Check Wi‑Fi and try again.`,
        ),
      );
    }

    const data = response.data;
    const customToken = data?.token;
    const accessToken = data?.accessToken;
    const refreshToken = data?.refreshToken;

    if (!customToken || !accessToken || !refreshToken || !data?.uid) {
      throw new Error(data?.error || "Guest authentication failed.");
    }

    await TokenStorage.saveTokens(accessToken, refreshToken);

    const credential = await withAuthServiceTimeout(
      "Guest Firebase sign-in",
      signInWithCustomToken(getFirebaseAuth(), customToken),
    );
    const user = credential.user;
    if (!user) return null;

    let profile: StronUser | null = null;

    if (data.restored) {
      profile = await withAuthServiceTimeout(
        "Guest profile restore",
        this.refreshUserProfile(user.uid),
      );
    }

    if (!profile) {
      const username = onboardingName || data.username || `guest_${generateRandomUsername()}`;
      const email = data.email || `${username.replace(/\s+/g, "_")}@stron.in`;
      const userModel: StronUser = {
        ...createMinimalUser(user.uid, email, username, null),
        isGuest: true,
        ...(onboardingLocation || data.location
          ? { location: onboardingLocation || data.location || null }
          : {}),
      };
      try {
        profile =
          (await withAuthServiceTimeout(
            "Guest profile setup",
            this.updateUserProfile(userModel),
            8000,
          )) ?? userModel;
      } catch {
        profile = userModel;
      }
      await this.saveUserSession(profile);
    } else {
      profile = {
        ...profile,
        isGuest: true,
        ...(onboardingName ? { username: onboardingName } : {}),
        ...(onboardingLocation ? { location: onboardingLocation } : {}),
      };
      await this.saveUserSession(profile);
      try {
        profile = (await this.updateUserProfile(profile)) ?? profile;
      } catch {
        // Local session already has the onboarding name/location.
      }
    }

    setClarityUserIdentity(user.uid);
    identifyUser({ uid: user.uid, email: user.email ?? profile.email ?? null });

    return { firebaseUser: user, profile };
  },

  async repairProfileIfNeeded(uid: string) {
    try {
      const profile = await Promise.race<StronUser | null>([
        this.refreshUserProfile(uid),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000)),
      ]);
      // Create profile when missing (profile repair).
      if (!profile) {
        const firebaseUser = getFirebaseAuth().currentUser;
        if (firebaseUser) {
          await this.createMinimalUserProfile(firebaseUser);
        }
      }
    } catch {
      // Best-effort — never block navigation
    }
  },

  async navigateAfterLogin(user: FirebaseAuthTypes.User) {
    await this.ensureJwtTokens();

    const isNew = await this.isNewUser(user.uid);
    if (isNew) {
      await this.createMinimalUserProfile(user);
    }

    const cached = await this.getCachedUserSession();
    if (cached && (cached.isGuest || isMongoObjectIdString(cached.id))) {
      return cached;
    }
    return (await this.refreshUserProfile(user.uid)) ?? cached;
  },

  async signOut() {
    try {
      await RevenueCatService.logOutUser();
    } catch (error) {
      logError("RevenueCat logout failed", error);
    }

    try {
      const uid = getFirebaseAuth().currentUser?.uid;
      const Notifications = getExpoNotifications();
      if (uid && Notifications) {
        try {
          const tokenResponse = await withAuthServiceTimeout(
            "Get push token on logout",
            Notifications.getDevicePushTokenAsync(),
            3000,
          );
          const token = tokenResponse.data;
          if (token) {
            await apiClient.post(
              "/api/notifications/unregister-token",
              { uid, token },
              { timeout: LOGOUT_REQUEST_TIMEOUT_MS },
            );
          }
        } catch (error) {
          logError("FCM unregister on logout failed", error);
        }
      }
    } catch (error) {
      logError("Token un-registration on logout failed", error);
    }

    try {
      const refreshToken = await TokenStorage.getRefreshToken();
      if (refreshToken) {
        await authPublicApi.post(
          "/api/auth/logout",
          { refreshToken },
          { timeout: LOGOUT_REQUEST_TIMEOUT_MS },
        );
      }
    } catch (error) {
      logError("Logout API failed", error);
    }

    await TokenStorage.clearTokens();
    resetAnalyticsUser();

    try {
      const { StepService } = await import("../step/step.service");
      StepService.stopTracking();
      await StepService.clearAccountLocalStepState();
      if (Platform.OS === "android") {
        const { getStepForegroundService } = await import("../../provider/stepForegroundServiceLazy");
        const svc = getStepForegroundService();
        if (svc?.clearUserStepState) {
          await svc.clearUserStepState().catch(() => undefined);
        }
      }
      await clearIosStepNotification();
      const { clearStepRaceLiveNotification } =
        await import("../stepRace/stepRaceLiveNotification.service");
      await clearStepRaceLiveNotification();
      try {
        const { clearProfileActivityCache } = await import("@/utils/profileActivityCache");
        clearProfileActivityCache();
      } catch {
        // ignore
      }
    } catch (error) {
      logError("Clear step notification on logout failed", error);
    }

    try {
      const { syncAppBadgeCount } = await import("../notification/inboxNotification.service");
      await syncAppBadgeCount(0);
    } catch {
      // non-blocking
    }

    try {
      await clearPushRegistrationFlag();
    } catch (error) {
      logError("Clear push registration flag on logout failed", error);
    }

    try {
      await withAuthServiceTimeout("Google sign-out", GoogleSignin.signOut(), 3000);
    } catch {
      // ignore
    }

    // Apple sign-out: no SDK-level sign-out needed (revoking is user-side in iOS Settings).

    try {
      if (getFirebaseAuth().currentUser) {
        await withAuthServiceTimeout("Firebase sign-out", signOut(getFirebaseAuth()), 3000);
      }
    } catch (error) {
      logError("Firebase sign-out on logout failed", error);
    }

    try {
      const preserveKeys = [RATING_PROMPT_DISMISSED_KEY, RATING_PROMPT_OPEN_COUNT_KEY];
      const preserved = await Promise.all(
        preserveKeys.map(async (key) => [key, await AsyncStorage.getItem(key)] as const),
      );
      await withAuthServiceTimeout("Clear AsyncStorage on logout", AsyncStorage.clear(), 3000);
      await Promise.all(
        preserved.map(([key, value]) =>
          value == null ? Promise.resolve() : AsyncStorage.setItem(key, value),
        ),
      );
    } catch (error) {
      logError("AsyncStorage clear on logout failed", error);
      try {
        await AsyncStorage.removeItem(USER_SESSION_KEY);
      } catch {
        // ignore
      }
    }
  },

  async deleteAccount(uid: string) {
    await apiClient.delete(`/api/user/account/${uid}`);
    await this.signOut();
  },
};

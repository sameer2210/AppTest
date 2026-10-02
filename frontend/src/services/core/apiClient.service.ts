/* eslint-disable import/no-named-as-default-member */
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { getIdToken } from "@react-native-firebase/auth";
import { STRON_BACKEND_URL, getBackendUrl } from "@/constants/stron";
import { TokenStorage } from "../auth/tokenStorage.service";
import { logError } from "@/config/devLogger";
import { getFirebaseAuth } from "./firebase.service";
import { attachAppNetworkLogging } from "@/utils/appNetworkLogger";
import { isSessionExpiryInFlight, notifySessionExpired } from "./sessionExpiry";

const skipAuthConfig = (config?: AxiosRequestConfig): AxiosRequestConfig => ({
  ...config,
  headers: { ...config?.headers, "X-Skip-Auth": "true" },
});

const API_REQUEST_TIMEOUT_MS = 15000;
const AUTH_REQUEST_TIMEOUT_MS = 20000;
/** API auth gate (refresh / ensure token). */
const AUTH_GATE_TIMEOUT_MS = 25000;
/** Firebase getIdToken — forceRefresh can be slow on mobile networks. */
const FIREBASE_ID_TOKEN_TIMEOUT_MS = 30000;

/** Auth calls bypass the main client interceptors to avoid refresh/login races. */
const authApiClient = axios.create({
  baseURL: STRON_BACKEND_URL,
  timeout: AUTH_REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});
authApiClient.interceptors.request.use((config) => {
  config.baseURL = getBackendUrl();
  return config;
});
attachAppNetworkLogging(authApiClient);

let refreshPromise: Promise<boolean> | null = null;
let recoverPromise: Promise<boolean> | null = null;
let lastAuthGateMessage = "Authentication required. Please sign in again.";
let lastRecoveryFailedDueToNetwork = false;

const isNetworkError = (error: unknown) => {
  const axiosError = error as { message?: string; code?: string };
  return (
    axiosError?.message === "Network Error" ||
    axiosError?.code === "ERR_NETWORK" ||
    axiosError?.code === "ECONNABORTED" ||
    axiosError?.message?.includes("timed out") === true
  );
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const refreshAccessToken = async (): Promise<boolean> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const refreshToken = await TokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        const response = await authApiClient.post("/api/auth/refresh", { refreshToken });
        const accessToken = response.data?.accessToken as string | undefined;
        const newRefreshToken = response.data?.refreshToken as string | undefined;
        if (accessToken) {
          await TokenStorage.saveAccessToken(accessToken);
          if (newRefreshToken) {
            await TokenStorage.saveRefreshToken(newRefreshToken);
          }
          return true;
        }
      } catch (error) {
        if (isNetworkError(error)) {
          lastRecoveryFailedDueToNetwork = true;
        }
        logError("Token refresh failed", error);
      }
    }
    return false;
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
};

export const exchangeFirebaseToken = async (
  forceRefresh = false,
  username?: string,
): Promise<boolean> => {
  const user = getFirebaseAuth().currentUser;
  if (!user) return false;

  try {
    // Prefer cached token first; forceRefresh hits Google servers and
    // is much slower / flaky on poor mobile networks.
    const idToken = await withTimeout(
      getIdToken(user, forceRefresh),
      FIREBASE_ID_TOKEN_TIMEOUT_MS,
      "Firebase getIdToken timed out",
    );

    const body: Record<string, string> = {};
    if (username) body.username = username;
    const response = await authApiClient.post("/api/auth/exchange-token", body, {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    const accessToken = response.data?.accessToken as string | undefined;
    const newRefreshToken = response.data?.refreshToken as string | undefined;
    if (accessToken && newRefreshToken) {
      await TokenStorage.saveTokens(accessToken, newRefreshToken);
      return true;
    }
  } catch (error) {
    if (isNetworkError(error)) {
      lastRecoveryFailedDueToNetwork = true;
      lastAuthGateMessage = `Cannot reach API at ${STRON_BACKEND_URL || "(empty API URL)"}. Check Wi‑Fi and try again.`;
      logError(
        `Firebase token exchange failed — cannot reach ${STRON_BACKEND_URL || "(empty API URL)"}`,
        error,
      );
    } else {
      lastAuthGateMessage = "Authentication required. Please sign in again.";
      logError("Firebase token exchange failed", error);
    }
  }

  return false;
};

/**
 * Force mint new JWTs — ignores local `exp` so wrong-secret / revoked tokens
 * can still recover via Firebase exchange.
 */
export const recoverAccessToken = async (): Promise<boolean> => {
  if (recoverPromise) {
    return recoverPromise;
  }

  recoverPromise = (async () => {
    lastRecoveryFailedDueToNetwork = false;
    if (await refreshAccessToken()) {
      return true;
    }
    if (await exchangeFirebaseToken(false)) {
      return true;
    }
    if (await exchangeFirebaseToken(true)) {
      return true;
    }
    if (!getFirebaseAuth().currentUser) {
      lastAuthGateMessage = "Authentication required. Please sign in again.";
    } else if (lastRecoveryFailedDueToNetwork) {
      lastAuthGateMessage = `Cannot reach API at ${STRON_BACKEND_URL || "(empty API URL)"}. Check Wi‑Fi and try again.`;
    } else {
      lastAuthGateMessage = "Authentication required. Please sign in again.";
    }
    return false;
  })().finally(() => {
    recoverPromise = null;
  });

  return recoverPromise;
};

export const wasLastAuthRecoveryNetworkFailure = (): boolean => lastRecoveryFailedDueToNetwork;

let ensureTokenPromise: Promise<boolean> | null = null;

export const ensureValidAccessToken = async (): Promise<boolean> => {
  if (ensureTokenPromise) {
    return ensureTokenPromise;
  }

  ensureTokenPromise = (async () => {
    if (isSessionExpiryInFlight()) {
      return false;
    }

    const accessToken = await TokenStorage.getAccessToken();
    if (accessToken && !TokenStorage.isExpired(accessToken)) {
      return true;
    }
    // 1–3. Refresh JWT, then Firebase exchange (cached then forced)
    if (await recoverAccessToken()) {
      return true;
    }
    // Never wipe tokens / logout on transient network failures.
    if (!lastRecoveryFailedDueToNetwork) {
      void notifySessionExpired();
    }
    return false;
  })().finally(() => {
    ensureTokenPromise = null;
  });

  return ensureTokenPromise;
};

export const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: STRON_BACKEND_URL,
    timeout: API_REQUEST_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
  });

  attachAppNetworkLogging(instance);

  instance.interceptors.request.use(async (config) => {
    config.baseURL = getBackendUrl();

    if (isSessionExpiryInFlight()) {
      const error = new Error("Session expired. Please sign in again.");
      (error as Error & { config?: typeof config }).config = config;
      return Promise.reject(error);
    }

    if (config.headers?.["X-Skip-Auth"] === "true") {
      delete config.headers["X-Skip-Auth"];
      const token = await TokenStorage.getAccessToken();
      if (token && !TokenStorage.isExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    const optionalAuthHeader =
      config.headers?.["X-Optional-Auth"] === "true" ||
      config.headers?.["x-optional-auth"] === "true" ||
      (typeof config.headers?.get === "function" &&
        config.headers.get("X-Optional-Auth") === "true");

    if (optionalAuthHeader) {
      if (typeof config.headers?.delete === "function") {
        config.headers.delete("X-Optional-Auth");
      } else {
        delete config.headers["X-Optional-Auth"];
        delete config.headers["x-optional-auth"];
      }
      // Proactively refresh token if user is signed in to avoid sending expired tokens on app launch
      await ensureValidAccessToken().catch(() => false);
      const token = await TokenStorage.getAccessToken();
      if (token && !TokenStorage.isExpired(token)) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }

    const hasValidToken = await withTimeout(
      ensureValidAccessToken(),
      AUTH_GATE_TIMEOUT_MS,
      "Authentication timed out",
    ).catch(async (error) => {
      logError("Authentication gate failed", error);
      return false;
    });

    if (!hasValidToken) {
      const error = new Error(lastAuthGateMessage);
      (error as Error & { config?: typeof config }).config = config;
      return Promise.reject(error);
    }

    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config as AxiosRequestConfig & {
        _retried?: boolean;
        _networkRetried?: boolean;
      };

      const isAuthEndpoint =
        original?.url?.includes("/api/auth/refresh") ||
        original?.url?.includes("/api/auth/exchange-token");

      // One retry for emulator/host flaky drops (no HTTP status).
      const method = (original?.method || "get").toLowerCase();
      if (
        original &&
        !original._networkRetried &&
        method === "get" &&
        isNetworkError(error) &&
        !isAuthEndpoint
      ) {
        original._networkRetried = true;
        await new Promise((r) => setTimeout(() => r(undefined), 350));
        return instance.request(original);
      }

      if (error.response?.status === 401 && original && !original._retried && !isAuthEndpoint) {
        if (isSessionExpiryInFlight()) {
          return Promise.reject(error);
        }

        original._retried = true;
        // Force recover — skip isExpired short-circuit (wrong-secret tokens still look "valid").
        const recovered = await recoverAccessToken();
        if (recovered) {
          const token = await TokenStorage.getAccessToken();
          if (token && original.headers) {
            original.headers.Authorization = `Bearer ${token}`;
          }
          return instance.request(original);
        }

        if (!lastRecoveryFailedDueToNetwork) {
          void notifySessionExpired();
        }
      }
      return Promise.reject(error);
    },
  );

  return instance;
};

export const apiClient = createApiClient();

export const publicApi = {
  post: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    apiClient.post<T>(path, body, skipAuthConfig(config)),
  get: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(path, skipAuthConfig(config)),
  delete: <T = unknown>(path: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(path, skipAuthConfig(config)),
};

/** Logout/revoke without going through the authenticated request gate. */
export const authPublicApi = {
  post: <T = unknown>(path: string, body?: unknown, config?: AxiosRequestConfig) =>
    authApiClient.post<T>(path, body, config),
};

import { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { log, logError, logWarn } from "../config/devLogger";

export const APP_NETWORK_TAG = "APP_NETWORK";

const SENSITIVE_HEADER_KEYS = new Set(["authorization", "cookie", "set-cookie", "x-api-key"]);

const SENSITIVE_BODY_KEYS = new Set([
  "accessToken",
  "refreshToken",
  "token",
  "idToken",
  "password",
  "otp",
  "Authorization",
]);

const resolveUrl = (config: { baseURL?: string; url?: string }) => {
  if (!config.url) return "N/A";
  if (config.url.startsWith("http")) return config.url;
  return `${config.baseURL ?? ""}${config.url}`;
};

const redactHeaders = (headers: unknown): Record<string, unknown> | undefined => {
  if (!headers || typeof headers !== "object") return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = value;
    }
  }
  return out;
};

const redactPayload = (payload: unknown): unknown => {
  if (payload == null) return payload;
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return redactPayload(JSON.parse(trimmed));
      } catch {
        return payload;
      }
    }
    return payload;
  }
  if (Array.isArray(payload)) {
    return payload.map((item) => redactPayload(item));
  }
  if (typeof payload === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_BODY_KEYS.has(key) || /token|password|otp|secret/i.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactPayload(value);
      }
    }
    return out;
  }
  return payload;
};

/** Soft-fail home polls — Network Error here is usually emulator/host flakiness. */
const isSoftFailNetworkPath = (url?: string) => {
  if (!url) return false;
  return (
    url.includes("/api/notifications/unread-count") ||
    url.includes("/api/opinion/current") ||
    url.includes("/api/step-race/active") ||
    url.includes("/api/step-race/stats")
  );
};

const isTransientNetworkFailure = (error: AxiosError) => {
  const code = error.code;
  return (
    error.message === "Network Error" ||
    code === "ERR_NETWORK" ||
    code === "ECONNABORTED" ||
    error.message?.includes("timed out") === true
  );
};

/** Expected API client errors (rate limits, validation) — log as warn, not console.error. */
const isExpectedClientError = (error: AxiosError) => {
  const status = error.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
};

const logRequest = (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toUpperCase() ?? "UNKNOWN";
  const url = resolveUrl(config);
  log(`[${APP_NETWORK_TAG}] Request: ${method} ${url}`, {
    method,
    url,
    headers: redactHeaders(config.headers),
    data: redactPayload(config.data),
    params: config.params,
  });
};

const logResponse = (response: AxiosResponse) => {
  const method = response.config.method?.toUpperCase() ?? "UNKNOWN";
  const url = resolveUrl(response.config);
  log(`[${APP_NETWORK_TAG}] Response: ${method} ${url}`, {
    status: response.status,
    statusText: response.statusText,
    url,
    method,
    data: redactPayload(response.data),
  });
};

const logResponseError = (error: AxiosError) => {
  if (
    error?.message?.includes("Authentication required") ||
    (error.response?.status === 404 &&
      (error.config?.url?.includes("/api/step-race/active") ||
        error.config?.url?.includes("/api/step-race/stats") ||
        error.config?.url?.includes("/api/v1/business") ||
        error.config?.url?.includes("/api/v1/payout-account")))
  ) {
    return;
  }
  const method = error.config?.method?.toUpperCase() ?? "UNKNOWN";
  const url = error.config ? resolveUrl(error.config) : "N/A";
  const payload = {
    status: error.response?.status,
    statusText: error.response?.statusText,
    url,
    method,
    message: error.message,
    data: redactPayload(error.response?.data),
  };

  // Emulator ↔ host drops show up as Network Error with no status; don't red-spam soft polls.
  if (isTransientNetworkFailure(error) && isSoftFailNetworkPath(error.config?.url)) {
    logWarn(`[${APP_NETWORK_TAG}] Transient network: ${method} ${url}`, payload);
    return;
  }

  // 4xx (e.g. OTP 429 rate limit) are handled in UI — avoid red ERROR + stack spam.
  if (isExpectedClientError(error)) {
    logWarn(`[${APP_NETWORK_TAG}] Client error: ${method} ${url}`, payload);
    return;
  }

  logError(`[${APP_NETWORK_TAG}] Response Error: ${method} ${url}`, payload);
};

export const attachAppNetworkLogging = (instance: AxiosInstance): void => {
  instance.interceptors.request.use(
    (config) => {
      logRequest(config);
      return config;
    },
    (error) => {
      if (error?.message?.includes("Authentication required")) {
        return Promise.reject(error);
      }
      logError(`[${APP_NETWORK_TAG}] Request Error:`, {
        message: error.message,
        url: error.config ? resolveUrl(error.config) : "N/A",
      });
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      logResponse(response);
      return response;
    },
    (error) => {
      if (error?.message?.includes("Authentication required")) {
        return Promise.reject(error);
      }
      logResponseError(error);
      return Promise.reject(error);
    },
  );
};

export const logFetchRequest = (method: string, url: string, init?: RequestInit) => {
  log(`[${APP_NETWORK_TAG}] Request: ${method.toUpperCase()} ${url}`, {
    method: method.toUpperCase(),
    url,
    headers: redactHeaders(init?.headers),
    body: redactPayload(init?.body),
  });
};

export const logFetchResponse = async (method: string, url: string, response: Response) => {
  let data: unknown;
  try {
    const text = await response.clone().text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } catch {
    data = undefined;
  }

  if (response.ok) {
    log(`[${APP_NETWORK_TAG}] Response: ${method.toUpperCase()} ${url}`, {
      status: response.status,
      statusText: response.statusText,
      url,
      method: method.toUpperCase(),
      data: redactPayload(data),
    });
    return;
  }

  const payload = {
    status: response.status,
    statusText: response.statusText,
    url,
    method: method.toUpperCase(),
    data: redactPayload(data),
  };

  if (response.status >= 400 && response.status < 500) {
    logWarn(`[${APP_NETWORK_TAG}] Client error: ${method.toUpperCase()} ${url}`, payload);
    return;
  }

  logError(`[${APP_NETWORK_TAG}] Response Error: ${method.toUpperCase()} ${url}`, payload);
};

import * as SecureStore from "expo-secure-store";

const ACCESS_TOKEN_KEY = "stron_access_token";
const REFRESH_TOKEN_KEY = "stron_refresh_token";

/** Refresh slightly before expiry to avoid race-condition 401s. */
const ACCESS_TOKEN_BUFFER_SECONDS = 30;

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let output = "";
    let i = 0;
    while (i < padded.length) {
      const enc1 = chars.indexOf(padded.charAt(i++));
      const enc2 = chars.indexOf(padded.charAt(i++));
      const enc3 = chars.indexOf(padded.charAt(i++));
      const enc4 = chars.indexOf(padded.charAt(i++));
      output += String.fromCharCode((enc1 << 2) | (enc2 >> 4));
      if (enc3 !== 64) output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2));
      if (enc4 !== 64) output += String.fromCharCode(((enc3 & 3) << 6) | enc4);
    }
    return JSON.parse(output) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const TokenStorage = {
  async saveTokens(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    void import("../step/stepForegroundAuth").then((m) => m.pushAuthTokensToForegroundService());
  },

  async saveAccessToken(accessToken: string) {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    void import("../step/stepForegroundAuth").then((m) => m.pushAuthTokensToForegroundService());
  },

  async saveRefreshToken(refreshToken: string) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    void import("../step/stepForegroundAuth").then((m) => m.pushAuthTokensToForegroundService());
  },

  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },

  async clearTokens() {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    void import("../step/stepForegroundAuth").then((m) => m.clearAuthTokensFromForegroundService());
  },

  isExpired(token: string, bufferSeconds = ACCESS_TOKEN_BUFFER_SECONDS) {
    const payload = decodeJwtPayload(token);
    const exp = payload?.exp;
    if (typeof exp !== "number") return true;
    return Date.now() >= (exp - bufferSeconds) * 1000;
  },
};

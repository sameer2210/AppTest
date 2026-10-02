/**
 * Push / clear JWT tokens into the Android foreground step service so
 * background sync can attach Authorization (and refresh on 401).
 */
import { Platform } from "react-native";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import { TokenStorage } from "../auth/tokenStorage.service";

export const pushAuthTokensToForegroundService = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  const svc = getStepForegroundService();
  if (!svc?.updateAuthTokens) return;
  try {
    const accessToken = (await TokenStorage.getAccessToken()) ?? "";
    const refreshToken = (await TokenStorage.getRefreshToken()) ?? "";
    await svc.updateAuthTokens(accessToken, refreshToken);
  } catch {
    /* native bridge optional */
  }
};

export const clearAuthTokensFromForegroundService = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  const svc = getStepForegroundService();
  if (!svc?.updateAuthTokens) return;
  try {
    await svc.updateAuthTokens("", "");
  } catch {
    /* native bridge optional */
  }
};

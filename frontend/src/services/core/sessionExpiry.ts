import { TokenStorage } from "../auth/tokenStorage.service";
import { logError } from "@/config/devLogger";

type SessionExpiryHandler = () => void | Promise<void>;

let handler: SessionExpiryHandler | null = null;
let expiryPromise: Promise<void> | null = null;

/** Register once from app shell — keeps services/core free of feature imports. */
export const registerSessionExpiryHandler = (fn: SessionExpiryHandler): void => {
  handler = fn;
};

export const isSessionExpiryInFlight = (): boolean => expiryPromise != null;

/**
 * Deduped session teardown after unrecoverable 401 / auth failure.
 * Runs the registered handler (typically signOutUser) once; falls back to
 * clearing JWTs if no handler is wired yet.
 */
export const notifySessionExpired = async (): Promise<void> => {
  if (expiryPromise) {
    return expiryPromise;
  }

  expiryPromise = (async () => {
    try {
      if (handler) {
        await handler();
      } else {
        await TokenStorage.clearTokens();
      }
    } catch (error) {
      logError("Session expiry handler failed", error);
      try {
        await TokenStorage.clearTokens();
      } catch {
        // ignore
      }
    } finally {
      expiryPromise = null;
    }
  })();

  return expiryPromise;
};

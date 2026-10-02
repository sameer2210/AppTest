import { Platform } from "react-native";
import { getOtpVerifyModule } from "../provider/otpVerifyLazy";

let cachedHashes: string[] | null = null;
let hashPromise: Promise<string[]> | null = null;

const loadHashes = async (): Promise<string[]> => {
  if (Platform.OS !== "android") {
    return [];
  }
  if (cachedHashes) {
    return cachedHashes;
  }

  const otpVerify = getOtpVerifyModule();
  if (!otpVerify) {
    return [];
  }

  if (!hashPromise) {
    hashPromise = otpVerify
      .getHash()
      .then((hashes) => {
        cachedHashes = hashes.map((h) => h.trim()).filter(Boolean);
        return cachedHashes;
      })
      .catch(() => {
        cachedHashes = [];
        return cachedHashes;
      })
      .finally(() => {
        hashPromise = null;
      });
  }
  return hashPromise;
};

/** Primary 11-char hash for SMS Retriever (first signing cert). */
export const getAndroidSmsAppHash = async (): Promise<string | null> => {
  const hashes = await loadHashes();
  return hashes[0] ?? null;
};

export const getAndroidSmsAppHashes = async (): Promise<string[]> => loadHashes();

/** Warm cache on login screen so send-otp includes appHash immediately. */
export const prefetchAndroidSmsAppHash = (): void => {
  void loadHashes();
};

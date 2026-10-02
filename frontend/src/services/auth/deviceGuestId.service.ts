import { Platform } from "react-native";
import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const IOS_GUEST_DEVICE_KEY = "stron_guest_device_id";
const ANDROID_FALLBACK_KEY = "stron_guest_device_id_android";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export type GuestPlatform = "android" | "ios";

export type GuestDeviceIdentity = {
  deviceId: string;
  platform: GuestPlatform;
};

/**
 * Stable device key for guest restore after uninstall/reinstall.
 * - Android: ANDROID_ID (survives reinstall on same device/signing key)
 * - iOS: IDFV when available (best-effort across reinstall); Keychain UUID fallback
 */
export const getGuestDeviceIdentity = async (): Promise<GuestDeviceIdentity> => {
  if (Platform.OS === "android") {
    return getAndroidGuestIdentity();
  }
  if (Platform.OS === "ios") {
    return getIosGuestIdentity();
  }
  throw new Error("Guest login is only supported on Android and iOS.");
};

const getAndroidGuestIdentity = async (): Promise<GuestDeviceIdentity> => {
  const androidId = Application.getAndroidId()?.trim();
  if (androidId) {
    return { deviceId: `android:${androidId}`, platform: "android" };
  }

  // Rare fallback if ANDROID_ID is unavailable (emulator / restricted profile).
  let stored = await SecureStore.getItemAsync(ANDROID_FALLBACK_KEY);
  if (!stored) {
    stored = Crypto.randomUUID();
    await SecureStore.setItemAsync(ANDROID_FALLBACK_KEY, stored, SECURE_STORE_OPTIONS);
  }
  return { deviceId: `android:${stored}`, platform: "android" };
};

const getIosGuestIdentity = async (): Promise<GuestDeviceIdentity> => {
  const idfv = (await Application.getIosIdForVendorAsync())?.trim() || null;
  let stored = await SecureStore.getItemAsync(IOS_GUEST_DEVICE_KEY);

  // Prefer IDFV for cross-reinstall restore when Apple still returns the same vendor id.
  if (idfv) {
    if (stored !== idfv) {
      await SecureStore.setItemAsync(IOS_GUEST_DEVICE_KEY, idfv, SECURE_STORE_OPTIONS);
    }
    return { deviceId: `ios:${idfv}`, platform: "ios" };
  }

  // No IDFV — keep a Keychain UUID for the life of this install.
  if (!stored) {
    stored = Crypto.randomUUID();
    await SecureStore.setItemAsync(IOS_GUEST_DEVICE_KEY, stored, SECURE_STORE_OPTIONS);
  }
  return { deviceId: `ios:${stored}`, platform: "ios" };
};

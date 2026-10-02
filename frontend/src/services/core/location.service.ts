import * as Location from "expo-location";
import * as Device from "expo-device";
import { Linking, Platform } from "react-native";
import type { LocationPermissionStatus } from "@/models/explore";

const POSITION_TIMEOUT_MS = 8000;

export type ResolvedLocation = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

/** Classic Android emulator default (Googleplex / Mountain View). */
const isEmulatorDefaultGoogleplex = (latitude: number, longitude: number) =>
  Math.abs(latitude - 37.421998) < 0.05 && Math.abs(longitude - -122.084) < 0.05;

/** Optional: EXPO_PUBLIC_DEV_MOCK_LOCATION=23.2599,77.4126 (Bhopal) for emulator testing. */
const readDevMockLocation = (): ResolvedLocation | null => {
  const raw = process.env.EXPO_PUBLIC_DEV_MOCK_LOCATION?.trim();
  if (!raw) return null;
  const [latRaw, lonRaw] = raw.split(",").map((part) => part.trim());
  const latitude = Number(latRaw);
  const longitude = Number(lonRaw);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude, accuracy: null };
};

const mapPermission = (
  status: Location.PermissionStatus,
  canAskAgain: boolean,
): LocationPermissionStatus => {
  if (status === Location.PermissionStatus.GRANTED) return "granted";
  if (status === Location.PermissionStatus.UNDETERMINED) return "never_asked";
  if (!canAskAgain) return "blocked";
  return "denied";
};

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });

const readPosition = (position: Location.LocationObject): ResolvedLocation => ({
  latitude: position.coords.latitude,
  longitude: position.coords.longitude,
  accuracy: position.coords.accuracy ?? null,
});

export const LocationService = {
  async getPermissionStatus(): Promise<LocationPermissionStatus> {
    const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
    return mapPermission(status, canAskAgain);
  },

  async requestPermission(): Promise<LocationPermissionStatus> {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    return mapPermission(status, canAskAgain);
  },

  async ensurePermission(): Promise<LocationPermissionStatus> {
    const { status: initialStatus } =
      await Location.getForegroundPermissionsAsync();
    if (initialStatus === Location.PermissionStatus.GRANTED) {
      return "granted";
    }
    const { status: requestedStatus, canAskAgain } =
      await Location.requestForegroundPermissionsAsync();
    return mapPermission(requestedStatus, canAskAgain);
  },

  async getCurrentPosition(options?: {
    /** Skip cached last-known fix (use for "current location" button). */
    forceFresh?: boolean;
  }): Promise<ResolvedLocation> {
    // Emulator GPS is often stuck on Mountain View — use .env mock in __DEV__.
    if (__DEV__ && !Device.isDevice) {
      const mock = readDevMockLocation();
      if (mock) {
        return mock;
      }
    }

    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw new Error("LOCATION_SERVICES_DISABLED");
    }

    const forceFresh = options?.forceFresh === true;

    if (!forceFresh) {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        const ageMs = Date.now() - (lastKnown.timestamp ?? 0);
        if (ageMs < 60_000) {
          return readPosition(lastKnown);
        }
      }
    }

    const attempts: Location.LocationOptions[] = [
      { accuracy: Location.Accuracy.Balanced, mayShowUserSettingsDialog: true },
      { accuracy: Location.Accuracy.Low, mayShowUserSettingsDialog: true },
    ];

    let position: ResolvedLocation | null = null;
    for (const attempt of attempts) {
      try {
        const fix = await withTimeout(
          Location.getCurrentPositionAsync(attempt),
          POSITION_TIMEOUT_MS,
          "LOCATION_TIMEOUT",
        );
        position = readPosition(fix);
        break;
      } catch {
        // try next accuracy level
      }
    }

    if (!position) {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown?.coords) {
        position = readPosition(lastKnown);
      }
    }

    if (!position) {
      throw new Error("LOCATION_TIMEOUT");
    }

    if (
      __DEV__ &&
      !Device.isDevice &&
      isEmulatorDefaultGoogleplex(position.latitude, position.longitude)
    ) {
      console.warn(
        "[Location] Emulator GPS is Mountain View (Google default). Set EXPO_PUBLIC_DEV_MOCK_LOCATION=lat,lon in .env, or Emulator ⋯ → Location.",
      );
    }

    return position;
  },

  async reverseGeocodeLabel(latitude: number, longitude: number): Promise<string> {
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      if (!place) {
        return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
      }
      const city = place.city || place.subregion || place.district;
      return [city, place.region, place.isoCountryCode || place.country].filter(Boolean).join(", ");
    } catch {
      return `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
    }
  },

  async openSettings() {
    if (Platform.OS === "ios") {
      await Linking.openURL("app-settings:");
    } else {
      await Linking.openSettings();
    }
  },

  async openLocationSettings() {
    try {
      if (Platform.OS === "android") {
        await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
        return;
      }
    } catch {
      // fall through
    }
    await this.openSettings();
  },
};

/**
 * StepTrackingPermissions
 * Mirrors Flutter PermissionService + HomeScreen._trackingStage logic.
 *
 * Android permission chain (in order):
 *  weak       → ACTIVITY_RECOGNITION
 *  active     → battery optimisation exemption
 *  stable     → Google Fit / Health Connect
 *  strong     → ACCESS_FINE_LOCATION
 *  great      → autostart (manufacturer setting)
 *  maxed      → everything granted
 *
 * iOS permission chain:
 *  weak       → CoreMotion / sensors (Pedometer)
 *  active     → notifications
 *  stable     → Apple Health (HealthKit)
 *  maxed      → all granted
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as IntentLauncher from "expo-intent-launcher";
import { PermissionsAndroid, Platform } from "react-native";
import { GoogleFitService } from "../health/googleFit.service";
import { AppleHealthService } from "../health/appleHealth.service";
import { hasPushNotificationPermission, requestPushNotificationPermission } from "../notification/pushNotification.service";
import { APP_IDENTITY } from "@/constants/stron";
import { logError } from "@/config/devLogger";
import type { TrackingStage } from "@/models/tracking";

const AUTOSTART_KEY = "stron_autostart_granted";
const BATTERY_OPT_KEY = "stron_battery_opt_opened";

export type StepPermissionSnapshot = {
  activityGranted: boolean;
  batteryOptimizationIgnored: boolean;
  googleFitEnabled: boolean;
  gpsGranted: boolean;
  autostartEnabled: boolean;
  notificationGranted: boolean;
};

// ─── Battery Optimisation ─────────────────────────────────────────────────────

/**
 * On Android, we open the system battery optimisation settings.
 * We cannot directly read the OS value without a native module, so we store
 * a flag once the user has visited the settings screen — same pragmatic
 * approach used by many production apps.
 */
const openBatteryOptimizationSettings = async (): Promise<void> => {
  if (Platform.OS !== "android") return;
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${APP_IDENTITY.androidPackage}` },
    );
  } catch {
    try {
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
      );
    } catch (error) {
      logError("[StepPermissions] Cannot open battery settings", error);
    }
  }
  await AsyncStorage.setItem(BATTERY_OPT_KEY, "true");
};

const isBatteryOptimizationHandled = async (): Promise<boolean> => {
  return (await AsyncStorage.getItem(BATTERY_OPT_KEY)) === "true";
};

// ─── GPS / Location ───────────────────────────────────────────────────────────

const hasLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    return await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
  } catch {
    return false;
  }
};

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: "Location Permission",
        message: "Stron uses location to improve step accuracy and distance tracking.",
        buttonPositive: "Allow",
        buttonNegative: "Deny",
      },
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch (error) {
    logError("[StepPermissions] Location request failed", error);
    return false;
  }
};

// ─── Notifications ────────────────────────────────────────────────────────────

const hasNotificationPermission = async (): Promise<boolean> => {
  return hasPushNotificationPermission();
};

const requestNotificationPermission = async (): Promise<boolean> => {
  return requestPushNotificationPermission();
};

// ─── Public API ───────────────────────────────────────────────────────────────

const getStepService = async () => {
  const { StepService } = await import("./step.service");
  return StepService;
};

export const StepTrackingPermissions = {
  async loadSnapshot(): Promise<StepPermissionSnapshot> {
    const stepService = await getStepService();
    const activityGranted = await stepService.hasActivityPermission();
    const notificationGranted = await hasNotificationPermission();

    if (Platform.OS === "ios") {
      // iOS chain: weak → sensors, active → notifications, stable → Apple Health, maxed
      const appleHealthEnabled = await AppleHealthService.isEnabled();
      return {
        activityGranted,
        batteryOptimizationIgnored: true,
        googleFitEnabled: appleHealthEnabled,
        gpsGranted: true,
        autostartEnabled: true,
        notificationGranted,
      };
    }

    // Android chain — treat Health Connect as granted when OS read permission exists.
    const batteryOptimizationIgnored = await isBatteryOptimizationHandled();
    const googleFitEnabled =
      (await GoogleFitService.isEnabled()) || (await GoogleFitService.hasPermissions());
    const gpsGranted = await hasLocationPermission();
    const autostartEnabled = (await AsyncStorage.getItem(AUTOSTART_KEY)) === "true";

    return {
      activityGranted,
      batteryOptimizationIgnored,
      googleFitEnabled,
      gpsGranted,
      autostartEnabled,
      notificationGranted,
    };
  },

  async markAutostartEnabled(): Promise<void> {
    await AsyncStorage.setItem(AUTOSTART_KEY, "true");
  },

  /**
   * Resolves the tracking stage from a snapshot.
   * Mirrors Flutter HomeScreen._trackingStage().
   */
  resolveStage(snapshot: StepPermissionSnapshot): TrackingStage {
    if (Platform.OS === "ios") {
      if (!snapshot.activityGranted) return "weak";
      if (!snapshot.notificationGranted) return "active";
      if (!snapshot.googleFitEnabled) return "stable"; // Apple Health not linked yet
      return "maxed";
    }

    // Android: advance only if every preceding step is granted
    const chain: boolean[] = [
      snapshot.activityGranted,
      snapshot.batteryOptimizationIgnored,
      snapshot.googleFitEnabled,
      snapshot.gpsGranted,
      snapshot.autostartEnabled,
    ];

    let grantedCount = 0;
    for (const granted of chain) {
      if (!granted) break;
      grantedCount += 1;
    }

    switch (grantedCount) {
      case 0:
        return "weak";
      case 1:
        return "active";
      case 2:
        return "stable";
      case 3:
        return "strong";
      case 4:
        return "great";
      default:
        return "maxed";
    }
  },

  shouldShowMissingStepsWarning(snapshot: StepPermissionSnapshot, stage: TrackingStage): boolean {
    if (stage !== "maxed" && stage !== "great") return false;
    return Platform.OS === "android" && !snapshot.autostartEnabled;
  },

  /**
   * Android 13+ needs POST_NOTIFICATIONS for the step foreground notification to appear.
   * Parity: PermissionService.ensureNotificationPermission()
   */
  async ensureNotificationPermission(): Promise<boolean> {
    return requestNotificationPermission();
  },

  /**
   * Advance to the next stage in the permission chain.
   * Mirrors Flutter HomeScreen._handleTrackingPermissionAction().
   */
  async advancePermissionStage(current: TrackingStage): Promise<TrackingStage> {
    const stepService = await getStepService();
    if (Platform.OS === "ios") {
      switch (current) {
        case "weak":
          await stepService.requestPermissions();
          break;
        case "active":
          await requestNotificationPermission();
          break;
        case "stable":
          await AppleHealthService.requestAuthorization();
          break;
        default:
          break;
      }
    } else {
      switch (current) {
        case "weak":
          await stepService.requestPermissions();
          break;
        case "active":
          // Flutter: openIgnoreBatteryOptimizationSettings
          await openBatteryOptimizationSettings();
          break;
        case "stable":
          await GoogleFitService.requestAuthorizationFlow();
          break;
        case "strong":
          await requestLocationPermission();
          break;
        case "great":
          await StepTrackingPermissions.markAutostartEnabled();
          break;
        default:
          break;
      }
    }

    const snapshot = await StepTrackingPermissions.loadSnapshot();
    return StepTrackingPermissions.resolveStage(snapshot);
  },
};

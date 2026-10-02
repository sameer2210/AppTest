import { Platform } from "react-native";
import { StepService } from "@/services/step/step.service";
import { StepTrackingPermissions } from "@/services/step/stepTrackingPermissions.service";
import * as StepNotificationSync from "@/services/step/stepNotificationSync.service";
import * as StepAnalytics from "@/services/step/stepAnalytics.service";
import { GoogleFitService } from "@/services/health/googleFit.service";
import { AppleHealthService } from "@/services/health/appleHealth.service";
import { PlatformHealthService } from "@/services/health/platformHealth.service";

export const hasActivityPermission = async (): Promise<boolean> => {
  return StepService.hasActivityPermission();
};

export const isHealthStoreLinked = async (): Promise<boolean> => {
  if (Platform.OS === "android") {
    return GoogleFitService.isEnabled();
  }
  if (Platform.OS === "ios") {
    return AppleHealthService.isEnabled();
  }
  return true;
};

export const requestHealthStoreAuthorization = async (
  openHealthIfDecided = false,
): Promise<boolean> => {
  if (Platform.OS === "android") {
    const status = await GoogleFitService.requestAuthorizationFlow();
    return status === "authorized";
  }
  if (Platform.OS === "ios") {
    return AppleHealthService.requestAuthorization({ openHealthIfDecided });
  }
  return true;
};

export const requestStepPermissionsService = async (): Promise<boolean> => {
  return StepService.requestPermissions();
};

export const StepsApi = {
  ...StepService,
  permissions: StepTrackingPermissions,
  notificationSync: StepNotificationSync,
  analytics: StepAnalytics,
  googleFit: GoogleFitService,
  appleHealth: AppleHealthService,
  platformHealth: PlatformHealthService,
};

export { HealthConnectStatus } from "@/services/health/googleFit.service";
export type { HealthConnectStatus as HealthConnectStatusType } from "@/services/health/googleFit.service";
export { StepTrackingPermissions } from "@/services/step/stepTrackingPermissions.service";
export {
  syncStepNotificationFromStore,
  clearIosStepNotification,
  seedStepNotificationPayload,
  invalidateStepNotificationHistoryCache,
} from "@/services/step/stepNotificationSync.service";
export { StepService } from "@/services/step/step.service";
export { GoogleFitService } from "@/services/health/googleFit.service";
export { AppleHealthService } from "@/services/health/appleHealth.service";
export { PlatformHealthService } from "@/services/health/platformHealth.service";
export {
  computeStepStreak,
  formatStreakLabel,
  getCachedStepStreak,
  loadStepAnalytics,
} from "@/services/step/stepAnalytics.service";

export default StepsApi;

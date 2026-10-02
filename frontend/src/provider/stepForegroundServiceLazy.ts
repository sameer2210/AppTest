/**
 * stepForegroundServiceLazy
 * Lazy wrapper around the StronStepModule NativeModule.
 *
 * Returns null when:
 *  - Running in Expo Go (no native modules)
 *  - Running on iOS (Android-only service)
 *  - NativeModules.StronStepModule is not available (prebuild not run yet)
 */
import { NativeModules, Platform } from "react-native";
import Constants, { ExecutionEnvironment } from "expo-constants";

import type { StepNotificationPayload } from "@/models/stepNotification.types";

export type StepServiceConfig = {
  userId: string;
  apiUrl: string;
  dbSteps?: number;
  dailyOffset?: number;
  offsetDate?: string;
  /** JWT for authenticated FGS sync — required for /sync-steps from native. */
  accessToken?: string;
  refreshToken?: string;
};

export type ServiceSnapshot = {
  localSteps: number;
  localStepsDate: string;
  dbSteps: number;
  offsetDate: string;
  isRunning: boolean;
};

export type RaceLiveNotificationPayload = {
  raceTitle: string;
  leadLabel: string;
  leadDiff: string;
  isLeading: string;
  statusLine: string;
  userStepsLabel: string;
  opponentName: string;
  opponentStepsLabel: string;
  youLine: string;
  oppLine: string;
  userProgress: number;
  oppProgress: number;
  youAvatarPath?: string;
  oppAvatarPath?: string;
  goalLabel?: string;
  userStepsValue?: string;
  oppStepsValue?: string;
};

export type EventsLiveNotificationRow = {
  title: string;
  format: string;
  progressLabel: string;
  progressPercent: number;
  covered?: number;
  target?: number;
  unit?: string;
  lastLocalSteps?: number;
  eventKey?: string;
};

export type ActiveRaceStatePayload = {
  raceId: string;
  startSteps: number;
  targetSteps: number;
  opponentPaceSeconds: number;
  startTimeMs: number;
  opponentName: string;
  youAvatarPath?: string;
  oppAvatarPath?: string;
};

export type StronStepModuleType = {
  startService(config: StepServiceConfig): Promise<boolean>;
  stopService(): Promise<boolean>;
  updateDbSteps(steps: number): Promise<boolean>;
  /** Account switch: replace local/db (do not max with previous user). */
  replaceAccountSteps?(steps: number): Promise<boolean>;
  sendOffset(offset: number, offsetDate: string): Promise<boolean>;
  getCurrentSteps(): Promise<number>;
  getServiceSnapshot(): Promise<ServiceSnapshot>;
  isServiceRunning(): Promise<boolean>;
  updateNotificationPayload(payload: StepNotificationPayload): Promise<boolean>;
  updateRaceLiveNotification?(payload: RaceLiveNotificationPayload): Promise<boolean>;
  clearRaceLiveNotification?(): Promise<boolean>;
  persistActiveRaceState?(payload: ActiveRaceStatePayload): Promise<boolean>;
  clearActiveRaceState?(): Promise<boolean>;
  updateEventsLiveNotification?(payload: { rows: EventsLiveNotificationRow[] }): Promise<boolean>;
  clearEventsLiveNotification?(): Promise<boolean>;
  refreshLiveNotifications?(): Promise<boolean>;
  resetDailyStepState(): Promise<boolean>;
  clearUserStepState(): Promise<boolean>;
  /** Persist / clear JWTs used by native background sync. */
  updateAuthTokens?(accessToken: string, refreshToken: string): Promise<boolean>;
  getElapsedRealtime?(): Promise<number>;
};

let _cached: StronStepModuleType | null | undefined;

export const getStepForegroundService = (): StronStepModuleType | null => {
  // Only available on Android native builds
  if (Platform.OS !== "android") return null;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;

  if (_cached !== undefined) return _cached;

  const mod = NativeModules.StronStepModule as StronStepModuleType | undefined;
  _cached = mod ?? null;
  return _cached;
};

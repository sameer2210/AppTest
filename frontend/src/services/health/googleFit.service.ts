import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking, Platform } from "react-native";
import { getHealthConnectModule } from "../../provider/healthConnectLazy";
import { logError } from "@/config/devLogger";
import {
  buildMonthlyStepStats,
  buildWeeklyStepStats,
  type MonthlyStepStats,
  type WeeklyStepStats,
} from "@/models/stepStats";
import { mergePedometerWithHealthSteps } from "../step/stepHealthMerge.utils";
import {
  clipStepsRecordToWindow,
  pickTrustworthyHealthDaySteps,
  sanitizeHealthConnectTodaySteps,
  type StepsIntervalRecord,
} from "../step/healthConnectDaySteps.utils";

export enum HealthConnectStatus {
  notSupported = "notSupported",
  notInstalled = "notInstalled",
  notAuthorized = "notAuthorized",
  authorized = "authorized",
}

const LAST_SYNC_KEY = "google_fit_last_sync";
const ENABLED_KEY = "google_fit_enabled";
const HEALTH_CONNECT_PACKAGE = "com.google.android.apps.healthdata";
const AGGREGATE_TIMEOUT_MS = 5000;

let isInitialized = false;
let hasPermissions = false;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** Local calendar day YYYY-MM-DD — never use toISOString() (UTC shifts the date for IST). */
const dateKey = (date: Date): string => {
  const d = startOfDay(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toIso = (date: Date) => date.toISOString();

const getHc = () => getHealthConnectModule();

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const updateLastSyncTime = async () => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
  } catch (error) {
    logError("[GoogleFitService] Error updating last sync time", error);
  }
};

const setEnabled = async (enabled: boolean) => {
  try {
    await AsyncStorage.setItem(ENABLED_KEY, enabled ? "true" : "false");
  } catch (error) {
    logError("[GoogleFitService] Error setting enabled status", error);
  }
};

const getAggregateSteps = async (startTime: Date, endTime: Date): Promise<number> => {
  const hc = getHc();
  if (!hc) return 0;

  try {
    const result = await withTimeout(
      hc.aggregateRecord({
        recordType: "Steps",
        timeRangeFilter: {
          operator: "between",
          startTime: toIso(startTime),
          endTime: toIso(endTime),
        },
      }),
      AGGREGATE_TIMEOUT_MS,
      { COUNT_TOTAL: 0, dataOrigins: [] },
    );
    return Math.max(0, Math.floor(result.COUNT_TOTAL ?? 0));
  } catch (error) {
    logError("[GoogleFitService] Aggregate query error", error);
    return 0;
  }
};

/**
 * Sum step records clipped to the window — fixes Google Fit multi-day batches
 * that aggregateRecord can still over-count for "today".
 */
const getClippedStepsInWindow = async (startTime: Date, endTime: Date): Promise<number> => {
  const hc = getHc();
  if (!hc?.readRecords) return 0;

  let total = 0;
  let pageToken: string | undefined;

  try {
    do {
      const result = (await withTimeout(
        hc.readRecords("Steps", {
          timeRangeFilter: {
            operator: "between",
            startTime: toIso(startTime),
            endTime: toIso(endTime),
          },
          pageToken,
        }),
        AGGREGATE_TIMEOUT_MS,
        { records: [], pageToken: undefined },
      )) as { records?: StepsIntervalRecord[]; pageToken?: string };

      for (const record of result.records ?? []) {
        total += clipStepsRecordToWindow(record, startTime, endTime);
      }
      pageToken = result.pageToken;
    } while (pageToken);
  } catch (error) {
    logError("[GoogleFitService] Clipped readRecords error", error);
    return 0;
  }

  return Math.max(0, Math.floor(total));
};

const resolveDaySteps = async (
  dayStart: Date,
  options?: { pedometerHint?: number; isToday?: boolean },
): Promise<number> => {
  const now = new Date();
  const isToday = options?.isToday ?? dateKey(dayStart) === dateKey(now);
  const pedometerHint = Math.max(0, Math.floor(Number(options?.pedometerHint) || 0));

  const windowStart = dayStart;
  const windowEnd = isToday ? now : new Date(dayStart.getTime() + 86_400_000);
  const aggregateEnd = isToday
    ? new Date(dayStart.getTime() + 86_400_000)
    : new Date(dayStart.getTime() + 86_400_000);

  const [aggregateSteps, clippedSteps] = await Promise.all([
    getAggregateSteps(windowStart, aggregateEnd),
    getClippedStepsInWindow(windowStart, windowEnd),
  ]);

  let resolved = pickTrustworthyHealthDaySteps(aggregateSteps, clippedSteps);
  resolved = sanitizeHealthConnectTodaySteps(resolved, pedometerHint, {
    isToday,
    now,
  });

  if (
    aggregateSteps > 0 &&
    clippedSteps > 0 &&
    aggregateSteps > clippedSteps + 50 &&
    aggregateSteps > clippedSteps * 1.12
  ) {
    logError("[GoogleFitService] Rejected inflated HC aggregate (used clipped records)", {
      aggregateSteps,
      clippedSteps,
      resolved,
      pedometerHint,
    });
  }

  return resolved;
};

/**
 * Per-day totals via Health Connect aggregateRecord.
 * Prefer this over readRecords+sum: "between" returns overlapping multi-day
 * StepsRecords without clipping count to the query window (Google Fit batches
 * can span days and inflate "today").
 */
const fillStepsByDayViaAggregate = async (
  stepsByDate: Record<string, number>,
  today: Date,
  days: number,
): Promise<void> => {
  for (let batchStart = 0; batchStart < days; batchStart += 7) {
    const batchEnd = Math.min(batchStart + 7, days);
    await Promise.all(
      Array.from({ length: batchEnd - batchStart }, (_, offset) => {
        const dayIndex = batchStart + offset;
        const date = new Date(today.getTime() - dayIndex * 86400000);
        const dayStart = startOfDay(date);
        return resolveDaySteps(dayStart, {
          isToday: dayIndex === 0,
          pedometerHint: 0,
        }).then((steps) => {
          if (steps > 0) {
            stepsByDate[dateKey(date)] = Math.max(stepsByDate[dateKey(date)] ?? 0, steps);
          }
        });
      }),
    );
  }
};

const prefillDateRange = (_days: number): Record<string, number> => {
  return {};
};

export const GoogleFitService = {
  async initialize(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    if (isInitialized) return true;

    const hc = getHc();
    if (!hc) return false;

    try {
      const initialized = await hc.initialize();
      isInitialized = initialized;
      return initialized;
    } catch (error) {
      logError("[GoogleFitService] Initialization error", error);
      return false;
    }
  },

  async isHealthConnectAvailable(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    const hc = getHc();
    if (!hc) return false;

    if (!isInitialized) {
      await GoogleFitService.initialize();
    }

    try {
      const { SdkAvailabilityStatus } = hc;
      const status = await hc.getSdkStatus();
      return status === SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch (error) {
      logError("[GoogleFitService] Health Connect availability check failed", error);
      return false;
    }
  },

  async installHealthConnect(): Promise<void> {
    try {
      const hc = getHc();
      if (hc) {
        hc.openHealthConnectSettings();
        return;
      }
      await Linking.openURL(`market://details?id=${HEALTH_CONNECT_PACKAGE}`);
    } catch {
      await Linking.openURL(
        `https://play.google.com/store/apps/details?id=${HEALTH_CONNECT_PACKAGE}`,
      );
    }
  },

  async requestAuthorization(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    const initialized = await GoogleFitService.initialize();
    if (!initialized) return false;

    const hc = getHc();
    if (!hc) return false;

    try {
      const available = await GoogleFitService.isHealthConnectAvailable();
      if (!available) {
        await GoogleFitService.installHealthConnect();
        return false;
      }

      await hc.requestPermission([{ accessType: "read", recordType: "Steps" }]);
      const granted = await GoogleFitService.hasPermissions();
      if (granted) {
        hasPermissions = true;
        await setEnabled(true);
      }
      return granted;
    } catch (error) {
      logError("[GoogleFitService] Authorization error", error);
      return false;
    }
  },

  async checkHealthConnectStatus(): Promise<HealthConnectStatus> {
    if (Platform.OS !== "android") return HealthConnectStatus.notSupported;

    const hc = getHc();
    if (!hc) return HealthConnectStatus.notSupported;

    if (!isInitialized) {
      await GoogleFitService.initialize();
    }

    try {
      const { SdkAvailabilityStatus } = hc;
      const status = await hc.getSdkStatus();
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
        return HealthConnectStatus.notSupported;
      }
      if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return HealthConnectStatus.notInstalled;
      }

      const granted = await GoogleFitService.hasPermissions();
      return granted ? HealthConnectStatus.authorized : HealthConnectStatus.notAuthorized;
    } catch (error) {
      logError("[GoogleFitService] Status check error", error);
      return HealthConnectStatus.notSupported;
    }
  },

  async hasPermissions(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    const hc = getHc();
    if (!hc) return false;

    if (!isInitialized) {
      await GoogleFitService.initialize();
    }

    try {
      const granted = await hc.getGrantedPermissions();
      hasPermissions = granted.some(
        (permission) => permission.recordType === "Steps" && permission.accessType === "read",
      );
      return hasPermissions;
    } catch (error) {
      logError("[GoogleFitService] Permission check error", error);
      return false;
    }
  },

  async getTodaySteps(pedometerHint = 0): Promise<number> {
    const now = new Date();
    return GoogleFitService.getStepsForDate(startOfDay(now), pedometerHint);
  },

  async getStepsForDate(date: Date, pedometerHint = 0): Promise<number> {
    if (Platform.OS !== "android") return 0;

    if (!hasPermissions) {
      const granted = await GoogleFitService.hasPermissions();
      if (!granted) return 0;
    }

    const hc = getHc();
    if (!hc) return 0;

    const dayStart = startOfDay(date);

    try {
      const totalSteps = await resolveDaySteps(dayStart, {
        pedometerHint,
        isToday: dateKey(date) === dateKey(new Date()),
      });
      await updateLastSyncTime();
      return totalSteps;
    } catch (error) {
      logError("[GoogleFitService] Error fetching steps for date", error);
      return 0;
    }
  },

  async getWeeklySteps(): Promise<Record<string, number>> {
    const stepsByDate = prefillDateRange(7);
    if (Platform.OS !== "android") return stepsByDate;

    if (!hasPermissions) {
      const granted = await GoogleFitService.hasPermissions();
      if (!granted) return stepsByDate;
    }

    const hc = getHc();
    if (!hc) return stepsByDate;

    const today = startOfDay(new Date());

    try {
      await fillStepsByDayViaAggregate(stepsByDate, today, 7);
      await updateLastSyncTime();
      return stepsByDate;
    } catch (error) {
      logError("[GoogleFitService] Error fetching weekly steps", error);
      return stepsByDate;
    }
  },

  async getMonthlySteps(): Promise<Record<string, number>> {
    const stepsByDate = prefillDateRange(30);
    if (Platform.OS !== "android") return stepsByDate;

    if (!hasPermissions) {
      const granted = await GoogleFitService.hasPermissions();
      if (!granted) return stepsByDate;
    }

    const hc = getHc();
    if (!hc) return stepsByDate;

    const today = startOfDay(new Date());

    try {
      await fillStepsByDayViaAggregate(stepsByDate, today, 30);
      await updateLastSyncTime();
      return stepsByDate;
    } catch (error) {
      logError("[GoogleFitService] Error fetching monthly steps", error);
      return stepsByDate;
    }
  },

  async getWeeklyStats(): Promise<WeeklyStepStats> {
    const map = await GoogleFitService.getWeeklySteps();
    return buildWeeklyStepStats(map);
  },

  async getMonthlyStats(): Promise<MonthlyStepStats> {
    const map = await GoogleFitService.getMonthlySteps();
    return buildMonthlyStepStats(map);
  },

  /** ISO timestamp string (Redux-serializable), or null. */
  async getLastSyncTime(): Promise<string | null> {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      if (!timestamp) return null;
      const parsed = Number(timestamp);
      if (!Number.isFinite(parsed)) return null;
      return new Date(parsed).toISOString();
    } catch (error) {
      logError("[GoogleFitService] Error getting last sync time", error);
      return null;
    }
  },

  async isEnabled(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    try {
      return (await AsyncStorage.getItem(ENABLED_KEY)) === "true";
    } catch (error) {
      logError("[GoogleFitService] Error checking enabled status", error);
      return false;
    }
  },

  async disable(): Promise<void> {
    await setEnabled(false);
    hasPermissions = false;
  },

  async initializeIfEnabled(): Promise<boolean> {
    if (Platform.OS !== "android") return false;
    const enabled = await GoogleFitService.isEnabled();
    if (!enabled) return false;

    const initialized = await GoogleFitService.initialize();
    if (!initialized) return false;

    const status = await GoogleFitService.checkHealthConnectStatus();
    return status === HealthConnectStatus.authorized;
  },

  /** Soft-connect for reads — same fallback as syncTodaySteps when the enabled flag is unset. */
  async ensureReadyForRead(): Promise<boolean> {
    if (Platform.OS !== "android") return false;

    let ready = await GoogleFitService.initializeIfEnabled();
    if (ready) return true;

    const status = await GoogleFitService.checkHealthConnectStatus();
    if (status === HealthConnectStatus.authorized) {
      await setEnabled(true);
      return true;
    }
    if (status === HealthConnectStatus.notAuthorized) {
      await GoogleFitService.initialize();
      const granted = await GoogleFitService.hasPermissions();
      if (granted) {
        await setEnabled(true);
        return true;
      }
    }
    return false;
  },

  async requestAuthorizationFlow(): Promise<HealthConnectStatus> {
    if (Platform.OS !== "android") return HealthConnectStatus.notSupported;

    let status = await GoogleFitService.checkHealthConnectStatus();
    if (status === HealthConnectStatus.notInstalled) {
      await GoogleFitService.installHealthConnect();
      return status;
    }
    if (status === HealthConnectStatus.authorized) {
      await setEnabled(true);
      return status;
    }

    await GoogleFitService.requestAuthorization();
    status = await GoogleFitService.checkHealthConnectStatus();
    if (status === HealthConnectStatus.authorized) {
      await setEnabled(true);
    }
    return status;
  },

  async syncTodaySteps(currentSteps: number): Promise<number> {
    if (Platform.OS !== "android") return currentSteps;

    try {
      const ready = await GoogleFitService.ensureReadyForRead();
      if (!ready) return currentSteps;

      const googleFitSteps = await GoogleFitService.getTodaySteps(currentSteps);
      const merged = mergePedometerWithHealthSteps(currentSteps, googleFitSteps);
      return merged.steps;
    } catch (error) {
      logError("[GoogleFitService] Sync error", error);
      return currentSteps;
    }
  },

  /**
   * Reconcile STRON pedometer total with Health Connect.
   * |ped − HC| ≤ 50 → pedometer; |ped − HC| > 50 → Google Fit / HC.
   */
  async reconcileTodaySteps(currentSteps: number): Promise<{
    steps: number;
    corrected: boolean;
    hcSteps: number;
  }> {
    const current = Math.max(0, Math.floor(Number(currentSteps) || 0));
    if (Platform.OS !== "android") {
      return { steps: current, corrected: false, hcSteps: 0 };
    }

    try {
      const ready = await GoogleFitService.ensureReadyForRead();
      if (!ready) {
        return { steps: current, corrected: false, hcSteps: 0 };
      }

      const hcSteps = Math.max(
        0,
        Math.floor(Number(await GoogleFitService.getTodaySteps(current)) || 0),
      );
      const merged = mergePedometerWithHealthSteps(current, hcSteps);
      return { steps: merged.steps, corrected: merged.corrected, hcSteps };
    } catch (error) {
      logError("[GoogleFitService] Reconcile error", error);
      return { steps: current, corrected: false, hcSteps: 0 };
    }
  },
};

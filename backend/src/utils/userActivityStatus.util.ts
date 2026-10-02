import moment from "moment-timezone";
import { DailyActivity as DailyActivityModel } from "../features/daily-reset/index.js";
import { UserModel } from "../features/identity-auth/index.js";
import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../services/analytics.service.js";

export const INACTIVE_STEP_THRESHOLD = 500;
export const INACTIVE_LOOKBACK_DAYS = 7;

type HistoryEntry = { date?: Date; stepCount?: number };

export const getSevenDayStepTotal = async (
  uid: string,
  todaysStepCount: number | string = 0,
) => {
  const nowIST = moment.tz("Asia/Kolkata");
  const todayKey = nowIST.format("YYYY-MM-DD");
  const dayKeys = new Set<string>();

  for (let i = 0; i < INACTIVE_LOOKBACK_DAYS; i++) {
    dayKeys.add(nowIST.clone().subtract(i, "days").format("YYYY-MM-DD"));
  }

  const activity = await DailyActivityModel.findOne({ uid }).lean();
  const history: HistoryEntry[] = Array.isArray(activity?.history)
    ? [...activity.history]
    : [];

  let total = Number(todaysStepCount) || 0;
  let historyIncludesToday = false;

  for (const entry of history) {
    const entryDay = moment(entry.date).tz("Asia/Kolkata").format("YYYY-MM-DD");
    if (!dayKeys.has(entryDay)) continue;
    if (entryDay === todayKey) {
      // Prefer live todaysStepCount over a premature history row for today.
      historyIncludesToday = true;
      continue;
    }
    total += Number(entry.stepCount) || 0;
  }

  // If today was not passed in (or is 0) but history already has today, use history once.
  if (!todaysStepCount && historyIncludesToday) {
    const todayEntry = history.find(
      (entry) =>
        entry?.date &&
        moment(entry.date).tz("Asia/Kolkata").format("YYYY-MM-DD") === todayKey,
    );
    if (todayEntry) {
      total += Number(todayEntry.stepCount) || 0;
    }
  }

  return total;
};

export const isUserInactiveBySteps = (sevenDayTotal: number) =>
  sevenDayTotal < INACTIVE_STEP_THRESHOLD;

export const processUserActivityStatus = async (
  uid: string,
  todaysStepCount: number | string = 0,
) => {
  const user = await UserModel.findOne({ uid }).select("isAnalyticsInactive");
  if (!user) return;

  const sevenDayTotal = await getSevenDayStepTotal(uid, todaysStepCount);
  const shouldBeInactive = isUserInactiveBySteps(sevenDayTotal);
  const wasInactive = user.isAnalyticsInactive === true;

  if (!wasInactive && shouldBeInactive) {
    trackEvent(ANALYTICS_EVENTS.BECAME_INACTIVE, {
      user_id: uid,
      seven_day_steps: sevenDayTotal,
    });
    user.isAnalyticsInactive = true;
    await user.save();
    return;
  }

  if (wasInactive && !shouldBeInactive) {
    trackEvent(ANALYTICS_EVENTS.BECAME_ACTIVE_AGAIN, {
      user_id: uid,
      seven_day_steps: sevenDayTotal,
      step_count: todaysStepCount,
    });
    user.isAnalyticsInactive = false;
    await user.save();
  }
};

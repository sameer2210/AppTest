import type { ActivityHistoryItem } from "@/models/activity";
import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";
export type ActivityChartTab = "WEEK" | "MONTH" | "YEAR";

export type ActivityDayEntry = {
  key: string;
  steps: number;
  /** YYYY-MM-DD for matching live today steps */
  dateKey?: string;
  isToday?: boolean;
  isFuture?: boolean;
};

export const WEEKDAY_LABELS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

export const STEP_GOAL_OPTIONS = [
  "1000",
  "3000",
  "6000",
  "10000",
  "15000",
  "20000",
  "25000",
  "30000",
  "40000",
  "50000",
] as const;

export const getStartOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? 6 : day - 1;
  copy.setDate(copy.getDate() - diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

export const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isCurrentWeekStart = (startOfWeek: Date) =>
  isSameDay(startOfWeek, getStartOfWeek(new Date()));

export const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const formatWeekRangeLabel = (startOfWeek: Date) => {
  const end = new Date(startOfWeek);
  end.setDate(end.getDate() + 6);
  const startMonth = startOfWeek.toLocaleDateString("en-US", { month: "long" });
  const endMonth = end.toLocaleDateString("en-US", { month: "long" });

  if (
    startOfWeek.getMonth() === end.getMonth() &&
    startOfWeek.getFullYear() === end.getFullYear()
  ) {
    return `${startOfWeek.getDate()}-${end.getDate()} ${endMonth}`;
  }
  return `${startOfWeek.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
};

export const formatMonthLabel = (month: Date) => {
  const now = new Date();
  if (month.getFullYear() === now.getFullYear()) {
    return month.toLocaleDateString("en-US", { month: "long" });
  }
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

export const formatYearLabel = (year: Date) => String(year.getFullYear());

export const getStepBarColor = (steps: number) => {
  if (steps < 5000) return "#FFFFFF";
  if (steps < 10000) return "#FFE79A";
  return "#FFD341";
};

export const getStepCellColor = (steps: number) => {
  if (steps === 0) return "rgba(255,255,255,0.12)";
  return getStepBarColor(steps);
};

export const buildActivityHistoryMap = (history: ActivityHistoryItem[]) => {
  const map: Record<string, number> = {};
  history.forEach((item) => {
    // Prefer bare YYYY-MM-DD (avoids UTC day-shift). Fall back to Date parse.
    const bare = typeof item.date === "string" ? item.date.trim().slice(0, 10) : "";
    const key = /^\d{4}-\d{2}-\d{2}$/.test(bare)
      ? bare
      : (() => {
          const parsed = new Date(item.date);
          return Number.isNaN(parsed.getTime()) ? null : formatDateKey(parsed);
        })();
    if (!key) return;
    const steps = sanitizeDailySteps(item.stepCount ?? 0);
    // Ignore since-boot leaks in archived history
    if (Math.floor(item.stepCount ?? 0) > MAX_DAILY_STEPS) return;
    map[key] = Math.max(map[key] ?? 0, steps);
  });
  return map;
};

export const localTodayKey = () => formatDateKey(new Date());

const startOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const resolveDaySteps = (
  date: Date,
  historyMap: Record<string, number>,
  liveTodaySteps: number,
): number => {
  const dateKey = formatDateKey(date);
  const todayKey = localTodayKey();
  const todayStart = startOfDay(new Date());
  const dayStart = startOfDay(date);

  if (dayStart > todayStart) {
    return 0;
  }

  const historySteps = sanitizeDailySteps(historyMap[dateKey] ?? 0);

  if (dateKey === todayKey) {
    return Math.max(historySteps, sanitizeDailySteps(liveTodaySteps));
  }

  return historySteps;
};

export const buildWeekChartData = (
  startOfWeek: Date,
  historyMap: Record<string, number>,
  liveTodaySteps: number,
): ActivityDayEntry[] => {
  const todayKey = localTodayKey();
  const todayStart = startOfDay(new Date());

  return WEEKDAY_LABELS.map((label, index) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + index);
    const dateKey = formatDateKey(date);
    const dayStart = startOfDay(date);

    return {
      key: label,
      dateKey,
      isToday: dateKey === todayKey,
      isFuture: dayStart > todayStart,
      steps: resolveDaySteps(date, historyMap, liveTodaySteps),
    };
  });
};

export const buildMonthChartData = (
  month: Date,
  historyMap: Record<string, number>,
  liveTodaySteps: number,
): ActivityDayEntry[] => {
  const todayKey = localTodayKey();
  const todayStart = startOfDay(new Date());
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();

  return Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    const dateKey = formatDateKey(date);
    const dayStart = startOfDay(date);

    return {
      key: String(day),
      dateKey,
      isToday: dateKey === todayKey,
      isFuture: dayStart > todayStart,
      steps: resolveDaySteps(date, historyMap, liveTodaySteps),
    };
  });
};

export type YearMonthGrid = {
  monthIndex: number;
  monthLabel: string;
  days: Record<number, number>;
};

export const buildYearChartData = (
  year: Date,
  historyMap: Record<string, number>,
  liveTodaySteps: number,
): YearMonthGrid[] => {
  return Array.from({ length: 12 }, (_, index) => {
    const monthIndex = index + 1;
    const monthDate = new Date(year.getFullYear(), index, 1);
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
    const lastDay = new Date(year.getFullYear(), monthIndex, 0).getDate();
    const days: Record<number, number> = {};

    for (let day = 1; day <= lastDay; day += 1) {
      const date = new Date(year.getFullYear(), index, day);
      days[day] = resolveDaySteps(date, historyMap, liveTodaySteps);
    }

    return { monthIndex, monthLabel, days };
  });
};

export const canGoNextPeriod = (tab: ActivityChartTab, anchor: Date) => {
  const now = new Date();
  if (tab === "WEEK") {
    return !isCurrentWeekStart(anchor);
  }
  if (tab === "MONTH") {
    const nextMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1);
    return nextMonth < new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  return anchor.getFullYear() < now.getFullYear();
};

export const shiftPeriod = (tab: ActivityChartTab, anchor: Date, direction: -1 | 1) => {
  if (tab === "WEEK") {
    const next = new Date(anchor);
    next.setDate(next.getDate() + direction * 7);
    return next;
  }
  if (tab === "MONTH") {
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  }
  return new Date(anchor.getFullYear() + direction, 0, 1);
};

export const formatStepsCount = (steps: number) =>
  steps.toLocaleString("en-US", { maximumFractionDigits: 0 });

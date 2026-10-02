/** ISO date strings keep Redux actions serializable. */
export type DailyStepData = {
  date: string;
  steps: number;
  source: "pedometer" | "google_fit" | "merged";
};

export type WeeklyStepStats = {
  dailyData: DailyStepData[];
  totalSteps: number;
  averageSteps: number;
  weekStart: string;
  weekEnd: string;
};

export type MonthlyStepStats = {
  dailyData: DailyStepData[];
  totalSteps: number;
  averageSteps: number;
  monthStart: string;
  monthEnd: string;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const toDateKey = (date: Date) => date.toISOString().split("T")[0];

export const buildWeeklyStepStats = (
  stepsMap: Record<string, number>,
  source: DailyStepData["source"] = "google_fit",
): WeeklyStepStats => {
  const dates = Object.keys(stepsMap)
    .sort()
    .map((key) => startOfDay(new Date(`${key}T00:00:00`)));

  if (dates.length === 0) {
    const today = startOfDay(new Date());
    const weekStart = new Date(today.getTime() - 6 * 86400000);
    return {
      dailyData: [],
      totalSteps: 0,
      averageSteps: 0,
      weekStart: weekStart.toISOString(),
      weekEnd: today.toISOString(),
    };
  }

  const dailyData = dates.map((date) => ({
    date: date.toISOString(),
    steps: stepsMap[toDateKey(date)] ?? 0,
    source,
  }));
  const totalSteps = dailyData.reduce((sum, item) => sum + item.steps, 0);

  return {
    dailyData,
    totalSteps,
    averageSteps: dailyData.length ? totalSteps / dailyData.length : 0,
    weekStart: dailyData[0].date,
    weekEnd: dailyData[dailyData.length - 1].date,
  };
};

export const buildMonthlyStepStats = (
  stepsMap: Record<string, number>,
  source: DailyStepData["source"] = "google_fit",
): MonthlyStepStats => {
  const dates = Object.keys(stepsMap)
    .sort()
    .map((key) => startOfDay(new Date(`${key}T00:00:00`)));

  if (dates.length === 0) {
    const today = startOfDay(new Date());
    const monthStart = new Date(today.getTime() - 29 * 86400000);
    return {
      dailyData: [],
      totalSteps: 0,
      averageSteps: 0,
      monthStart: monthStart.toISOString(),
      monthEnd: today.toISOString(),
    };
  }

  const dailyData = dates.map((date) => ({
    date: date.toISOString(),
    steps: stepsMap[toDateKey(date)] ?? 0,
    source,
  }));
  const totalSteps = dailyData.reduce((sum, item) => sum + item.steps, 0);

  return {
    dailyData,
    totalSteps,
    averageSteps: dailyData.length ? totalSteps / dailyData.length : 0,
    monthStart: dailyData[0].date,
    monthEnd: dailyData[dailyData.length - 1].date,
  };
};

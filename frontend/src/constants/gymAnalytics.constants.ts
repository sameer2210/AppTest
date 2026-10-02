import type {
  AttendanceDayData,
  ActiveMemberMonthData,
  MonthlyMetricData,
  PeakHourSlot,
} from "@/types/gym/analytics.types";

export const ANALYTICS_MONTH_NAMES = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

export const ANALYTICS_FULL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const ANALYTICS_DAY_NAMES_SHORT = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

export const ANALYTICS_DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const ANALYTICS_MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export const STATIC_HOURLY_SLOTS: PeakHourSlot[] = [
  { hour: 0, hourLabel: "00:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 2, hourLabel: "02:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 4, hourLabel: "04:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 6, hourLabel: "06:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 8, hourLabel: "08:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 10, hourLabel: "10:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 12, hourLabel: "12:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 14, hourLabel: "14:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 16, hourLabel: "16:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 18, hourLabel: "18:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 20, hourLabel: "20:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 22, hourLabel: "22:00", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
  { hour: 23, hourLabel: "23:59", intensity: 0, memberCount: 0, loadLabel: "Quiet (0%)" },
];

export const createStatic12Months = (year: string): MonthlyMetricData[] =>
  ANALYTICS_MONTH_NAMES.map((name, index) => ({
    month: name,
    monthIndex: index,
    monthFull: ANALYTICS_FULL_MONTHS[index],
    year,
    value: 0,
    formattedValue: "₹0",
    transactions: 0,
    manualTransactions: 0,
    onlineTransactions: 0,
  }));

export const createStaticActiveMemberMonths = (): ActiveMemberMonthData[] =>
  ANALYTICS_MONTH_NAMES.map((name, index) => ({
    month: name,
    monthIndex: index,
    monthFull: ANALYTICS_FULL_MONTHS[index],
    count: 0,
    newJoiners: 0,
    renewals: 0,
  }));

export const createStatic7Days = (): AttendanceDayData[] => {
  const now = new Date();
  const days: AttendanceDayData[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const dateStr = d.toISOString().split("T")[0];
    days.push({
      dayLabel: ANALYTICS_DAY_NAMES_FULL[dayOfWeek],
      dayShort: ANALYTICS_DAY_NAMES_SHORT[dayOfWeek],
      count: 0,
      maxCount: 50,
      date: dateStr,
      formattedDate: `${d.getDate()} ${ANALYTICS_MONTH_SHORT[d.getMonth()]}`,
    });
  }
  return days;
};

import {
  DAY_NAMES_FULL,
  DAY_NAMES_SHORT,
  FULL_MONTH_NAMES,
  MONTH_NAMES,
} from "./common.constants.js";

export const STATIC_HOURLY_SLOTS = [
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

export const createStatic12RevenueMonths = (year: string | number) =>
  MONTH_NAMES.map((name, index) => ({
    month: name,
    monthIndex: index,
    monthFull: FULL_MONTH_NAMES[index],
    year: String(year),
    value: 0,
    formattedValue: "₹0",
    transactions: 0,
    manualTransactions: 0,
    onlineTransactions: 0,
  }));

export const createStatic12MemberMonths = () =>
  MONTH_NAMES.map((name, index) => ({
    month: name,
    monthIndex: index,
    monthFull: FULL_MONTH_NAMES[index],
    count: 0,
    newJoiners: 0,
    renewals: 0,
  }));

export const createStatic7Days = () => {
  const now = new Date();
  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayOfWeek = d.getDay();
    const dateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
    days.push({
      dayLabel: DAY_NAMES_FULL[dayOfWeek],
      dayShort: DAY_NAMES_SHORT[dayOfWeek],
      count: 0,
      maxCount: 50,
      date: dateStr,
      formattedDate: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`,
    });
  }
  return days;
};

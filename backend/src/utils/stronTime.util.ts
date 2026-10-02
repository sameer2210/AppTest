// IST time helpers shared across the STRON Managed Events module.
// Everything in this feature is anchored to Asia/Kolkata to match the rest of the app.

import moment from "moment-timezone";
import { STRON_TZ } from "../config/stronConfig.js";

export const istMoment = (date: Date | string = new Date()) => moment(date).tz(STRON_TZ);

// Calendar day key used to scope daily matches/groups, e.g. "2026-07-09".
export const dayKey = (date = new Date()) => istMoment(date).format("YYYY-MM-DD");

// ISO week key used to roll Face Off daily wins into a weekly champion, e.g. "2026-28".
export const weekKey = (date = new Date()) => istMoment(date).format("GGGG-WW");

// Normalize a date to the start of its IST day (00:00:00), the default event clock.
export const startOfIstDay = (date = new Date()) =>
  istMoment(date).startOf("day").toDate();

// Event start time: default 00:00:01 AM IST on event start date.
export const startOfEventDay = (date = new Date()) =>
  istMoment(date).startOf("day").add(1, "second").toDate();

// Parse a client-supplied date and snap it to 00:00:01 AM IST.
export const parseIstEventStart = (value: unknown) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = moment.tz(value, STRON_TZ);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.startOf("day").add(1, "second").toDate();
};

// Event end time: default 11:59:59 PM IST on event end date (start date + duration days).
export const endOfEventDay = (startDate: Date | string, durationDays: number) =>
  istMoment(startDate).add(durationDays, "days").endOf("day").toDate();

// Parse a client-supplied date and snap it to 11:59:59 PM IST.
export const parseIstEventEnd = (value: unknown) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = moment.tz(value, STRON_TZ);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.endOf("day").toDate();
};

// Parse a client-supplied date and snap it to the start of the IST day.
// Returns null when the input is missing or unparseable.
export const parseIstDayStart = (value: unknown) => {
  if (value == null || value === "") {
    return null;
  }
  const parsed = moment.tz(value, STRON_TZ);
  if (!parsed.isValid()) {
    return null;
  }
  return parsed.startOf("day").toDate();
};

// Convert a "YYYY-MM-DD" IST day key back to the Date at that day's 00:00 IST.
export const istDayStartFromKey = (key: string) =>
  moment.tz(key, "YYYY-MM-DD", STRON_TZ).startOf("day").toDate();

// Add whole days to an IST date, keeping the 00:00 anchor.
export const addIstDays = (date: Date | string, days: number) =>
  istMoment(date).add(days, "days").startOf("day").toDate();

// Fraction (0..1) of the current IST day that has elapsed, quantized to whole minutes
// (1440 ticks/day) so bot progress advances once per minute at constant speed.
export const fractionOfIstDayElapsed = (date = new Date()) => {
  const now = istMoment(date);
  const start = now.clone().startOf("day");
  const elapsedMinutes = Math.floor(now.diff(start, "seconds") / 60);
  return Math.min(1, Math.max(0, elapsedMinutes / 1440));
};

// Fraction of a specific IST calendar day elapsed at `date`, quantized to minutes.
// Returns 1 when `date` is at or after that day's end (next midnight IST).
export const fractionOfIstDayElapsedForKey = (
  dayKeyValue: string | null,
  date: Date = new Date(),
) => {
  if (!dayKeyValue) {
    return fractionOfIstDayElapsed(date);
  }
  const now = istMoment(date);
  const start = moment.tz(dayKeyValue, "YYYY-MM-DD", STRON_TZ).startOf("day");
  const end = start.clone().add(1, "day");
  if (!now.isBefore(end)) {
    return 1;
  }
  if (now.isBefore(start)) {
    return 0;
  }
  const elapsedMinutes = Math.floor(now.diff(start, "seconds") / 60);
  return Math.min(1, Math.max(0, elapsedMinutes / 1440));
};

// Add business days (skipping Sat/Sun) for settlement expected-by dates.
export const addBusinessDays = (date: Date | string, businessDays: number) => {
  const cursor = istMoment(date);
  let remaining = businessDays;
  while (remaining > 0) {
    cursor.add(1, "day");
    const weekday = cursor.isoWeekday(); // 6 = Sat, 7 = Sun
    if (weekday < 6) {
      remaining -= 1;
    }
  }
  return cursor.toDate();
};

import moment from "moment-timezone";
import {
  WHATSAPP_DEFAULT_TIMEZONE,
  WHATSAPP_REMINDER_SEND_HOUR,
} from "../constants/whatsapp.constants.js";

export const whatsappDayKey = (
  date: Date = new Date(),
  timezone = WHATSAPP_DEFAULT_TIMEZONE,
) => moment.tz(date, timezone).format("YYYY-MM-DD");

export const reminderScheduledAt = (
  dayOffset: number,
  timezone = WHATSAPP_DEFAULT_TIMEZONE,
  from: Date = new Date(),
) => {
  const target = moment
    .tz(from, timezone)
    .add(dayOffset, "days")
    .hour(WHATSAPP_REMINDER_SEND_HOUR)
    .minute(0)
    .second(0)
    .millisecond(0);
  if (target.valueOf() <= Date.now()) return new Date();
  return target.toDate();
};

export const delayMsUntil = (scheduledAt: Date) => Math.max(0, scheduledAt.getTime() - Date.now());

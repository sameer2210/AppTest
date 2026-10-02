import type { ServiceParams } from "../types/service.util.js";

export const DEFAULT_EVENT_TIME = "12:00 PM";

export const resolveEventTime = (time: unknown) => {
  const trimmed = String(time ?? "").trim();
  return trimmed || DEFAULT_EVENT_TIME;
};

export const applyEventTimeDefault = (payload: ServiceParams = {}) => {
  if (!Object.prototype.hasOwnProperty.call(payload, "time")) {
    return payload;
  }

  return {
    ...payload,
    time: resolveEventTime(payload.time),
  };
};

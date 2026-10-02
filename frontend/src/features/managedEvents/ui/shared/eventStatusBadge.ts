/** Shared hero capsule labels + colors for participant / organizer event screens. */

export type EventStatusBadgeTone =
  "danger" | "warning" | "completed" | "closed" | "live" | "started" | "default";

export type EventStatusBadge = {
  text: string;
  tone: EventStatusBadgeTone;
  textColor: string;
};

const TONE_COLOR: Record<EventStatusBadgeTone, string> = {
  danger: "#E53935",
  warning: "#FF9800",
  completed: "#000000",
  closed: "#FF9800",
  live: "#2DE441",
  started: "#2DE441",
  default: "#000000",
};

const startOfDay = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

export const parseEventEndMs = (dateStr?: string | null): number | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return null;
  if (d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0) {
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }
  return ms;
};

/** Day N/M for multi-day duels while live. */
export const duelDayBadge = (opts: {
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}): string | null => {
  if (opts.status !== "live") return null;
  const start = startOfDay(opts.startDate);
  const end = startOfDay(opts.endDate || opts.startDate);
  if (!start || !end) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ms = 24 * 60 * 60 * 1000;
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / ms) + 1);
  const current = Math.min(
    total,
    Math.max(1, Math.round((today.getTime() - start.getTime()) / ms) + 1),
  );
  return `Day ${current}/${total}`;
};

type ResolveOpts = {
  status?: string | null;
  soldOut?: boolean;
  /** Registration window ended or capacity 0 (not event ended). */
  registrationClosed?: boolean;
  format?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  /** Prefer Day N/M for KotH / Face Off while live. */
  useDuelDayLabel?: boolean;
  /** Organizer wording: Live / Start Soon instead of Started / Upcoming. */
  organizerStyle?: boolean;
};

/**
 * Capsule priority:
 * Cancelled → Completed → Live/Started (or Day N/M) → Sold Out → Closed → Upcoming
 */
export const resolveEventStatusBadge = (opts: ResolveOpts): EventStatusBadge => {
  const status = opts.status || "";
  const now = Date.now();
  const startMs = opts.startDate ? new Date(opts.startDate).getTime() : NaN;
  const endMs = parseEventEndMs(opts.endDate);

  const isCancelled = status === "cancelled";
  const isCompleted =
    status === "completed" ||
    status === "settled" ||
    (!isCancelled && endMs != null && now > endMs);
  const isLiveBackend = status === "live" || status === "started" || status === "in_progress";
  const isEffectivelyLive =
    !isCancelled && !isCompleted && (isLiveBackend || (Number.isFinite(startMs) && now >= startMs));

  if (isCancelled) {
    return { text: "Cancelled", tone: "danger", textColor: TONE_COLOR.danger };
  }
  if (isCompleted) {
    return { text: "Completed", tone: "completed", textColor: TONE_COLOR.completed };
  }
  if (isEffectivelyLive) {
    if (opts.useDuelDayLabel) {
      const day = duelDayBadge({
        status: "live",
        startDate: opts.startDate,
        endDate: opts.endDate,
      });
      if (day) {
        return { text: day, tone: "live", textColor: TONE_COLOR.live };
      }
    }
    if (opts.organizerStyle) {
      return { text: "Live", tone: "live", textColor: TONE_COLOR.live };
    }
    return { text: "Started", tone: "started", textColor: TONE_COLOR.started };
  }
  if (opts.soldOut) {
    return { text: "Sold Out", tone: "warning", textColor: TONE_COLOR.warning };
  }
  if (opts.registrationClosed) {
    return { text: "Closed", tone: "closed", textColor: TONE_COLOR.closed };
  }
  if (opts.organizerStyle) {
    return { text: "Start Soon", tone: "default", textColor: TONE_COLOR.default };
  }
  return { text: "Upcoming", tone: "default", textColor: TONE_COLOR.default };
};

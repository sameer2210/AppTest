/** Shared date/count formatters for organizer + participant managed-event UI. */

import { stripFreeTicketMarker } from "@/utils/stronFreeTicket";

export const formatDayMonth = (iso?: string | null) => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
};

const parseIsoDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const shortMonthLabel = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "short" }).replace(/\.$/, "");

export type CompactEventDateRange =
  { variant: "text"; label: string } | { variant: "bridge"; startLabel: string; endLabel: string };

/**
 * Compact event date range for tight overview cards.
 * - Same day: `11 Aug`
 * - Same month: `11-18 Aug`
 * - Different months: bridge parts for a stacked `11 Aug → 18 Sep` UI
 */
export const formatCompactEventDateRange = (
  startIso?: string | null,
  endIso?: string | null,
): CompactEventDateRange => {
  const start = parseIsoDate(startIso);
  if (!start) return { variant: "text", label: "TBD" };
  const end = parseIsoDate(endIso) || start;

  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = start.getMonth();
  const endMonth = end.getMonth();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startDay === endDay && startMonth === endMonth && startYear === endYear) {
    return { variant: "text", label: `${startDay} ${shortMonthLabel(start)}` };
  }

  if (startMonth === endMonth && startYear === endYear) {
    return {
      variant: "text",
      label: `${startDay}-${endDay} ${shortMonthLabel(start)}`,
    };
  }

  const withYear = startYear !== endYear;
  const startLabel = withYear
    ? `${startDay} ${shortMonthLabel(start)} '${String(startYear).slice(-2)}`
    : `${startDay} ${shortMonthLabel(start)}`;
  const endLabel = withYear
    ? `${endDay} ${shortMonthLabel(end)} '${String(endYear).slice(-2)}`
    : `${endDay} ${shortMonthLabel(end)}`;

  return { variant: "bridge", startLabel, endLabel };
};

export const formatTime = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatCount = (n: number) => {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return String(n);
};

export const formatTicketBenefits = (ticket: {
  label?: string;
  distanceKm?: number | null;
  days?: number | null;
  benefits?: string | null;
  dailyStepTarget?: number | null;
}) => {
  const cleanedBenefits = stripFreeTicketMarker(ticket.benefits);
  if (cleanedBenefits) return cleanedBenefits;
  const parts: string[] = [];
  if (ticket.dailyStepTarget) {
    parts.push(`${ticket.dailyStepTarget.toLocaleString("en-IN")} steps/day`);
  }
  if (ticket.distanceKm) parts.push(`${ticket.distanceKm} km`);
  if (ticket.days) parts.push(`${ticket.days} days`);
  if (ticket.label) parts.push(ticket.label);
  if (!parts.length) return "Certificates, Bib Numbers, Refreshments";
  return parts.join(" · ");
};

export const formatKingSeconds = (seconds?: number | null) => {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
};

export const formatLabelForEvent = (format?: string | null) => {
  switch (format) {
    case "virtual_step_challenge":
      return "Step Challenge";
    case "king_of_the_hill":
      return "King of the Hill";
    case "face_off":
      return "Face-Off";
    case "marathon":
    default:
      return "Running Event";
  }
};

/** Format race duration like screenshot: `01h 50m`. */
export const formatFinishDuration = (totalSeconds?: number | null) => {
  const sec = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
};

/** Remaining time until event endDate (e.g. `5 Days` / `04:23:06`). */
export const formatTimeLeftLabel = (endDate?: string | null) => {
  if (!endDate) return null;
  const endMs = new Date(endDate).getTime();
  if (!Number.isFinite(endMs)) return null;
  const left = endMs - Date.now();
  if (left <= 0) return "Ended";
  const days = Math.floor(left / (24 * 60 * 60 * 1000));
  if (days >= 1) return `${days} Day${days === 1 ? "" : "s"}`;
  const hours = Math.floor(left / (60 * 60 * 1000));
  const mins = Math.floor((left % (60 * 60 * 1000)) / (60 * 1000));
  const secs = Math.floor((left % (60 * 1000)) / 1000);
  if (hours >= 1) {
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const formatCleanKm = (steps: number, isTarget = false): string => {
  if (!steps || steps <= 0) return isTarget ? "0" : "0.0";
  const rawKm = steps / 1312.3356;
  if (isTarget) {
    const roundedInt = Math.round(rawKm);
    if (Math.abs(rawKm - roundedInt) < 0.25) return String(roundedInt);
    if (Math.abs(rawKm - 21.1) < 0.3) return "21.1";
    if (Math.abs(rawKm - 42.2) < 0.3) return "42.2";
    return rawKm.toFixed(1);
  }
  const roundedInt = Math.round(rawKm);
  if (Math.abs(rawKm - roundedInt) < 0.05) return String(roundedInt);
  return rawKm.toFixed(1);
};

export const formatEventProgressData = (item: {
  format?: string | null;
  progressLabel?: string | null;
  coveredSteps?: number | null;
  targetSteps?: number | null;
  successfulDays?: number | null;
  requiredDays?: number | null;
  totalKingSeconds?: number | null;
  totalWins?: number | null;
  date?: string | null;
}) => {
  if (item.format === "marathon" || item.format === "face_off") {
    if (item.coveredSteps != null || item.targetSteps != null) {
      const coveredKm = formatCleanKm(item.coveredSteps || 0, false);
      if (item.targetSteps && item.targetSteps > 0) {
        const targetKm = formatCleanKm(item.targetSteps, true);
        return `${coveredKm} / ${targetKm} km`;
      }
      return `${coveredKm} km`;
    }
    if (item.progressLabel) {
      if (item.progressLabel.includes("steps")) {
        const matches = item.progressLabel.match(/\d[\d,.]*/g);
        if (matches && matches.length >= 2) {
          const cSteps = parseFloat(matches[0].replace(/,/g, ""));
          const tSteps = parseFloat(matches[1].replace(/,/g, ""));
          if (!isNaN(cSteps) && !isNaN(tSteps)) {
            return `${formatCleanKm(cSteps, false)} / ${formatCleanKm(tSteps, true)} km`;
          }
        } else if (matches && matches.length === 1) {
          const cSteps = parseFloat(matches[0].replace(/,/g, ""));
          if (!isNaN(cSteps)) {
            return `${formatCleanKm(cSteps, false)} km`;
          }
        }
      }
      return item.progressLabel;
    }
    return "0.0 km";
  }

  if (item.format === "virtual_step_challenge") {
    if (item.coveredSteps != null && item.coveredSteps > 0) {
      const formattedSteps = `${item.coveredSteps.toLocaleString("en-IN")} steps`;
      if (item.successfulDays != null) {
        return `${item.successfulDays} Day${item.successfulDays === 1 ? "" : "s"} Met · ${formattedSteps}`;
      }
      return formattedSteps;
    }
    if (item.progressLabel) return item.progressLabel;
    return item.date || "0 steps";
  }

  if (item.format === "king_of_the_hill") {
    if (item.totalKingSeconds != null) {
      const days = Math.floor(item.totalKingSeconds / (24 * 3600));
      return `${days} day${days === 1 ? "" : "s"} as King`;
    }
    if (item.successfulDays != null) {
      return `${item.successfulDays} day${item.successfulDays === 1 ? "" : "s"} as King`;
    }
    if (item.progressLabel) {
      if (item.progressLabel.includes("King time")) {
        const parts = item.progressLabel.split(" ");
        const timeStr = parts[parts.length - 1];
        const [h] = timeStr.split(":").map(Number);
        if (!isNaN(h)) {
          const days = Math.floor(h / 24);
          return `${days} day${days === 1 ? "" : "s"} as King`;
        }
      }
      return item.progressLabel;
    }
    return "0 days as King";
  }

  return item.progressLabel || item.date || "";
};

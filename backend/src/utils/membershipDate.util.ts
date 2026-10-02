/**
 * Shared date utility for membership duration calculations.
 * Extracted here to break the circular import between membership.service.js ↔ payment.service.js.
 *
 * @param {Date|string} startDate
 * @param {number} duration
 * @param {string} durationUnit  'DAYS' | 'MONTHS' | 'YEARS'
 * @returns {Date|null}
 */
export const calculateEndDate = (
  startDate: Date | string | null | undefined,
  duration: number | string | null | undefined,
  durationUnit: string | null | undefined,
) => {
  if (!startDate) return null;
  const date = new Date(startDate);
  if (isNaN(date.getTime())) return null;
  const dur = Number(duration) || 1;
  const unit = (durationUnit || "MONTHS").toUpperCase();

  if (unit === "DAYS") {
    date.setDate(date.getDate() + dur);
  } else if (unit === "YEARS") {
    date.setFullYear(date.getFullYear() + dur);
  } else {
    // Default: MONTHS
    date.setMonth(date.getMonth() + dur);
  }
  return date;
};

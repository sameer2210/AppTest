/** Device-local calendar day key (YYYY-MM-DD). */
export const localDateKey = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split("-").map((part) => parseInt(part, 10));
  return new Date(y, (m || 1) - 1, d || 1);
};

export const addDaysToDateKey = (key: string, delta: number): string => {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + delta);
  return localDateKey(d);
};

/** Inclusive range of YYYY-MM-DD keys from `fromKey` through `toKey`. */
export const enumerateDateKeys = (fromKey: string, toKey: string): string[] => {
  if (!fromKey || !toKey || fromKey > toKey) return [];
  const keys: string[] = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    keys.push(cursor);
    cursor = addDaysToDateKey(cursor, 1);
  }
  return keys;
};

/** Normalize server/local dates to YYYY-MM-DD in device-local calendar. */
export const toLocalDateKey = (input: string | Date | null | undefined): string | null => {
  if (input == null) return null;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return localDateKey(parsed);
  }
  if (Number.isNaN(input.getTime())) return null;
  return localDateKey(input);
};

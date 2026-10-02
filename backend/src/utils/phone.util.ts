const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// indian phone number normalization
export const normalizeIndianPhone = (input: unknown) => {
  if (input == null) return null;

  const str = String(input).trim();
  const digits = str.replace(/\D/g, "");
  if (!digits) return null;

  if (str.startsWith("+")) {
    return `+${digits}`;
  }

  let normalized = digits;
  if (normalized.length === 12 && normalized.startsWith("91")) {
    normalized = normalized.slice(2);
  } else if (normalized.length === 11 && normalized.startsWith("0")) {
    normalized = normalized.slice(1);
  }

  if (!INDIAN_MOBILE_REGEX.test(normalized)) {
    if (digits.length >= 6 && digits.length <= 15) return digits;
    return null;
  }

  return normalized;
};

/** Canonical gym-member phone: 10-digit Indian mobile when possible. */
export const canonicalMemberPhone = (input: unknown): string | null => {
  const normalized = normalizeIndianPhone(input);
  if (!normalized) return null;
  const digits = normalized.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (INDIAN_MOBILE_REGEX.test(last10)) return last10;
  return digits || normalized;
};

/** All common storage variants of a phone, used for unique lookups. */
export const phoneMatchCandidates = (input: unknown): string[] => {
  const raw = String(input || "").trim();
  const digits = raw.replace(/\D/g, "");
  const set = new Set<string>();
  if (raw) set.add(raw);
  const canonical = canonicalMemberPhone(raw);
  if (canonical) set.add(canonical);
  const normalized = normalizeIndianPhone(raw);
  if (normalized) set.add(normalized);
  if (digits) {
    set.add(digits);
    set.add(`+${digits}`);
    const last10 = digits.slice(-10);
    if (last10.length === 10) {
      set.add(last10);
      set.add(`+91${last10}`);
      set.add(`91${last10}`);
    }
  }
  return [...set];
};

// Convert a 10-digit Indian number or generic number to E.164 for Firebase Auth.
export const toE164IndianPhone = (phone: string) => {
  if (phone.startsWith("+")) return phone;
  if (INDIAN_MOBILE_REGEX.test(phone)) return `+91${phone}`;
  return `+${phone}`;
};

export const isValidIndianPhone = (input: unknown) =>
  canonicalMemberPhone(input) !== null;

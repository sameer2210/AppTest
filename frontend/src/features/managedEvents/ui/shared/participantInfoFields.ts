export const TSHIRT_SIZE_OPTIONS = ["S", "M", "L", "XL", "XXL"] as const;

export const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/** Indian states & UTs for registration State dropdown. */
export const INDIAN_STATE_OPTIONS = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

/** Indian mobile: 10 digits starting 6–9 (without +91). */
export const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

export type ParticipantInfoControlType = "text" | "select" | "phone" | "number";

export type ParticipantInfoFieldDef = {
  field: string;
  type: ParticipantInfoControlType;
  options?: readonly string[];
  /** Address section grouping for Figma layout. */
  section?: "info" | "address";
  /** Only pin + state share a row. */
  halfWidth?: boolean;
};

const normalizeLabel = (label: string) =>
  label.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");

export const classifyParticipantInfoField = (label: string): ParticipantInfoFieldDef => {
  const key = normalizeLabel(label);
  const field = label.trim();

  if (key.includes("t-shirt") || key.includes("tshirt") || key.includes("t shirt")) {
    return { field, type: "select", options: TSHIRT_SIZE_OPTIONS, section: "info" };
  }
  if (key.includes("blood")) {
    return { field, type: "select", options: BLOOD_GROUP_OPTIONS, section: "info" };
  }
  if (
    key.includes("phone") ||
    key.includes("contact number") ||
    key.includes("mobile") ||
    key === "participant contact" ||
    (key.includes("emergency") &&
      (key.includes("number") || key.includes("phone") || key.includes("mobile")))
  ) {
    return { field, type: "phone", section: "info" };
  }
  if (key.includes("pincode") || key.includes("pin code") || key.includes("zip")) {
    return { field, type: "number", section: "address", halfWidth: true };
  }
  if (key === "state") {
    return {
      field,
      type: "select",
      options: INDIAN_STATE_OPTIONS,
      section: "address",
      halfWidth: true,
    };
  }
  if (key === "city" || key.includes("address")) {
    return { field, type: "text", section: "address" };
  }
  return { field, type: "text", section: "info" };
};

export const DEFAULT_INFO_FIELDS = [
  "T-Shirt Size",
  "Contact Name",
  "Contact Number",
  "Emergency Contact Number",
  "Blood Group",
] as const;

export const DEFAULT_ADDRESS_FIELDS = [
  "City",
  "Address line 1",
  "Address line 2",
  "Pincode",
  "State",
] as const;

export const DEFAULT_PARTICIPANT_INFO_FIELDS = [
  ...DEFAULT_INFO_FIELDS,
  ...DEFAULT_ADDRESS_FIELDS,
] as const;

export const buildParticipantInfoFieldDefs = (
  labels?: string[] | null,
): ParticipantInfoFieldDef[] => {
  const rawList = (labels || []).map((label) => String(label || "").trim()).filter(Boolean);
  const baseList = rawList.length > 0 ? rawList : [...DEFAULT_INFO_FIELDS];

  const hasAddress = baseList.some((lbl) => {
    const k = normalizeLabel(lbl);
    return (
      k === "city" ||
      k.includes("address") ||
      k.includes("pincode") ||
      k.includes("pin code") ||
      k.includes("zip") ||
      k === "state"
    );
  });

  const finalLabels = hasAddress ? baseList : [...baseList, ...DEFAULT_ADDRESS_FIELDS];
  return finalLabels.map(classifyParticipantInfoField);
};

/**
 * Digits-only local part (max 10) for Indian mobile inputs.
 * Uses the last 10 digits so pasted "+91…" / "91…" country codes strip correctly,
 * while numbers that genuinely start with 91 (e.g. 91234…) stay intact.
 */
export const sanitizeIndianMobileDigits = (raw: string): string =>
  String(raw || "")
    .replace(/\D/g, "")
    .slice(-10);

const fieldKey = (label: string) => normalizeLabel(label);

/** Map a required participant field label → value from the signed-in user profile. */
export const profileValueForParticipantField = (
  fieldLabel: string,
  user?: {
    username?: string | null;
    email?: string | null;
    contactNo?: string | null;
    addressLine1?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    pinCode?: string | null;
  } | null,
): string => {
  if (!user) return "";
  const key = fieldKey(fieldLabel);

  if (
    key === "contact name" ||
    key === "name" ||
    key === "full name" ||
    key === "participant name"
  ) {
    return (user.username || "").trim();
  }
  if (key.includes("email")) {
    return (user.email || "").trim();
  }
  if (
    key.includes("phone") ||
    key.includes("mobile") ||
    key.includes("contact number") ||
    key === "participant contact" ||
    (key.includes("emergency") &&
      (key.includes("number") || key.includes("phone") || key.includes("mobile")))
  ) {
    return sanitizeIndianMobileDigits(user.contactNo || "");
  }
  if (key.includes("pincode") || key.includes("pin code") || key.includes("zip")) {
    return (user.pinCode || "").replace(/\D/g, "").slice(0, 6);
  }
  if (key === "state") {
    return (user.state || "").trim();
  }
  if (key === "city") {
    return (user.city || "").trim();
  }
  if (key.includes("address line 1") || key === "address 1" || key === "address") {
    return (user.addressLine1 || user.address || "").trim();
  }
  if (key.includes("address line 2") || key === "address 2") {
    return "";
  }
  return "";
};

/** Prefer prior registration answers; fall back to profile for empty fields. */
export const buildPrefillParticipantAnswers = (
  fields: ParticipantInfoFieldDef[],
  user?: Parameters<typeof profileValueForParticipantField>[1],
  priorInfo?: { field?: string; value?: string }[] | null,
): Record<string, string> => {
  const priorByKey = new Map<string, string>();
  for (const row of priorInfo || []) {
    const label = String(row.field || "").trim();
    const value = String(row.value || "").trim();
    if (!label || !value) continue;
    priorByKey.set(fieldKey(label), value);
  }

  const next: Record<string, string> = {};
  for (const def of fields) {
    const priorRaw = priorByKey.get(fieldKey(def.field)) || "";
    let value = priorRaw || profileValueForParticipantField(def.field, user);
    if (def.type === "phone") {
      value = sanitizeIndianMobileDigits(value);
    }
    if (def.type === "select" && def.options?.length && value) {
      const match = def.options.find((opt) => opt.toLowerCase() === value.toLowerCase());
      value = match || "";
    }
    if (value) next[def.field] = value;
  }
  return next;
};

export const formatIndianMobileForPayload = (digits: string): string => {
  const local = sanitizeIndianMobileDigits(digits);
  return local ? `+91${local}` : "";
};

export const answersToPayload = (
  answers: Record<string, string>,
  fields: ParticipantInfoFieldDef[],
): { field: string; value: string }[] =>
  fields.map((f) => {
    const raw = String(answers[f.field] ?? "").trim();
    if (f.type === "phone") {
      return { field: f.field, value: formatIndianMobileForPayload(raw) };
    }
    return { field: f.field, value: raw };
  });

export const validateParticipantInfoAnswersLocal = (
  answers: Record<string, string>,
  fields: ParticipantInfoFieldDef[],
): string | null => {
  for (const f of fields) {
    const k = normalizeLabel(f.field);
    if (k.includes("address line 2") || k === "address 2") {
      continue;
    }
    const value = String(answers[f.field] ?? "").trim();
    if (!value) return `Please fill in "${f.field}".`;
    if (f.type === "select" && f.options && !f.options.includes(value)) {
      return `Please select a valid "${f.field}".`;
    }
    if (f.type === "phone") {
      const digits = sanitizeIndianMobileDigits(value);
      if (!INDIAN_MOBILE_REGEX.test(digits)) {
        return `Enter a valid 10-digit Indian mobile number for "${f.field}".`;
      }
    }
    if (f.field.toLowerCase().includes("pincode") || f.field.toLowerCase().includes("pin code")) {
      if (!/^\d{6}$/.test(value)) {
        return `Enter a valid 6-digit pincode for "${f.field}".`;
      }
    }
  }
  return null;
};

/** Order address fields: City → Line1 → Line2 → Pin+State row. */
export const sortAddressFields = (fields: ParticipantInfoFieldDef[]): ParticipantInfoFieldDef[] => {
  const rank = (f: ParticipantInfoFieldDef) => {
    const k = normalizeLabel(f.field);
    if (k === "city") return 0;
    if (k.includes("address line 1") || k === "address 1") return 1;
    if (k.includes("address line 2") || k === "address 2") return 2;
    if (k.includes("pincode") || k.includes("pin")) return 3;
    if (k === "state") return 4;
    return 5;
  };
  return [...fields].sort((a, b) => rank(a) - rank(b));
};

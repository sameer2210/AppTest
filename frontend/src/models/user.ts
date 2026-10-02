import { normalizeRemoteImageUri } from "@/utils/resolveRemoteImageUri";

export interface StronUser {
  uid: string;
  /** MongoDB `_id`. RevenueCat custom App User ID for logged-in (non-guest) users. */
  id?: string | null;
  email?: string | null;
  username?: string | null;
  profileImageUrl?: string | null;
  dob?: string | null;
  gender?: string | null;
  weight?: number | null;
  height?: number | null;
  contactNo?: string | null;
  /** Set true after OTP via /api/auth/verify-otp (organizer create gate). */
  phoneVerified?: boolean;
  receiverName?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankIfscCode?: string | null;
  address?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  pinCode?: string | null;
  stepGoal?: number | null;
  todaysStepCount?: number;
  isGuest?: boolean;
  interestAreas?: string[];
  avgDailySteps?: number | string | null;
  deliveryAddress?: string;
  about?: string | null;
  lastActive?: string | null;
  name?: string | null;
  location?: string | null;
  shortBio?: string | null;
  onboardingRole?: "individual" | "business" | null;
  onboardingBusinessName?: string | null;
  onboardingBusinessOffers?: string[] | null;
  onboardingBusinessFeatures?: string[] | null;
}

export const createMinimalUser = (
  uid: string,
  email?: string | null,
  username?: string | null,
  profileImageUrl?: string | null,
): StronUser => ({
  uid,
  email,
  username: username || email?.split("@")[0] || `User${Date.now()}`,
  profileImageUrl,
  todaysStepCount: 0,
  isGuest: Boolean(username?.toLowerCase().startsWith("guest")),
});

const readOptionalString = (value: unknown): string | null => {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const MONGO_OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

export const isMongoObjectIdString = (value?: string | null): boolean =>
  MONGO_OBJECT_ID_RE.test(String(value || "").trim());

const readMongoObjectId = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value === "string") {
    const text = value.trim();
    return isMongoObjectIdString(text) ? text : null;
  }
  if (typeof value === "object") {
    const record = value as { $oid?: unknown; toString?: () => string };
    if (typeof record.$oid === "string" && isMongoObjectIdString(record.$oid)) {
      return record.$oid.trim();
    }
    if (typeof record.toString === "function") {
      const text = record.toString().trim();
      if (isMongoObjectIdString(text)) return text;
    }
  }
  return null;
};

export const isStronProPurchaser = (
  user?: Pick<StronUser, "uid" | "id" | "isGuest"> | null,
): boolean => Boolean(user?.uid && !user.isGuest && isMongoObjectIdString(user.id));

const readOptionalNumber = (value: unknown): number | null => {
  if (value == null || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
};

/** Parse date from Firestore timestamp, ISO string, or epoch. */
export const parseUserDob = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) {
      const year = Number(ymd[1]);
      const month = Number(ymd[2]);
      const day = Number(ymd[3]);
      const local = new Date(year, month - 1, day);
      return Number.isNaN(local.getTime()) ? null : local;
    }
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "number") {
    const ms = value > 1e12 ? value : value * 1000;
    const parsed = new Date(ms);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    const seconds = record._seconds ?? record.seconds;
    if (seconds != null) {
      const sec = Number(seconds);
      if (!Number.isNaN(sec)) {
        return new Date(sec * 1000);
      }
    }
  }
  return null;
};

/** Date-only ISO for API — avoids UTC day shift from toISOString(). */
export const dobToIsoString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T00:00:00.000`;
};

export const normalizeProfileImageUrl = (value: unknown): string | null => {
  const direct = readOptionalString(value);
  if (direct) return direct;
  return null;
};

/** Map API user JSON — field is `uid`. */
export const stronUserFromJson = (json: unknown): StronUser | null => {
  if (!json || typeof json !== "object") return null;
  const raw = json as Record<string, unknown>;
  const uid = String(raw.uid ?? raw.userId ?? "").trim();
  if (!uid) return null;

  const dobDate = parseUserDob(raw.dob);
  const profileImageUrl =
    normalizeProfileImageUrl(raw.profileImageUrl) ??
    normalizeProfileImageUrl(raw.photoURL) ??
    normalizeProfileImageUrl(raw.profileImage);

  const interestAreas = Array.isArray(raw.interestAreas)
    ? raw.interestAreas.map((item) => String(item)).filter(Boolean)
    : undefined;
  const contactNo = readOptionalString(
    raw.contactNo ??
      raw.phone ??
      raw.phoneNumber ??
      raw.mobile ??
      raw.contactNumber ??
      raw.contact_no ??
      raw.phone_number,
  );
  const hasValidPhone = Boolean(contactNo && contactNo.replace(/\D/g, "").length >= 10);

  return {
    uid,
    id: readMongoObjectId(raw.id ?? raw._id),
    email: readOptionalString(raw.email),
    username: readOptionalString(raw.username),
    receiverName: readOptionalString(raw.receiverName),
    bankName: readOptionalString(raw.bankName),
    bankAccountNumber: readOptionalString(raw.bankAccountNumber),
    bankIfscCode: readOptionalString(raw.bankIfscCode),
    profileImageUrl,
    dob: dobDate ? dobToIsoString(dobDate) : null,
    gender: readOptionalString(raw.gender),
    weight: readOptionalNumber(raw.weight),
    height: readOptionalNumber(raw.height),
    contactNo,
    phoneVerified: raw.phoneVerified === true || hasValidPhone,
    address: readOptionalString(raw.address),
    addressLine1: readOptionalString(raw.addressLine1),
    city: readOptionalString(raw.city),
    state: readOptionalString(raw.state),
    pinCode: readOptionalString(raw.pinCode),
    stepGoal: readOptionalNumber(raw.stepGoal) ?? undefined,
    todaysStepCount: readOptionalNumber(raw.todaysStepCount) ?? undefined,
    isGuest: raw.isGuest === true,
    interestAreas,
    avgDailySteps:
      raw.avgDailySteps != null && raw.avgDailySteps !== ""
        ? typeof raw.avgDailySteps === "number"
          ? raw.avgDailySteps
          : String(raw.avgDailySteps)
        : null,
    deliveryAddress: readOptionalString(raw.deliveryAddress) ?? undefined,
    about: readOptionalString(raw.about),
    lastActive: readOptionalString(raw.lastActive) ?? undefined,
    name: readOptionalString(raw.name),
    location: readOptionalString(raw.location),
    shortBio: readOptionalString(raw.shortBio ?? raw.shortInterest ?? raw.short_bio),
    onboardingRole:
      raw.onboardingRole === "individual" || raw.onboardingRole === "business"
        ? raw.onboardingRole
        : null,
    onboardingBusinessName: readOptionalString(raw.onboardingBusinessName),
    onboardingBusinessOffers: Array.isArray(raw.onboardingBusinessOffers)
      ? raw.onboardingBusinessOffers.map(String)
      : null,
    onboardingBusinessFeatures: Array.isArray(raw.onboardingBusinessFeatures)
      ? raw.onboardingBusinessFeatures.map(String)
      : null,
  };
};

const optionalStringArray = (value: string[] | null | undefined): string[] | undefined =>
  Array.isArray(value) ? value : undefined;

/** Serialize user for API; dob uses date-only ISO override. */
export const stronUserToApiJson = (user: StronUser): Record<string, unknown> => {
  const dobDate = parseUserDob(user.dob);
  const contactNo = readOptionalString(user.contactNo);
  const interestAreas = optionalStringArray(user.interestAreas);
  const onboardingBusinessOffers = optionalStringArray(user.onboardingBusinessOffers);
  const onboardingBusinessFeatures = optionalStringArray(user.onboardingBusinessFeatures);
  return {
    uid: user.uid,
    userId: user.uid,
    id: user.id ?? null,
    email: user.email ?? null,
    username: user.username ?? null,
    name: user.name ?? null,
    receiverName: user.receiverName ?? null,
    bankName: user.bankName ?? null,
    bankAccountNumber: user.bankAccountNumber ?? null,
    bankIfscCode: user.bankIfscCode ?? null,
    profileImageUrl: user.profileImageUrl ?? null,
    dob: dobDate ? dobToIsoString(dobDate) : null,
    gender: user.gender ?? null,
    weight: user.weight ?? null,
    height: user.height ?? null,
    ...(contactNo ? { contactNo } : {}),
    ...(user.phoneVerified === true ? { phoneVerified: true } : {}),
    isGuest: user.isGuest === true,
    address: user.address ?? null,
    addressLine1: user.addressLine1 ?? null,
    city: user.city ?? null,
    state: user.state ?? null,
    pinCode: user.pinCode ?? null,
    stepGoal: user.stepGoal ?? null,
    todaysStepCount: user.todaysStepCount ?? null,
    ...(interestAreas ? { interestAreas } : {}),
    avgDailySteps: user.avgDailySteps ?? null,
    deliveryAddress: user.deliveryAddress ?? null,
    about: user.about ?? null,
    location: user.location ?? null,
    shortBio: user.shortBio ?? null,
    onboardingRole: user.onboardingRole ?? null,
    onboardingBusinessName: user.onboardingBusinessName ?? null,
    ...(onboardingBusinessOffers ? { onboardingBusinessOffers } : {}),
    ...(onboardingBusinessFeatures ? { onboardingBusinessFeatures } : {}),
  };
};

export const formatUserTag = (uid?: string | null) => {
  const id = (uid ?? "").trim();
  const prefix = id.length >= 4 ? id.substring(0, 4) : id;
  return `#SW${prefix.toUpperCase()}`;
};

export const hasBankDetails = (
  user: Pick<StronUser, "receiverName" | "bankAccountNumber" | "bankIfscCode">,
) =>
  Boolean(user.receiverName?.trim() && user.bankAccountNumber?.trim() && user.bankIfscCode?.trim());

export const formatMaskedBankAccount = (account?: string | null) => {
  const digits = (account ?? "").trim();
  if (digits.length < 4) return "";
  return `****${digits.slice(-4)}`;
};

export const formatProfileAddress = (user: StronUser) => {
  const parts = [user.addressLine1, user.city, user.state, user.pinCode]
    .map((part) => part?.trim())
    .filter(Boolean) as string[];

  if (parts.length > 0) {
    return parts.join(", ");
  }

  const legacy = user.address?.trim() || user.deliveryAddress?.trim();
  return legacy && legacy.length > 0 ? legacy : "Not provided";
};

export const formatDobDisplay = (dob?: string | null) => {
  if (!dob) return "NA";
  const ymd = dob.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
  }
  const date = parseUserDob(dob);
  if (!date) return "NA";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const withProfileImageCacheBuster = (url?: string | null, version?: string | number) => {
  const direct = normalizeProfileImageUrl(url);
  if (!direct) return undefined;
  const normalized = normalizeRemoteImageUri(direct) || direct;
  if (
    normalized.startsWith("file://") ||
    normalized.startsWith("content://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }
  const token = version ?? Date.now();
  return normalized.includes("?") ? `${normalized}&v=${token}` : `${normalized}?v=${token}`;
};

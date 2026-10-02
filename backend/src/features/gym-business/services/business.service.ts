import Business from "../models/business.model.js";
import type { IBusiness, VerificationSummary } from "../types/index.js";
import {
  isMongoDuplicateKeyError,
  isMongoDuplicateOnField,
} from "../../../types/mongo.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

const SLUG_MIN = 3;
const SLUG_MAX = 60;
const PLACEHOLDER_NAMES = new Set([
  "unnamed",
  "register your gym",
  "register your business",
]);

const slugify = (value: string): string => {
  const base = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);

  if (base.length >= SLUG_MIN) return base;
  const padded = `gym-${base || "business"}`.replace(/^-+|-+$/g, "");
  return padded.slice(0, SLUG_MAX);
};

export const generateUniqueSlug = async ({
  businessName,
  excludeId,
}: {
  businessName: string;
  excludeId?: unknown;
}): Promise<string> => {
  const base = slugify(businessName);
  let n = 1;

  while (n <= 100) {
    const suffix = n === 1 ? "" : `-${n}`;
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length)}${suffix}`;
    const query: MongoFilter = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const taken = await Business.exists(query);
    if (!taken) return candidate;
    n += 1;
  }

  throw codedError("conflict", "Could not allocate a unique business slug.");
};

type BusinessChecklist = {
  businessName?: unknown;
  name?: unknown;
  location?: unknown;
  address?: unknown;
  phone?: unknown;
  services?: unknown;
  tags?: unknown;
  openingHours?: unknown;
};

const hasRealName = (business: BusinessChecklist): boolean => {
  const name = String(business.businessName ?? business.name ?? "").trim();
  return Boolean(name) && !PLACEHOLDER_NAMES.has(name.toLowerCase());
};

const hasRealLocation = (business: BusinessChecklist): boolean => {
  const location = String(business.location ?? business.address ?? "").trim();
  if (!location) return false;
  const lower = location.toLowerCase();
  return lower !== "unknown" && !lower.includes("get listed on stron");
};

const hasPhone = (business: BusinessChecklist): boolean =>
  String(business.phone ?? "").trim().length >= 8;

const hasServices = (business: BusinessChecklist): boolean => {
  const raw = Array.isArray(business.services)
    ? business.services
    : Array.isArray(business.tags)
      ? business.tags
      : [];
  return raw.some((item: unknown) => String(item).trim().length > 0);
};

const hasOpeningHours = (business: BusinessChecklist): boolean => {
  const weekly = Array.isArray(business.openingHours) ? business.openingHours : [];
  return weekly.some((hour) => {
    const row = hour as Record<string, unknown>;
    return (
      row.isAvailable !== false &&
      Boolean(row.openTime || row.open || row.morning)
    );
  });
};

const isPayoutVerified = (
  payoutAccount?: { isConfigured?: boolean; verificationStatus?: string } | null,
): boolean => payoutAccount?.verificationStatus === "VERIFIED";

/**
 * Server-owned verification score. Admin flag wins; otherwise full checklist
 * (profile fields + verified payout) is required.
 */
export const computeVerification = ({
  business,
  payoutAccount,
}: {
  business: IBusiness | Record<string, unknown>;
  payoutAccount?: { isConfigured?: boolean; verificationStatus?: string } | null;
}): VerificationSummary => {
  const missing: string[] = [];
  let score = 0;

  if (hasRealName(business)) {
    score += 20;
  } else {
    missing.push("businessName");
  }

  if (hasRealLocation(business)) {
    score += 20;
  } else {
    missing.push("location");
  }

  if (hasPhone(business)) {
    score += 15;
  } else {
    missing.push("phone");
  }

  if (hasServices(business)) {
    score += 15;
  } else {
    missing.push("services");
  }

  if (hasOpeningHours(business)) {
    score += 15;
  } else {
    missing.push("openingHours");
  }

  if (isPayoutVerified(payoutAccount)) {
    score += 15;
  } else {
    missing.push("payoutAccount");
  }

  const progressPercent = Math.min(100, Math.max(0, score));
  const profileComplete = missing.filter((item) => item !== "payoutAccount").length === 0;
  const adminVerified = Boolean(business.isVerified);
  const isVerified =
    adminVerified || (profileComplete && isPayoutVerified(payoutAccount));

  return {
    isVerified,
    badgeLabel: isVerified ? "Verified Business" : "Unverified Business",
    progressPercent,
    missing,
  };
};

/**
 * Get gym business profile for authenticated user / business
 */
export const getBusinessProfile = async ({
  ownerId,
  businessId,
}: ServiceParams): Promise<IBusiness> => {
  const query = businessId ? { _id: businessId } : { ownerId };
  const business = await Business.findOne(query).lean();
  if (!business) {
    throw codedError("business_not_found", "Gym business profile not found.");
  }
  return business as IBusiness;
};
/**
 * Optional profile for owners without a gym yet.
 * Missing → null. Suspended → hard error (parity with requireBusiness / optionalBusiness).
 */
export const getBusinessProfileOptional = async ({
  ownerId,
}: ServiceParams): Promise<IBusiness | null> => {
  const business = await Business.findOne({ ownerId }).lean();
  if (!business) {
    return null;
  }
  if (business.status === "SUSPENDED") {
    throw codedError("business_suspended", "This gym business account is suspended.");
  }
  return business as IBusiness;
};

/**
 * Create initial gym business profile for a gym owner
 * Atomic duplicate rejection: checks findOne and catches Mongo E11000 on race
 */
export const createBusinessProfile = async ({
  ownerId,
  businessData,
}: ServiceParams): Promise<IBusiness> => {
  const existing = await Business.findOne({ ownerId }).select("_id").lean();
  if (existing) {
    throw codedError("conflict", "A gym business profile already exists for this account.");
  }

  const requestedSlug =
    typeof businessData.slug === "string" && businessData.slug.trim()
      ? slugify(businessData.slug)
      : null;
  const slug =
    requestedSlug ||
    (await generateUniqueSlug({ businessName: businessData.businessName }));

  if (requestedSlug) {
    const taken = await Business.exists({ slug: requestedSlug });
    if (taken) {
      throw codedError("slug_taken", "This business slug is already in use.");
    }
  }

  try {
    const business = await Business.create({
      ownerId,
      businessName: businessData.businessName,
      slug,
      bio: businessData.bio || null,
      bannerUrl: businessData.bannerUrl || null,
      galleryUrls: Array.isArray(businessData.galleryUrls) ? businessData.galleryUrls : [],
      logo: businessData.logo || null,
      location: businessData.location || null,
      mapLink: businessData.mapLink || null,
      phone: businessData.phone || null,
      services: Array.isArray(businessData.services) ? businessData.services : [],
      openingHours: businessData.openingHours || undefined,
      status: "ACTIVE", // Always defaults to ACTIVE on creation; admin sets other statuses
    });

    return business.toObject();
  } catch (err: unknown) {
    if (isMongoDuplicateOnField(err, "slug")) {
      throw codedError("slug_taken", "This business slug is already in use.");
    }
    if (isMongoDuplicateKeyError(err)) {
      throw codedError("conflict", "A gym business profile already exists for this account.");
    }
    throw err;
  }
};

/**
 * Update gym business profile
 * Security: status / isVerified are deliberately excluded (admin-only)
 */
export const updateBusinessProfile = async ({
  businessId,
  updateData,
}: ServiceParams): Promise<IBusiness> => {
  const allowedFields = [
    "businessName",
    "slug",
    "bio",
    "bannerUrl",
    "galleryUrls",
    "logo",
    "location",
    "mapLink",
    "phone",
    "services",
    "openingHours",
  ];

  const update: MongoFilter = {};
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      update[field] = updateData[field];
    }
  }

  if (typeof update.slug === "string" && update.slug.trim()) {
    const nextSlug = slugify(update.slug);
    const taken = await Business.exists({ slug: nextSlug, _id: { $ne: businessId } });
    if (taken) {
      throw codedError("slug_taken", "This business slug is already in use.");
    }
    update.slug = nextSlug;
  }

  try {
    const updated = await Business.findByIdAndUpdate(
      businessId,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      throw codedError("business_not_found", "Gym business not found.");
    }

    return updated as IBusiness;
  } catch (err: unknown) {
    if (isMongoDuplicateOnField(err, "slug")) {
      throw codedError("slug_taken", "This business slug is already in use.");
    }
    throw err;
  }
};

export default {
  getBusinessProfile,
  getBusinessProfileOptional,
  createBusinessProfile,
  updateBusinessProfile,
  generateUniqueSlug,
  computeVerification,
};

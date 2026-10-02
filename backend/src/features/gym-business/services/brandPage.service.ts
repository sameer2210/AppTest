import mongoose from "mongoose";
import Business from "../models/business.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Membership from "../models/membership.model.js";
import Member from "../models/member.model.js";
import BrandPageVisit from "../models/brandPageVisit.model.js";
import StaffMember from "../models/staffMember.model.js";
import { getISTDateString } from "./attendance.service.js";
import {
  ACTIVE_LISTING_STATUSES,
  StronEvent,
} from "../../managed-events/index.js";
import User from "../../identity-auth/models/user.model.js";
import { BRAND_PAGE_CATEGORIES, getPublicWebBaseUrl, STRON_FORMATS } from "../../../constants/index.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type {
  IBusiness,
  PublicBrandBusiness,
  PublicBrandEvent,
  PublicBrandPlan,
  PublicBrandPage,
  OwnerBrandPage,
  BrandPageVisitStats,
  BrandPlanViewerStatus,
} from "../types/index.js";

const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const buildShareUrl = (slug: string | null | undefined): string | null => {
  if (!slug) return null;
  const base = getPublicWebBaseUrl();
  return base ? `${base}/gym/${slug}` : `/gym/${slug}`;
};

const bannerKeyForFormat = (format: string): PublicBrandEvent["bannerKey"] => {
  if (format === STRON_FORMATS.FACE_OFF) return "FACE_OFF";
  if (format === STRON_FORMATS.KING_OF_THE_HILL) return "KING_OF_THE_HILL";
  if (format === STRON_FORMATS.STEP_CHALLENGE) return "STEP_CHALLENGE";
  return "MARATHON";
};

const lastNIstDates = (n: number, from = new Date()): string[] => {
  const dates = new Set<string>();
  for (let i = 0; i < n + 2 && dates.size < n; i += 1) {
    dates.add(getISTDateString(new Date(from.getTime() - i * 24 * 60 * 60 * 1000)));
  }
  return [...dates];
};

const findActiveBusinessBySlug = async (slug: string): Promise<IBusiness> => {
  const business = await Business.findOne({ slug, status: "ACTIVE" }).lean();
  if (!business) {
    throw codedError("brand_page_not_found", "This brand page is not available.");
  }
  return business as IBusiness;
};

const toPublicBusiness = (business: IBusiness): PublicBrandBusiness => ({
  id: String(business._id),
  businessName: String(business.businessName || ""),
  slug: business.slug ? String(business.slug) : null,
  logo: business.logo ?? null,
  bannerUrl: business.bannerUrl ?? null,
  galleryUrls: Array.isArray(business.galleryUrls) ? business.galleryUrls : [],
  bio: business.bio ?? null,
  location: business.location ?? null,
  mapLink: business.mapLink ?? null,
  phone: business.phone ?? null,
  services: Array.isArray(business.services) ? business.services : [],
  openingHours: Array.isArray(business.openingHours) ? business.openingHours : [],
  isVerified: Boolean(business.isVerified),
});

const normalizeListingCategory = (
  value: unknown,
): PublicBrandPlan["listingCategory"] => {
  if (value === "workshop" || value === "class" || value === "training") return value;
  return "plan";
};

const digitsOnly = (value?: string | null) => String(value || "").replace(/\D/g, "");

const findMemberIdByViewerUid = async (
  businessId: mongoose.Types.ObjectId,
  viewerUid?: string,
): Promise<mongoose.Types.ObjectId | null> => {
  if (!viewerUid) return null;
  const user = await User.findOne({ uid: viewerUid }).select("contactNo email").lean();
  const phone = digitsOnly(user?.contactNo);
  if (!phone && !user?.email) return null;

  const memberQuery: Record<string, unknown> = { businessId, isDeleted: false };
  if (phone && user?.email) {
    memberQuery.$or = [{ phone: user.contactNo }, { phone }, { email: user.email }];
  } else if (phone) {
    memberQuery.$or = [{ phone: user?.contactNo }, { phone }];
  } else {
    memberQuery.email = user?.email;
  }
  const member = await Member.findOne(memberQuery).select("_id").lean();
  return member?._id ? toObjectId(String(member._id)) : null;
};

const resolveViewerStatuses = async (
  businessId: mongoose.Types.ObjectId,
  viewerUid?: string,
): Promise<Map<string, BrandPlanViewerStatus>> => {
  const map = new Map<string, BrandPlanViewerStatus>();
  if (!viewerUid) return map;

  const memberId = await findMemberIdByViewerUid(businessId, viewerUid);
  if (!memberId) return map;
  const member = { _id: memberId };

  const memberships = await Membership.find({
    businessId,
    memberId: member._id,
    status: { $in: ["ACTIVE", "EXPIRED", "PAUSED"] },
  })
    .select("planId status")
    .lean();

  const planIds = memberships.map((row) => row.planId).filter(Boolean);
  const plans = planIds.length
    ? await MembershipPlan.find({ _id: { $in: planIds } }).select("price").lean()
    : [];
  const priceById = new Map(plans.map((plan) => [String(plan._id), Number(plan.price) || 0]));
  const activePrices = memberships
    .filter((row) => row.status === "ACTIVE")
    .map((row) => priceById.get(String(row.planId)) || 0);
  const maxActivePrice = activePrices.length ? Math.max(...activePrices) : 0;

  for (const row of memberships) {
    const planId = String(row.planId);
    if (row.status === "ACTIVE") {
      map.set(planId, "alreadyBought");
    } else if (row.status === "EXPIRED" && map.get(planId) !== "alreadyBought") {
      map.set(planId, "expired");
    }
  }

  return new Map(
    [...map.entries()].map(([planId, status]) => {
      if (status === "alreadyBought") return [planId, "alreadyBought"];
      if (status === "expired") return [planId, "expired"];
      const price = priceById.get(planId) || 0;
      if (maxActivePrice > 0 && price > maxActivePrice) return [planId, "upgrade"];
      return [planId, status];
    }),
  );
};

const listPublicPlans = async (
  businessId: mongoose.Types.ObjectId,
  viewerUid?: string,
): Promise<PublicBrandPlan[]> => {
  const plans = await MembershipPlan.find({
    businessId,
    status: "ACTIVE",
    isDeleted: false,
    visibility: { $nin: ["PRIVATE", "MEMBERS_ONLY"] },
  })
    .sort({ createdAt: -1 })
    .select(
      "name price currency billingCycle duration durationUnit isFreeTrial trialDuration perks listingCategory trainerIds",
    )
    .lean();

  const trainerIdList = plans.flatMap((plan) =>
    Array.isArray(plan.trainerIds) ? plan.trainerIds : [],
  );
  const staffRows = trainerIdList.length
    ? await StaffMember.find({
        _id: { $in: trainerIdList },
        status: { $in: ["ACTIVE", "IN_PROGRESS"] },
      })
        .select("name profileImage role")
        .lean()
    : [];
  const staffById = new Map(staffRows.map((row) => [String(row._id), row]));

  const viewerMap = await resolveViewerStatuses(businessId, viewerUid);
  const activePrices = plans
    .filter((plan) => viewerMap.get(String(plan._id)) === "alreadyBought")
    .map((plan) => Number(plan.price) || 0);
  const maxOwned = activePrices.length ? Math.max(...activePrices) : 0;

  return plans.map((plan) => {
    const id = String(plan._id);
    let viewerStatus: BrandPlanViewerStatus = viewerMap.get(id) || "none";
    if (viewerStatus === "none" && maxOwned > 0 && Number(plan.price) > maxOwned) {
      viewerStatus = "upgrade";
    }
    return {
      id,
      name: String(plan.name),
      price: Number(plan.price) || 0,
      currency: String(plan.currency || "INR"),
      billingCycle: String(plan.billingCycle),
      duration: Number(plan.duration) || 0,
      durationUnit: String(plan.durationUnit || "MONTHS"),
      isFreeTrial: Boolean(plan.isFreeTrial),
      trialDuration: Number(plan.trialDuration) || 0,
      perks: Array.isArray(plan.perks) ? plan.perks : [],
      listingCategory: normalizeListingCategory(plan.listingCategory),
      viewerStatus,
      trainers: (Array.isArray(plan.trainerIds) ? plan.trainerIds : [])
        .map((id) => staffById.get(String(id)))
        .filter(Boolean)
        .map((staff) => ({
          id: String(staff!._id),
          name: String(staff!.name || ""),
          specialty: staff!.role === "TRAINER" ? "Personal Trainer" : String(staff!.role || "Trainer"),
          profileImage: staff!.profileImage || null,
        }))
        .filter((row) => row.name),
    };
  });
};

const listPublicEvents = async (ownerId: string): Promise<PublicBrandEvent[]> => {
  const events = await StronEvent.find({
    organizerUid: ownerId,
    status: { $in: ACTIVE_LISTING_STATUSES },
  })
    .sort({ startDate: 1, createdAt: -1 })
    .select("key title description format bannerName destination startDate endDate status")
    .lean();

  return events.map((event) => ({
    id: String(event.key),
    key: String(event.key),
    title: String(event.title || ""),
    subtitle: String(event.description || ""),
    locationText: String(event.destination || ""),
    format: String(event.format || ""),
    bannerKey: bannerKeyForFormat(String(event.format || "")),
    bannerName: event.bannerName ?? null,
    startDate: event.startDate ?? null,
    endDate: event.endDate ?? null,
    status: String(event.status || ""),
  }));
};

const sumVisitCounts = async (
  businessId: mongoose.Types.ObjectId,
  dateFilter?: { dateIST: { $in: string[] } },
): Promise<number> => {
  const match = dateFilter ? { businessId, ...dateFilter } : { businessId };
  const [row] = await BrandPageVisit.aggregate<{ total: number }>([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$count" } } },
  ]);
  return Number(row?.total) || 0;
};

export const getVisitStats = async ({
  businessId,
}: ServiceParams): Promise<BrandPageVisitStats> => {
  const id = toObjectId(String(businessId));
  const today = getISTDateString();
  const last7 = lastNIstDates(7);

  const [todayDoc, visitsLast7Days, visitsTotal] = await Promise.all([
    BrandPageVisit.findOne({ businessId: id, dateIST: today }).select("count").lean(),
    sumVisitCounts(id, { dateIST: { $in: last7 } }),
    sumVisitCounts(id),
  ]);

  return {
    visitsToday: Number(todayDoc?.count) || 0,
    visitsLast7Days,
    visitsTotal,
  };
};

export const getPublicBrandPage = async ({
  slug,
  viewerUid,
}: ServiceParams & { viewerUid?: string }): Promise<PublicBrandPage> => {
  const business = await findActiveBusinessBySlug(String(slug));
  const [plans, events] = await Promise.all([
    listPublicPlans(toObjectId(String(business._id)), viewerUid),
    listPublicEvents(String(business.ownerId)),
  ]);

  return {
    business: toPublicBusiness(business),
    plans,
    events,
    categories: [...BRAND_PAGE_CATEGORIES],
  };
};

export const recordVisit = async ({ slug, visitorHash, viewerUid }: ServiceParams) => {
  const business = await findActiveBusinessBySlug(String(slug));
  const businessId = toObjectId(String(business._id));
  const dateIST = getISTDateString();
  const hash =
    typeof visitorHash === "string" && visitorHash.trim() ? visitorHash.trim() : null;
  const memberId = await findMemberIdByViewerUid(businessId, viewerUid);
  const addToSet: Record<string, unknown> = {};
  if (hash) addToSet.uniqueVisitorHashes = hash;
  if (memberId) addToSet.memberIds = memberId;

  if (hash) {
    const incremented = await BrandPageVisit.findOneAndUpdate(
      { businessId, dateIST, uniqueVisitorHashes: { $ne: hash } },
      {
        $inc: { count: 1 },
        ...(Object.keys(addToSet).length ? { $addToSet: addToSet } : {}),
      },
      { new: true },
    );
    if (incremented) {
      if (memberId) {
        await BrandPageVisit.updateOne(
          { _id: incremented._id },
          { $addToSet: { memberIds: memberId } },
        );
      }
      return { visitsToday: Number(incremented.count) || 0 };
    }

    const existing = await BrandPageVisit.findOne({ businessId, dateIST }).select("count").lean();
    if (existing) {
      if (memberId) {
        await BrandPageVisit.updateOne(
          { _id: existing._id },
          { $addToSet: { memberIds: memberId } },
        );
      }
      return { visitsToday: Number(existing.count) || 0 };
    }
  }

  try {
    await BrandPageVisit.updateOne(
      { businessId, dateIST },
      {
        $inc: { count: 1 },
        ...(Object.keys(addToSet).length ? { $addToSet: addToSet } : {}),
        $setOnInsert: { businessId, dateIST },
      },
      { upsert: true },
    );
  } catch (error) {
    if (!isMongoDuplicateKeyError(error)) {
      throw error;
    }
  }

  const todayDoc = await BrandPageVisit.findOne({ businessId, dateIST }).select("count").lean();
  return { visitsToday: Number(todayDoc?.count) || 0 };
};

export const getOwnerBrandPage = async ({
  businessId,
  business,
}: ServiceParams): Promise<OwnerBrandPage> => {
  const profile =
    (business as IBusiness | undefined) ||
    ((await Business.findById(businessId).lean()) as IBusiness | null);

  if (!profile) {
    throw codedError("business_not_found", "Gym business profile not found.");
  }

  const id = toObjectId(String(profile._id));
  const [plans, events, stats] = await Promise.all([
    listPublicPlans(id),
    listPublicEvents(String(profile.ownerId)),
    getVisitStats({ businessId: id }),
  ]);

  const slug = profile.slug ? String(profile.slug) : null;

  return {
    business: toPublicBusiness(profile),
    plans,
    events,
    categories: [...BRAND_PAGE_CATEGORIES],
    stats,
    shareUrl: buildShareUrl(slug),
  };
};

export default {
  getPublicBrandPage,
  recordVisit,
  getVisitStats,
  getOwnerBrandPage,
};

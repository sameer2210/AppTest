import mongoose from "mongoose";
import Business from "../features/gym-business/models/business.model.js";
import MembershipPlan from "../features/gym-business/models/membershipPlan.model.js";

/** Active plans that are public, including ones saved before visibility existed. */
export const publicPlanFilter = {
  status: "ACTIVE",
  isDeleted: false,
  $or: [
    { visibility: "PUBLIC" },
    { visibility: null },
    { visibility: { $exists: false } },
  ],
};

export const isPublicPlanVisibility = (visibility) =>
  visibility == null || visibility === "PUBLIC";

const listingCategoryOf = (value) =>
  value === "workshop" || value === "class" || value === "training" ? value : "plan";

const mapPlan = (plan) => {
  const listingCategory = listingCategoryOf(plan.listingCategory);
  const perks = Array.isArray(plan.perks) ? plan.perks : [];
  return {
    id: String(plan._id),
    name: plan.name || "Membership Plan",
    price: Number(plan.price) || 0,
    billingCycle: plan.billingCycle || "MONTHLY",
    billingText: plan.billingCycle || "MONTHLY",
    listingCategory,
    tags: listingCategory === "plan" ? ["Gym Access"] : [listingCategory],
    features: perks.length > 0 ? perks : ["Full gym access"],
    perks,
    duration: plan.duration,
    durationUnit: plan.durationUnit,
    isFreeTrial: Boolean(plan.isFreeTrial),
    visibility: plan.visibility || "PUBLIC",
  };
};

const mapGym = (business, plans) => {
  const photos = [
    ...(Array.isArray(business.galleryUrls) ? business.galleryUrls : []),
    business.bannerUrl,
    business.logo,
  ].filter(Boolean);

  return {
    id: String(business._id),
    businessName: business.businessName || "Fitness Center",
    slug: business.slug || null,
    location: business.location || "",
    phone: business.phone || "",
    logo: business.logo || null,
    mapLink: business.mapLink || "",
    services: Array.isArray(business.services) ? business.services : [],
    photos,
    openingHours: business.openingHours,
    plans,
  };
};

export const listPublicGyms = async () => {
  const businesses = await Business.find({ status: "ACTIVE" }).lean();
  const ids = businesses.map((row) => row._id);
  const plans = await MembershipPlan.find({
    businessId: { $in: ids },
    ...publicPlanFilter,
  }).lean();

  const byBusiness = new Map();
  for (const plan of plans) {
    const key = String(plan.businessId);
    const list = byBusiness.get(key) || [];
    list.push(mapPlan(plan));
    byBusiness.set(key, list);
  }

  return businesses.map((business) => mapGym(business, byBusiness.get(String(business._id)) || []));
};

export const getPublicGym = async (id) => {
  if (!mongoose.isValidObjectId(id)) return null;
  const business = await Business.findOne({ _id: id, status: "ACTIVE" }).lean();
  if (!business) return null;
  const plans = await MembershipPlan.find({
    businessId: business._id,
    ...publicPlanFilter,
  }).lean();
  return mapGym(business, plans.map(mapPlan));
};

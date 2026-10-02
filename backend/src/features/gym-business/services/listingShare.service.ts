import mongoose from "mongoose";
import Business from "../models/business.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";

export const getSharedListing = async (listingId: string) => {
  const id = String(listingId || "").trim();
  if (!id) return null;

  let business = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    business = await Business.findById(id).lean();
  }
  if (!business) {
    business = await Business.findOne({ ownerId: id }).lean();
  }
  if (!business) return null;

  const plans = await MembershipPlan.find({
    businessId: business._id,
    status: "ACTIVE",
    isDeleted: false,
  })
    .select("name price duration durationUnit")
    .limit(3)
    .lean();

  return { business, plans };
};

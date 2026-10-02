import Coupon from "../models/coupon.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import type { ICoupon } from "../types/index.js";
import { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

/**
 * List coupons in gym
 */
export const listCoupons = async ({ businessId, paginationParams }: ServiceParams) => {
  const { page = 1, limit = 20, skip = 0, sort = { createdAt: -1 }, search = "", status = "" } =
    paginationParams || {};

  const query: MongoFilter = { businessId, isDeleted: false };
  if (status && status !== "ALL") query.status = status;
  if (search) {
    query.code = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }

  const [total, coupons] = await Promise.all([
    Coupon.countDocuments(query),
    Coupon.find(query).populate("applicablePlanIds", "name price").sort(sort).skip(skip).limit(limit).lean(),
  ]);

  return {
    coupons,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get coupon by ID
 */
export const getCouponById = async ({ businessId, couponId }: ServiceParams) => {
  const coupon = await Coupon.findOne({
    _id: couponId,
    businessId,
    isDeleted: false,
  })
    .populate("applicablePlanIds", "name price billingCycle")
    .lean();

  if (!coupon) {
    throw codedError("coupon_not_found", "Coupon not found.");
  }

  return coupon;
};

/**
 * Create a new coupon
 */
export const createCoupon = async ({
  businessId,
  couponData,
}: ServiceParams): Promise<ICoupon> => {
  const code = String(couponData.code || "").trim().toUpperCase();
  const normalizedCode = code.toLowerCase();

  const existing = await Coupon.findOne({
    businessId,
    normalizedCode,
    isDeleted: false,
  }).select("_id").lean();

  if (existing) {
    throw codedError("conflict", `A coupon with code "${code}" already exists in your gym.`);
  }

  const coupon = await Coupon.create({
    businessId,
    code,
    normalizedCode,
    type: couponData.type,
    discountPercentage: couponData.discountPercentage ? Number(couponData.discountPercentage) : null,
    discountAmount: couponData.discountAmount ? Number(couponData.discountAmount) : null,
    minimumOrderValue: Number(couponData.minimumOrderValue) || 0,
    maximumDiscount: couponData.maximumDiscount ? Number(couponData.maximumDiscount) : null,
    totalCoupons: couponData.totalCoupons ? Number(couponData.totalCoupons) : null,
    usedCoupons: 0,
    startsAt: couponData.startsAt ? new Date(couponData.startsAt) : new Date(),
    expiresAt: new Date(couponData.expiresAt),
    applicablePlanIds: Array.isArray(couponData.applicablePlanIds) ? couponData.applicablePlanIds : [],
    status: couponData.status || "ACTIVE",
  });

  return coupon.toObject() as unknown as ICoupon;
};

/**
 * Update coupon
 */
export const updateCoupon = async ({ businessId, couponId, updateData }: ServiceParams) => {
  const coupon = await Coupon.findOne({ _id: couponId, businessId, isDeleted: false });
  if (!coupon) {
    throw codedError("coupon_not_found", "Coupon not found.");
  }

  const fields = [
    "discountPercentage",
    "discountAmount",
    "minimumOrderValue",
    "maximumDiscount",
    "totalCoupons",
    "expiresAt",
    "applicablePlanIds",
    "status",
  ];

  for (const field of fields) {
    if (updateData[field] !== undefined) {
      if (field === "expiresAt") {
        (coupon as ServiceParams)[field] = new Date(updateData[field] as string);
      } else {
        (coupon as ServiceParams)[field] = updateData[field];
      }
    }
  }

  await coupon.save();
  return coupon.toObject();
};

/**
 * Soft delete coupon
 */
export const deleteCoupon = async ({ businessId, couponId }: ServiceParams) => {
  const coupon = await Coupon.findOneAndUpdate(
    { _id: couponId, businessId, isDeleted: false },
    { $set: { isDeleted: true, status: "INACTIVE", deletedAt: new Date() } },
    { new: true },
  ).lean();

  if (!coupon) {
    throw codedError("coupon_not_found", "Coupon not found.");
  }

  return { message: "Coupon deleted successfully." };
};

/**
 * Validate coupon code against a plan / order amount and return computed discount
 */
export const validateCoupon = async ({ businessId, code, planId, orderAmount = 0 }: ServiceParams) => {
  const normalizedCode = String(code || "").trim().toLowerCase();
  const coupon = await Coupon.findOne({
    businessId,
    normalizedCode,
    isDeleted: false,
  }).lean();

  if (!coupon) {
    throw codedError("invalid_coupon", "Invalid or unrecognized coupon code.");
  }

  if (coupon.status !== "ACTIVE") {
    throw codedError("invalid_coupon", "This coupon is no longer active.");
  }

  const now = new Date();
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    throw codedError("invalid_coupon", "This coupon promotion has not started yet.");
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    throw codedError("invalid_coupon", "This coupon has expired.");
  }

  if (coupon.totalCoupons != null && coupon.usedCoupons >= coupon.totalCoupons) {
    throw codedError("invalid_coupon", "This coupon redemption limit has been reached.");
  }

  if (Array.isArray(coupon.applicablePlanIds) && coupon.applicablePlanIds.length > 0 && planId) {
    const isPlanApplicable = coupon.applicablePlanIds.some(
      (id) => String(id) === String(planId),
    );
    if (!isPlanApplicable) {
      throw codedError("invalid_coupon", "This coupon is not applicable to the selected membership plan.");
    }
  }

  const basePrice = Number(orderAmount) || 0;
  if (coupon.minimumOrderValue > 0 && basePrice < coupon.minimumOrderValue) {
    throw codedError(
      "invalid_coupon",
      `Minimum order value of ₹${coupon.minimumOrderValue} required to apply this coupon.`,
    );
  }

  let calculatedDiscount = 0;
  if (coupon.type === "PERCENTAGE") {
    calculatedDiscount = (basePrice * (coupon.discountPercentage || 0)) / 100;
    if (coupon.maximumDiscount != null && coupon.maximumDiscount > 0) {
      calculatedDiscount = Math.min(calculatedDiscount, coupon.maximumDiscount);
    }
  } else if (coupon.type === "FIXED_AMOUNT") {
    calculatedDiscount = Math.min(basePrice || coupon.discountAmount || 0, coupon.discountAmount || 0);
  }

  const discountAmount = Math.round(calculatedDiscount);
  const finalAmount = Math.max(0, Math.round(basePrice - discountAmount));

  return {
    valid: true,
    coupon: {
      _id: coupon._id,
      code: coupon.code,
      type: coupon.type,
      discountPercentage: coupon.discountPercentage,
      discountAmount: coupon.discountAmount,
    },
    discountAmount,
    finalAmount,
  };
};

export default {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};

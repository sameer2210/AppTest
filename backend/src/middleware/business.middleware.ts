import type { NextFunction, Request, Response } from "express";
import { Business } from "../features/gym-business/index.js";
import type { BusinessContext } from "../types/controller.util.js";

/**
 * Middleware to resolve the authenticated user's Business document.
 * Requires requireAuth to have run first.
 * Attaches req.business and req.businessId.
 */
export const requireBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: "Missing Bearer token." });
    }

    const business = await Business.findOne({ ownerId: uid }).select("-__v").lean();
    if (!business) {
      return res.status(404).json({
        success: false,
        code: "business_not_found",
        message: "Gym business profile not found. Please create your business profile.",
      });
    }

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "business_suspended",
        message: "This gym business account is suspended.",
      });
    }

    req.business = business as BusinessContext;
    req.businessId = business._id;

    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Soft tenant resolve for read endpoints that allow non-business users.
 * Missing business → continue without req.business (empty/null stubs).
 * SUSPENDED → same 403 as requireBusiness (never treat as “no business”).
 */
export const optionalBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return next();
    }

    const business = await Business.findOne({ ownerId: uid }).select("-__v").lean();
    if (!business) {
      return next();
    }

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "business_suspended",
        message: "This gym business account is suspended.",
      });
    }

    req.business = business as BusinessContext;
    req.businessId = business._id;
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Resolves the authenticated user's Business document, or provisions a draft
 * shell when one does not exist yet. Used for payout onboarding, where bank
 * details can be saved before the full gym profile.
 */
export const resolveOrCreateBusiness = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const uid = req.user?.uid;
    if (!uid) {
      return res.status(401).json({ success: false, message: "Missing Bearer token." });
    }

    let business = await Business.findOne({ ownerId: uid }).select("-__v").lean();
    if (!business) {
      const created = await Business.create({
        ownerId: uid,
        businessName: "Your Gym",
        status: "ACTIVE",
      });
      business = created.toObject();
    }

    if (business.status === "SUSPENDED") {
      return res.status(403).json({
        success: false,
        code: "business_suspended",
        message: "This gym business account is suspended.",
      });
    }

    req.business = business as BusinessContext;
    req.businessId = business._id;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default {
  requireBusiness,
  optionalBusiness,
  resolveOrCreateBusiness,
};

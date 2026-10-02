import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  couponIdParamSchema,
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
  listCouponsQuerySchema,
} from "../validators/coupon.validator.js";
import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} from "../controllers/coupon.controller.js";

const router = Router();

// Validate coupon code
router.post(
  "/validate",
  requireAuth,
  validateRequest(validateCouponSchema),
  requireBusiness,
  validateCoupon,
);

// List and create coupons
router.get(
  "/",
  requireAuth,
  validateRequest(listCouponsQuerySchema),
  optionalBusiness,
  listCoupons,
);
router.post(
  "/",
  requireAuth,
  validateRequest(createCouponSchema),
  requireBusiness,
  createCoupon,
);

// Single coupon operations
router.get(
  "/:couponId",
  requireAuth,
  validateRequest(couponIdParamSchema),
  requireBusiness,
  getCouponById,
);
router.patch(
  "/:couponId",
  requireAuth,
  validateRequest(updateCouponSchema),
  requireBusiness,
  updateCoupon,
);
router.delete(
  "/:couponId",
  requireAuth,
  validateRequest(couponIdParamSchema),
  requireBusiness,
  deleteCoupon,
);

export default router;

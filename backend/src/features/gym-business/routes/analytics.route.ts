import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getDashboardSummarySchema,
  getRevenueAnalyticsSchema,
  getMemberAnalyticsSchema,
  getAttendanceAnalyticsSchema,
  getPlanAnalyticsSchema,
  getCouponAnalyticsSchema,
  getListingAnalyticsSchema,
  getBrandPageAnalyticsSchema,
} from "../validators/analytics.validator.js";
import {
  getDashboardSummary,
  getRevenueAnalytics,
  getAttendanceAnalytics,
  getMemberAnalytics,
  getPlanAnalytics,
  getCouponAnalytics,
  getListingAnalytics,
  getBrandPageAnalytics,
} from "../controllers/analytics.controller.js";

const router = Router();

router.get("/dashboard", requireAuth, validateRequest(getDashboardSummarySchema), optionalBusiness, getDashboardSummary);
router.get("/revenue", requireAuth, validateRequest(getRevenueAnalyticsSchema), optionalBusiness, getRevenueAnalytics);
router.get("/members", requireAuth, validateRequest(getMemberAnalyticsSchema), optionalBusiness, getMemberAnalytics);
router.get("/attendance", requireAuth, validateRequest(getAttendanceAnalyticsSchema), optionalBusiness, getAttendanceAnalytics);
router.get("/plans", requireAuth, validateRequest(getPlanAnalyticsSchema), optionalBusiness, getPlanAnalytics);
router.get("/coupons", requireAuth, validateRequest(getCouponAnalyticsSchema), optionalBusiness, getCouponAnalytics);
router.get("/listings", requireAuth, validateRequest(getListingAnalyticsSchema), optionalBusiness, getListingAnalytics);
router.get("/brand-page", requireAuth, validateRequest(getBrandPageAnalyticsSchema), optionalBusiness, getBrandPageAnalytics);

export default router;

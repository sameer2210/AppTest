import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  createBusinessSchema,
  updateBusinessSchema,
  homeSummaryQuerySchema,
} from "../validators/business.validator.js";
import {
  getBusinessProfile,
  createBusinessProfile,
  updateBusinessProfile,
  getBusinessHomeSummary,
  getOwnerPlanDashboard,
} from "../controllers/business.controller.js";
import { getOwnerBrandPage } from "../controllers/brandPage.controller.js";

const router = Router();

// GET /api/v1/business/dashboard-summary - production gym plan dashboard
router.get("/dashboard-summary", requireAuth, optionalBusiness, getOwnerPlanDashboard);

// GET /api/v1/business/home-summary - owner home aggregate
router.get(
  "/home-summary",
  requireAuth,
  validateRequest(homeSummaryQuerySchema),
  requireBusiness,
  getBusinessHomeSummary,
);

// GET /api/v1/business/brand-page - owner brand page + visit stats
router.get("/brand-page", requireAuth, requireBusiness, getOwnerBrandPage);

// GET /api/v1/business - get gym business profile
router.get("/", requireAuth, optionalBusiness, getBusinessProfile);

// POST /api/v1/business - create initial gym profile
router.post(
  "/",
  requireAuth,
  validateRequest(createBusinessSchema),
  createBusinessProfile,
);

// PATCH /api/v1/business - update gym business profile
router.patch(
  "/",
  requireAuth,
  validateRequest(updateBusinessSchema),
  requireBusiness,
  updateBusinessProfile,
);

export default router;

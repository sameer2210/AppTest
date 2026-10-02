import { Router } from "express";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { publicBrandLimiter } from "../../../middleware/rateLimiter.js";
import { optionalAuth } from "../../../middleware/requireAuth.js";
import {
  slugParamSchema,
  recordVisitSchema,
} from "../validators/brandPage.validator.js";
import {
  getPublicBrandPage,
  recordBrandPageVisit,
} from "../controllers/brandPage.controller.js";

const router = Router();

router.get(
  "/:slug",
  publicBrandLimiter,
  optionalAuth,
  validateRequest(slugParamSchema),
  getPublicBrandPage,
);

router.post(
  "/:slug/visit",
  publicBrandLimiter,
  optionalAuth,
  validateRequest(recordVisitSchema),
  recordBrandPageVisit,
);

export default router;

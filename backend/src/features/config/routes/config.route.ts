import express from "express";
import { adminActionLimiter } from "../../../middleware/rateLimiter.js";
import { requireInternalToken } from "../../../middleware/requireInternalToken.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { triggerConfigRefresh } from "../controllers/config.controller.js";
import { refreshConfigSchema } from "../validators/config.validator.js";

const router = express.Router();

router.get(
  "/refresh",
  adminActionLimiter,
  requireInternalToken,
  validateRequest(refreshConfigSchema),
  triggerConfigRefresh,
);

export default router;

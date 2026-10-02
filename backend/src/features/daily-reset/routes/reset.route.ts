import express from "express";
import { triggerDailyReset } from "../controllers/reset.controller.js";
import { requireInternalToken } from "../../../middleware/requireInternalToken.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { triggerDailyResetSchema } from "../validators/reset.validator.js";

const router = express.Router();

router.post(
  "/",
  requireInternalToken,
  validateRequest(triggerDailyResetSchema),
  triggerDailyReset,
);

export default router;

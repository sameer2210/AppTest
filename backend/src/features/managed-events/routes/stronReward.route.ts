// Reward routes for STRON Managed Events. Mounted at /api/stron/rewards.

import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getRewardHandler,
  listMyRewardsHandler,
  listRewardPreviewsHandler,
} from "../controllers/stronReward.controller.js";
import { rewardIdParamSchema } from "../validators/stronEvent.validator.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listMyRewardsHandler);
router.get("/previews", listRewardPreviewsHandler);
router.get("/:rewardId", validateRequest(rewardIdParamSchema), getRewardHandler);

export default router;

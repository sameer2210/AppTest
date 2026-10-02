import express from "express";
import { getOpinion, toggleLikeOpinion, voteOpinion } from "../controllers/opinion.controller.js";
import { optionalAuth, requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  voteOpinionSchema,
  toggleLikeOpinionSchema,
} from "../validators/opinion.validator.js";

const router = express.Router();

router.get("/current", optionalAuth, getOpinion);
router.post("/vote", requireAuth, validateRequest(voteOpinionSchema), voteOpinion);
router.post("/like", requireAuth, validateRequest(toggleLikeOpinionSchema), toggleLikeOpinion);

export default router;

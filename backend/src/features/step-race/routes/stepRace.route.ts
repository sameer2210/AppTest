import express from "express";
import {
  getStepRaceStats,
  searchOpponents,
  getRandomShadowOpponents,
  createStepRace,
  getActiveRace,
  updateRaceProgress,
  completeRace,
  getLeaderboard,
  getRivalryHistory,
  getStepRaceHistory,
} from "../controllers/stepRace.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  searchOpponentsSchema,
  createStepRaceSchema,
  updateRaceProgressSchema,
  completeRaceSchema,
  rivalryHistorySchema,
  userIdParamSchema,
  leaderboardQuerySchema,
} from "../validators/stepRace.validator.js";

const router = express.Router();

router.use(requireAuth);

// Get step race statistics
router.get("/stats/:userId", validateRequest(userIdParamSchema), getStepRaceStats);

// Get match history
router.get("/history/:userId", validateRequest(userIdParamSchema), getStepRaceHistory);

// Search for opponents
router.get("/search", validateRequest(searchOpponentsSchema), searchOpponents);

// Get random shadow opponents
router.get("/shadows", getRandomShadowOpponents);

// Get rivalry history with opponent
router.get("/rivalry", validateRequest(rivalryHistorySchema), getRivalryHistory);

// Create a new step race
router.post("/create", validateRequest(createStepRaceSchema), createStepRace);

// Get active race for a user
router.get("/active/:userId", validateRequest(userIdParamSchema), getActiveRace);

// Update race progress
router.post("/update", validateRequest(updateRaceProgressSchema), updateRaceProgress);

// Complete a race
router.post("/complete", validateRequest(completeRaceSchema), completeRace);

// Get leaderboard
router.get("/leaderboard", validateRequest(leaderboardQuerySchema), getLeaderboard);

export default router;

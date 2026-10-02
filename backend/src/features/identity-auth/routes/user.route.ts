import express from "express";
import { stepSyncLimiter } from "../../../middleware/rateLimiter.js";
import {
  getUserProfile,
  syncUserSteps,
  getActivityHistory,
  updateUserProfile,
  getLifetimeStats,
  syncPastSteps,
  checkIsAdmin,
  deleteAccount,
  getMyRoles,
} from "../controllers/user.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  uidParamSchema,
  updateUserProfileSchema,
  syncUserStepsSchema,
  syncPastStepsSchema,
} from "../validators/user.validator.js";

const router = express.Router();

router.use(requireAuth);

router.get("/me/roles", getMyRoles);
router.get("/profile/:uid", validateRequest(uidParamSchema), getUserProfile);
router.get("/is-admin/:uid", validateRequest(uidParamSchema), checkIsAdmin);
router.put("/profile/:uid", validateRequest(updateUserProfileSchema), updateUserProfile);
router.delete("/account/:uid", validateRequest(uidParamSchema), deleteAccount);
router.post("/sync-steps", stepSyncLimiter, validateRequest(syncUserStepsSchema), syncUserSteps);
router.post("/sync-past-steps", stepSyncLimiter, validateRequest(syncPastStepsSchema), syncPastSteps);

router.get("/activity/:uid", validateRequest(uidParamSchema), getActivityHistory);
router.get("/activity/stats/:uid", validateRequest(uidParamSchema), getLifetimeStats);

export default router;

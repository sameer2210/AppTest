// Event routes for STRON Managed Events. Mounted at /api/stron/events.
// Public reads (catalog, detail) are open; all writes require auth.

import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  cancelEventHandler,
  createFaceOff,
  createKingOfHill,
  createMarathon,
  createStepChallenge,
  deleteDraftHandler,
  getCatalogHandler,
  getEventDetailHandler,
  getMyEventsHandler,
  getOfficialHomeFeedHandler,
  patchEvent,
  publishEventHandler,
} from "../controllers/stronEvent.controller.js";
import {
  createOrderHandler,
  validateCouponHandler,
  getMyParticipationHandler,
  getMyActivityHandler,
  getMyParticipantInfoPrefillHandler,
} from "../controllers/stronParticipation.controller.js";
import {
  getLeaderboardHandler,
  getMatchesHandler,
  getProgressHandler,
} from "../controllers/stronParticipantView.controller.js";
import { eventDashboardHandler } from "../controllers/stronDashboard.controller.js";
import {
  catalogQuerySchema,
  cancelEventSchema,
  createEventBodySchema,
  createOrderSchema,
  eventKeyParamSchema,
  patchEventSchema,
  validateCouponSchema,
} from "../validators/stronEvent.validator.js";

const router = express.Router();

router.get("/catalog", validateRequest(catalogQuerySchema), getCatalogHandler);
router.get("/home-feed-official", getOfficialHomeFeedHandler);
router.get("/mine", requireAuth, getMyEventsHandler);
router.get("/my-activity", requireAuth, getMyActivityHandler);
router.get(
  "/my-participant-info-prefill",
  requireAuth,
  getMyParticipantInfoPrefillHandler,
);

router.post(
  "/marathon",
  requireAuth,
  validateRequest(createEventBodySchema),
  createMarathon,
);
router.post(
  "/step-challenge",
  requireAuth,
  validateRequest(createEventBodySchema),
  createStepChallenge,
);
router.post(
  "/king-of-the-hill",
  requireAuth,
  validateRequest(createEventBodySchema),
  createKingOfHill,
);
router.post("/face-off", requireAuth, validateRequest(createEventBodySchema), createFaceOff);

router.post(
  "/:key/order",
  requireAuth,
  validateRequest(createOrderSchema),
  createOrderHandler,
);
router.post(
  "/:key/validate-coupon",
  requireAuth,
  validateRequest(validateCouponSchema),
  validateCouponHandler,
);
router.get("/:key/my-participation", requireAuth, validateRequest(eventKeyParamSchema), getMyParticipationHandler);
router.get("/:key/progress", requireAuth, validateRequest(eventKeyParamSchema), getProgressHandler);
router.get("/:key/leaderboard", validateRequest(eventKeyParamSchema), getLeaderboardHandler);
router.get("/:key/matches", requireAuth, validateRequest(eventKeyParamSchema), getMatchesHandler);

router.get("/:key/dashboard", requireAuth, validateRequest(eventKeyParamSchema), eventDashboardHandler);

router.patch("/:key", requireAuth, validateRequest(patchEventSchema), patchEvent);
router.post("/:key/publish", requireAuth, validateRequest(eventKeyParamSchema), publishEventHandler);
router.post("/:key/cancel", requireAuth, validateRequest(cancelEventSchema), cancelEventHandler);
router.delete("/:key", requireAuth, validateRequest(eventKeyParamSchema), deleteDraftHandler);

router.get("/:key", validateRequest(eventKeyParamSchema), getEventDetailHandler);

export default router;

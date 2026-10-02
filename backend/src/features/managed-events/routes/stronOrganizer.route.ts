// Organizer routes for STRON Managed Events. Mounted at /api/stron/organizer.

import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getMyOrganizer,
  onboardOrganizer,
  updateOrganizerKyc,
} from "../controllers/stronOrganizer.controller.js";
import { organizerDashboardHandler } from "../controllers/stronDashboard.controller.js";
import {
  onboardOrganizerSchema,
  updateKycSchema,
} from "../validators/stronEvent.validator.js";

const router = express.Router();

router.use(requireAuth);

router.post("/", validateRequest(onboardOrganizerSchema), onboardOrganizer);
router.get("/me", getMyOrganizer);
router.put("/kyc", validateRequest(updateKycSchema), updateOrganizerKyc);
router.get("/dashboard", organizerDashboardHandler);

export default router;

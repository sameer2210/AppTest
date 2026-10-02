import { Router } from "express";
import { openSharedEventPage } from "../controllers/eventShare.controller.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { eventKeyParamSchema } from "../validators/stronEvent.validator.js";

const router = Router();
router.get("/:key", validateRequest(eventKeyParamSchema), openSharedEventPage);

export default router;

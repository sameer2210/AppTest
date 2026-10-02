import express from "express";
import { submitFeedback } from "../controllers/feedback.controller.js";
import { optionalAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { submitFeedbackSchema } from "../validators/feedback.validator.js";

const router = express.Router();

router.post("/", optionalAuth, validateRequest(submitFeedbackSchema), submitFeedback);

export default router;

import { Router } from "express";
import { publicWhatsappWebhookLimiter } from "../../../middleware/rateLimiter.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { whatsappWebhookVerifySchema } from "../validators/whatsapp.validator.js";
import {
  handleWhatsappWebhook,
  verifyWhatsappWebhook,
} from "../controllers/whatsappWebhook.controller.js";

const router = Router();

router.get(
  "/",
  publicWhatsappWebhookLimiter,
  validateRequest(whatsappWebhookVerifySchema),
  verifyWhatsappWebhook,
);
router.post("/", publicWhatsappWebhookLimiter, handleWhatsappWebhook);

export default router;

import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  reminderTypeParamSchema,
  updateReminderConfigSchema,
  sendBroadcastSchema,
  listMessagesQuerySchema,
} from "../validators/whatsapp.validator.js";
import {
  getWallet,
  listReminders,
  updateReminder,
  previewReminderRecipients,
  sendBroadcast,
  listMessages,
} from "../controllers/whatsapp.controller.js";

const router = Router();

router.get("/wallet", requireAuth, requireBusiness, getWallet);
router.get("/reminders", requireAuth, requireBusiness, listReminders);
router.patch(
  "/reminders/:type",
  requireAuth,
  validateRequest(updateReminderConfigSchema),
  requireBusiness,
  updateReminder,
);
router.get(
  "/reminders/:type/recipients",
  requireAuth,
  validateRequest(reminderTypeParamSchema),
  requireBusiness,
  previewReminderRecipients,
);
router.post(
  "/broadcast",
  requireAuth,
  validateRequest(sendBroadcastSchema),
  requireBusiness,
  sendBroadcast,
);
router.get(
  "/messages",
  requireAuth,
  validateRequest(listMessagesQuerySchema),
  requireBusiness,
  listMessages,
);

export default router;

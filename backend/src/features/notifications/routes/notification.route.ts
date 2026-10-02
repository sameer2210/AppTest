import express from "express";
import {
  registerFcmToken,
  unregisterFcmToken,
  sendTestNotification,
  trackNotificationOpened,
  listNotificationsHandler,
  unreadCountHandler,
  dismissNotificationHandler,
  markReadHandler,
  markAllReadHandler,
} from "../controllers/notification.controller.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireAdmin } from "../../../middleware/requireAdmin.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  notificationIdParamSchema,
  registerFcmTokenSchema,
  unregisterFcmTokenSchema,
  sendTestNotificationSchema,
  trackNotificationOpenedSchema,
  listNotificationsQuerySchema,
} from "../validators/notification.validator.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", validateRequest(listNotificationsQuerySchema), listNotificationsHandler);
router.get("/unread-count", unreadCountHandler);
router.post("/read-all", markAllReadHandler);
router.delete("/:id", validateRequest(notificationIdParamSchema), dismissNotificationHandler);
router.post("/:id/read", validateRequest(notificationIdParamSchema), markReadHandler);
router.post("/register-token", validateRequest(registerFcmTokenSchema), registerFcmToken);
router.post("/unregister-token", validateRequest(unregisterFcmTokenSchema), unregisterFcmToken);
router.post("/opened", validateRequest(trackNotificationOpenedSchema), trackNotificationOpened);
router.post("/send-test", requireAdmin, validateRequest(sendTestNotificationSchema), sendTestNotification);

export default router;

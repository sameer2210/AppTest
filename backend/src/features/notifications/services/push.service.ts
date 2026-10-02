import { admin } from "../../../config/firebase.js";
import type { Message } from "firebase-admin/messaging";
import FcmTokenModel from "../models/fcmToken.model.js";
import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../../../services/analytics.service.js";
import { logger } from "../../../utils/logger.util.js";

export const sendNotificationToUser = async (
  userId: string,
  title: string,
  body: string,
  imageUrl: string | undefined = undefined,
) => {
  if (!userId || userId.startsWith("bot_")) {
    return;
  }

  try {
    const fcmDoc = await FcmTokenModel.findById(userId);

    if (!fcmDoc || !fcmDoc.token) {
      return;
    }

    const token = fcmDoc.token;

    const message: Message = {
      notification: { title, body },
      android: {
        priority: "high" as const,
        notification: {
          icon: "ic_notification",
          ...(imageUrl && { imageUrl }),
          priority: "high" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      token: token,
    };

    await admin.messaging().send(message);
    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_SENT, {
      user_id: userId,
      notification_title: title,
    });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      try {
        await FcmTokenModel.updateOne({ _id: userId }, { $set: { token: null } });
      } catch (dbError) {
        logger.error(`[Notification] Failed to null token for user ${userId}:`, dbError);
      }
    } else {
      logger.error(`[Notification] Error sending notification to user ${userId}:`, error);
    }
  }
};

export const sendNotificationToToken = async (
  token: string,
  title: string,
  body: string,
  imageUrl?: string,
) => {
  if (!token) {
    return;
  }
  try {
    const message: Message = {
      notification: { title, body },
      android: {
        priority: "high" as const,
        notification: {
          icon: "ic_notification",
          ...(imageUrl && { imageUrl }),
          priority: "high" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
        },
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      token: token,
    };
    await admin.messaging().send(message);
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "messaging/registration-token-not-registered") {
      logger.warn(`[Notification] Token ${token} is not registered.`);
    } else {
      logger.error(`[Notification] Error sending single notification to ${token}:`, error);
    }
  }
};

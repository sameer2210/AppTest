import type { Request, Response } from "express";
import { sendNotificationToToken } from "../services/push.service.js";
import {
  ANALYTICS_EVENTS,
  trackEvent,
} from "../../../services/analytics.service.js";
import { assertSelfUid, getRequesterUid } from "../../../utils/authOwnership.util.js";
import { routeParam, queryNumber } from "../../../types/controller.util.js";
import {
  dismissNotification,
  getUnreadCount,
  listInboxNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/userInbox.service.js";
import {
  registerUserFcmToken,
  unregisterUserFcmToken,
} from "../services/fcmToken.service.js";
import { codedError, sendError } from "../../../utils/stronHttpError.util.js";

export const listNotificationsHandler = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }
  try {
    const notifications = await listInboxNotifications(uid, {
      limit: queryNumber(req.query?.limit),
    });
    const unreadCount = await getUnreadCount(uid);
    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    return sendError(res, error);
  }
};

export const unreadCountHandler = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }
  try {
    const unreadCount = await getUnreadCount(uid);
    return res.status(200).json({ success: true, unreadCount });
  } catch (error) {
    return sendError(res, error);
  }
};

export const markReadHandler = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }
  try {
    const row = await markNotificationRead(uid, routeParam(req.params.id));
    if (!row) {
      return sendError(res, codedError("not_found", "Notification not found."));
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
};

export const markAllReadHandler = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }
  try {
    const modifiedCount = await markAllNotificationsRead(uid);
    return res.status(200).json({ success: true, modifiedCount });
  } catch (error) {
    return sendError(res, error);
  }
};

export const dismissNotificationHandler = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }
  try {
    const row = await dismissNotification(uid, routeParam(req.params.id));
    if (!row) {
      return sendError(res, codedError("not_found", "Notification not found."));
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    return sendError(res, error);
  }
};

export const registerFcmToken = async (req: Request, res: Response) => {
  const { uid, token } = req.body || {};

  if (!uid || !token) {
    return sendError(res, codedError("validation_error", "User UID and FCM token are required."));
  }

  const ownershipError = assertSelfUid(req, res, uid);
  if (ownershipError) return ownershipError;

  try {
    await registerUserFcmToken({ uid, token });
    return res.status(200).json({ success: true, message: "FCM token registered successfully." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const unregisterFcmToken = async (req: Request, res: Response) => {
  const { uid, token } = req.body || {};

  if (!uid || !token) {
    return sendError(res, codedError("validation_error", "User UID and FCM token are required."));
  }

  const ownershipError = assertSelfUid(req, res, uid);
  if (ownershipError) return ownershipError;

  try {
    await unregisterUserFcmToken({ uid, token });
    return res.status(200).json({ success: true, message: "FCM token unregistered successfully." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const trackNotificationOpened = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  const notificationTitle = String(
    req.body?.notification_title || req.body?.title || "",
  ).trim();

  if (!uid) {
    return sendError(res, codedError("unauthorized", "Authentication required."));
  }

  try {
    trackEvent(ANALYTICS_EVENTS.NOTIFICATION_OPENED, {
      user_id: uid,
      notification_title: notificationTitle,
    });

    return res.status(200).json({ success: true, message: "Notification opened tracked." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const sendTestNotification = async (req: Request, res: Response) => {
  const { token, title, body, imageUrl } = req.body || {};

  if (!token || !title || !body) {
    return sendError(res, codedError("validation_error", "A 'token', 'title', and 'body' are required."));
  }

  try {
    await sendNotificationToToken(token, title, body, imageUrl);
    return res.status(200).json({ success: true, message: "Test notification sent." });
  } catch (error) {
    return sendError(res, error);
  }
};

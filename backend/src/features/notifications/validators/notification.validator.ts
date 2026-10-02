import { z } from "zod";

export const notificationIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Notification ID is required"),
  }),
};

export const registerFcmTokenSchema = {
  body: z.object({
    uid: z.string().min(1, "User UID is required"),
    token: z.string().min(1, "FCM token is required"),
  }),
};

export const unregisterFcmTokenSchema = {
  body: z.object({
    uid: z.string().min(1, "User UID is required"),
    token: z.string().min(1, "FCM token is required"),
  }),
};

export const sendTestNotificationSchema = {
  body: z.object({
    token: z.string().min(1, "Token is required"),
    title: z.string().min(1, "Title is required"),
    body: z.string().min(1, "Body is required"),
    imageUrl: z.string().url().optional().nullable(),
  }),
};

export const trackNotificationOpenedSchema = {
  body: z.object({
    notification_title: z.string().optional(),
    title: z.string().optional(),
  }),
};

export const listNotificationsQuerySchema = {
  query: z.object({
    limit: z.coerce.number().positive().max(100).optional(),
  }),
};

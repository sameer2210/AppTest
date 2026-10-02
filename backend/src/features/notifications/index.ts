/**
 * Notifications — routes, push helpers, inbox.
 */

export { default as FcmToken } from "./models/fcmToken.model.js";
export { default as UserNotification } from "./models/userNotification.model.js";

export * as fcmTokenService from "./services/fcmToken.service.js";
export * as userInboxService from "./services/userInbox.service.js";
export { createInboxNotification } from "./services/userInbox.service.js";
export { sendNotificationToUser, sendNotificationToToken } from "./services/push.service.js";

export * from "./types/index.js";

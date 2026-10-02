import {
  InboxNotificationService,
  syncAppBadgeCount,
} from "@/services/notification/inboxNotification.service";
import * as PushNotification from "@/services/notification/pushNotification.service";

const registerFcmToken = (uid: string, token: string) =>
  PushNotification.registerFcmTokenToServer(uid, token);

export const NotificationsApi = {
  inbox: InboxNotificationService,
  push: PushNotification,
  registerFcmToken,
  syncAppBadgeCount,
};

export { syncAppBadgeCount } from "@/services/notification/inboxNotification.service";
export {
  requestPushNotificationPermission,
  hasPushNotificationPermission,
  initializePushNotifications,
} from "@/services/notification/pushNotification.service";
export type {
  InboxNotification,
  OpinionResultData,
  OpinionResultOption,
} from "@/services/notification/inboxNotification.service";

export default NotificationsApi;

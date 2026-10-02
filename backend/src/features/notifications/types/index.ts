import type { UserScopedEntity } from "../../../types/domain.base.js";

export type NotificationPlatform = "ANDROID" | "IOS" | "WEB";

export interface IFcmToken extends UserScopedEntity {
  token: string;
  deviceType?: NotificationPlatform | string;
  deviceId?: string | null;
  isActive?: boolean;
  lastUsedAt?: Date;
}

export type NotificationCategory =
  | "SYSTEM"
  | "EVENT"
  | "GYM"
  | "REMINDER"
  | "REWARD"
  | "OPINION"
  | "STEP_RACE"
  | "ANNOUNCEMENT"
  | string;

export interface IUserNotification extends UserScopedEntity {
  title: string;
  body: string;
  category?: NotificationCategory;
  imageUrl?: string | null;
  deepLink?: string | null;
  metadata?: Record<string, unknown>;
  read: boolean;
  readAt?: Date | null;
  isDeleted?: boolean;
}

export interface SendPushNotificationParams
  extends Pick<IUserNotification, "uid" | "title" | "body"> {
  category?: NotificationCategory;
  imageUrl?: string;
  data?: Record<string, string>;
  deepLink?: string;
}

export interface NotificationInboxResponse {
  notifications: IUserNotification[];
  unreadCount: number;
}

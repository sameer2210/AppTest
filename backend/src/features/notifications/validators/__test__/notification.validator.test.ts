import { describe, it, expect } from "vitest";
import {
  notificationIdParamSchema,
  registerFcmTokenSchema,
  unregisterFcmTokenSchema,
  sendTestNotificationSchema,
  trackNotificationOpenedSchema,
  listNotificationsQuerySchema,
} from "../notification.validator.js";

describe("notifications: notification.validator", () => {
  it("validates notificationIdParamSchema", () => {
    expect(notificationIdParamSchema.params.safeParse({ id: "notif-1" }).success).toBe(true);
    expect(notificationIdParamSchema.params.safeParse({ id: "" }).success).toBe(false);
  });

  it("validates registerFcmTokenSchema and unregisterFcmTokenSchema", () => {
    expect(
      registerFcmTokenSchema.body.safeParse({
        uid: "user-1",
        token: "fcm-token-xyz",
      }).success,
    ).toBe(true);

    expect(
      registerFcmTokenSchema.body.safeParse({
        uid: "",
        token: "fcm-token-xyz",
      }).success,
    ).toBe(false);

    expect(
      unregisterFcmTokenSchema.body.safeParse({
        uid: "user-1",
        token: "fcm-token-xyz",
      }).success,
    ).toBe(true);
  });

  it("validates sendTestNotificationSchema", () => {
    expect(
      sendTestNotificationSchema.body.safeParse({
        token: "token-1",
        title: "Test Alert",
        body: "This is a test",
        imageUrl: "https://example.com/image.png",
      }).success,
    ).toBe(true);

    expect(
      sendTestNotificationSchema.body.safeParse({
        token: "",
        title: "Test Alert",
        body: "This is a test",
      }).success,
    ).toBe(false);
  });

  it("validates trackNotificationOpenedSchema and listNotificationsQuerySchema", () => {
    expect(
      trackNotificationOpenedSchema.body.safeParse({
        title: "Opened Title",
      }).success,
    ).toBe(true);

    expect(
      listNotificationsQuerySchema.query.safeParse({
        limit: "25",
      }).success,
    ).toBe(true);

    expect(
      listNotificationsQuerySchema.query.safeParse({
        limit: "150",
      }).success,
    ).toBe(false);
  });
});

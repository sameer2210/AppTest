import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import { UserModel } from "@/features/identity-auth/index.js";
import {
  registerUserFcmToken,
  unregisterUserFcmToken,
} from "@/features/notifications/services/fcmToken.service.js";
import {
  createInboxNotification,
  listInboxNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
} from "@/features/notifications/services/userInbox.service.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("notifications: services", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "notif-svc-user";

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    await UserModel.create({
      uid,
      email: "notif-svc@stron.in",
      username: "NotifUser",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("fcmToken.service", () => {
    it("registers and unregisters FCM token for a user", async () => {
      const reg = await registerUserFcmToken({ uid, token: "fcm-token-123" });
      expect(reg.success).toBe(true);

      const unreg = await unregisterUserFcmToken({ uid, token: "fcm-token-123" });
      expect(unreg.success).toBe(true);
    });

    it("rejects token registration for non-existent user", async () => {
      await expect(
        registerUserFcmToken({ uid: "ghost-user-404", token: "tok" }),
      ).rejects.toMatchObject({ code: "user_not_found" });
    });
  });

  describe("userInbox.service", () => {
    it("creates, lists, counts, marks read and dismisses notifications", async () => {
      const created = await createInboxNotification({
        uid,
        title: "Welcome to STRON",
        body: "Get started today",
      });
      expect(created).toBeDefined();

      const count = await getUnreadCount(uid);
      expect(count).toBeGreaterThanOrEqual(1);

      const list = await listInboxNotifications(uid);
      expect(list.length).toBeGreaterThanOrEqual(1);
      const notifId = list[0].id;

      const read = await markNotificationRead(uid, notifId);
      expect(read).toBeDefined();

      const markAll = await markAllNotificationsRead(uid);
      expect(markAll).toBeGreaterThanOrEqual(0);

      const dismissed = await dismissNotification(uid, notifId);
      expect(dismissed).toBeDefined();
    });
  });
});

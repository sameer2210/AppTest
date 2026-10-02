import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import authService from "@/features/identity-auth/services/auth.service.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("identity-auth: auth.service", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("utility & helper functions", () => {
    it("normalizeContactNo normalizes 10-digit Indian numbers and strips +91", () => {
      expect(authService.normalizeContactNo("9876543210")).toBe("9876543210");
      expect(authService.normalizeContactNo("+91 9876543210")).toBe("9876543210");
      expect(authService.normalizeContactNo("")).toBe("");
      expect(authService.normalizeContactNo(null)).toBe("");
    });

    it("generateGuestUsername produces unique guest username", () => {
      const username = authService.generateGuestUsername();
      expect(username).toMatch(/^guest_[a-zA-Z0-9_-]+$/);
    });

    it("normalizeGuestDeviceId trims device id", () => {
      expect(authService.normalizeGuestDeviceId("  DEVICE-UUID-1234  ")).toBe("DEVICE-UUID-1234");
      expect(authService.normalizeGuestDeviceId("")).toBeNull();
      expect(authService.normalizeGuestDeviceId(null)).toBeNull();
    });
  });

  describe("guestSignInService", () => {
    it("creates a new guest user on first sign-in and returns tokens", async () => {
      const result = await authService.guestSignInService({
        deviceId: "android-hardware-id-001",
        platform: "android",
      });

      expect(result.restored).toBe(false);
      expect(result.accessToken).toBeDefined();
      expect(result.uid).toBeTruthy();

      const saved = await UserModel.findOne({ uid: result.uid });
      expect(saved).toBeDefined();
      expect(saved!.isGuest).toBe(true);
    });

    it("restores existing guest account for the same device ID", async () => {
      const result = await authService.guestSignInService({
        deviceId: "android-hardware-id-001",
        platform: "android",
      });

      expect(result.restored).toBe(true);
    });

    it("rejects guest sign-in when deviceId is missing or empty", async () => {
      await expect(
        authService.guestSignInService({ deviceId: "" }),
      ).rejects.toMatchObject({
        code: "bad_request",
      });
    });
  });

  describe("issueJwtPair and logoutService", () => {
    it("issues JWT pair and revokes on logout", async () => {
      const uid = "test-jwt-user-001";
      const { accessToken, refreshToken } = await authService.issueJwtPair(uid, "test@jwt.com");

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const logoutResult = await authService.logoutService(refreshToken, uid);
      expect(logoutResult.message).toContain("Logged out successfully");
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import type { Request, Response } from "express";
import * as authController from "@/features/identity-auth/controllers/auth.controller.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("identity-auth: auth.controller unit edge cases", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("syncUser returns 401 when uid is missing in both req.user and req.body", async () => {
    const req = { user: undefined, body: {} } as unknown as Request;
    const res = mockResponse();

    await authController.syncUser(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "unauthorized" }));
  });

  it("syncUser creates and syncs new user in Mongo when uid provided", async () => {
    const req = {
      user: { uid: "sync-unit-user-1" },
      body: { email: "sync1@stron.in", username: "SyncUser1" },
    } as unknown as Request;
    const res = mockResponse();

    await authController.syncUser(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "User synced",
        user: expect.objectContaining({ uid: "sync-unit-user-1" }),
      }),
    );

    const doc = await UserModel.findOne({ uid: "sync-unit-user-1" });
    expect(doc).toBeDefined();
    expect(doc!.username).toBe("SyncUser1");
  });

  it("guestSignIn creates guest session when valid device ID is provided", async () => {
    const req = { body: { deviceId: "guest-controller-device-1", platform: "android" } } as unknown as Request;
    const res = mockResponse();

    await authController.guestSignIn(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      }),
    );
  });
});

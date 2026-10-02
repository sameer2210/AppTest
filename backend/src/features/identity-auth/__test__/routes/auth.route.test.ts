import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("identity-auth: auth.route", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  describe("POST /api/auth/guest", () => {
    it("returns 200 and guest session with valid deviceId", async () => {
      const res = await request(app)
        .post("/api/auth/guest")
        .send({ deviceId: "route-test-device-001", platform: "android" });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.uid).toBeDefined();
    });

    it("rejects guest sign-in without deviceId with 400", async () => {
      const res = await request(app)
        .post("/api/auth/guest")
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/send-otp & /api/auth/verify-otp validation", () => {
    it("rejects send-otp with invalid or short phone number with 400", async () => {
      const res = await request(app)
        .post("/api/auth/send-otp")
        .send({ phone: "123" });

      expect(res.status).toBe(400);
    });

    it("rejects verify-otp with missing otp field with 400", async () => {
      const res = await request(app)
        .post("/api/auth/verify-otp")
        .send({ phone: "+919876543210" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/sync-user", () => {
    it("rejects unauthenticated request with 401", async () => {
      const res = await request(app)
        .post("/api/auth/sync-user")
        .send({ email: "unauth@sync.com" });

      expect(res.status).toBe(401);
    });

    it("accepts authenticated sync-user request", async () => {
      const uid = "auth-route-sync-user-1";
      const token = signAccessToken({ uid, email: "sync-user@stron.in" });

      const res = await request(app)
        .post("/api/auth/sync-user")
        .set("Authorization", `Bearer ${token}`)
        .send({ username: "SyncUserRoute" });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain("User synced");
      expect(res.body.user.uid).toBe(uid);
    });
  });
});

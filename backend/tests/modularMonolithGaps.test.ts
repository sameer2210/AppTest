import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import type { MongoMemoryServer } from "mongodb-memory-server";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { FeedbackModel } from "@/features/user-engagement/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("modular monolith leftover domains", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "mm-gap-user";
  let token: string;

  beforeAll(async () => {
    process.env.INTERNAL_SYNC_TOKEN = process.env.INTERNAL_SYNC_TOKEN || "test-internal-token";
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
    token = signAccessToken({ uid, email: "mm@stron.in" });
    await UserModel.create({
      uid,
      email: "mm@stron.in",
      username: "mmuser",
      todaysStepCount: 0,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("rejects guest sign-in without deviceId via Zod", async () => {
    const res = await request(app).post("/api/auth/guest").send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
    expect(res.body.success).toBe(false);
  });

  it("lists inbox notifications for the authenticated user", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it("rejects consumer payment order without event via service error or validation", async () => {
    const res = await request(app)
      .post("/api/payment/order")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect([400, 402, 404, 500, 503]).toContain(res.status);
    expect(res.body.success === false || res.body.error || res.body.code).toBeTruthy();
  });

  it("accepts feedback submissions", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .set("Authorization", `Bearer ${token}`)
      .send({ rating: 5, feedback: "Great app" });
    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    const count = await FeedbackModel.countDocuments({ userId: uid });
    expect(count).toBeGreaterThanOrEqual(1);
  });

  it("returns managed events catalog", async () => {
    const res = await request(app).get("/api/stron/events/catalog");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  it("returns a coded error when R2 is not configured for upload", async () => {
    const res = await request(app)
      .post("/api/upload/image")
      .set("Authorization", `Bearer ${token}`);
    expect([400, 503]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBeTruthy();
  });

  it("protects config refresh with an internal token", async () => {
    const res = await request(app).get("/api/config/refresh");
    expect([401, 503]).toContain(res.status);
  });

  it("protects daily-reset with an internal token", async () => {
    const res = await request(app).post("/api/daily-reset");
    expect([401, 503]).toContain(res.status);
  });

  it("serves shared event page via smart-link", async () => {
    const res = await request(app).get("/event/test-event-key");
    expect(res.status).toBe(200);
    expect(res.text).toContain("STRON");
  });
});

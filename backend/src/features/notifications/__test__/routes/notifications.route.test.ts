import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("notifications: routes", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "notif-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "notif-route@stron.in" });

    await UserModel.create({
      uid,
      email: "notif-route@stron.in",
      username: "NotifRouteUser",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/notifications rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("GET /api/notifications returns list for authenticated user", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  it("GET /api/notifications validates limit query with Zod", async () => {
    const res = await request(app)
      .get("/api/notifications?limit=-5")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("validation_error");
  });

  it("GET /api/notifications/unread-count returns unread count", async () => {
    const res = await request(app)
      .get("/api/notifications/unread-count")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("unreadCount");
  });

  it("POST /api/notifications/register-token validates input", async () => {
    const res = await request(app)
      .post("/api/notifications/register-token")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

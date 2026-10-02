import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("managed-events: routes", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "managed-events-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "managed-events@stron.in" });

    await UserModel.create({
      uid,
      email: "managed-events@stron.in",
      username: "ManagedEventsUser",
      phoneVerified: true,
      contactNo: "+919876543210",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("GET /api/stron/events/catalog is publicly accessible", async () => {
    const res = await request(app).get("/api/stron/events/catalog");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("events");
  });

  it("GET /api/stron/events/home-feed-official is publicly accessible", async () => {
    const res = await request(app).get("/api/stron/events/home-feed-official");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("events");
  });

  it("GET /api/stron/events/mine rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/stron/events/mine");
    expect(res.status).toBe(401);
  });

  it("GET /api/stron/events/mine returns user events when authenticated", async () => {
    const res = await request(app)
      .get("/api/stron/events/mine")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("events");
  });
});

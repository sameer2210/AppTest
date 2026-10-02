import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "@/app.js";
import { signAccessToken } from "@/utils/jwt.util.js";
import { UserModel } from "@/features/identity-auth/index.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("upload: upload.route", () => {
  let mongoServer: MongoMemoryServer;
  const uid = "upload-route-user";
  let token: string;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();

    token = signAccessToken({ uid, email: "upload-route@stron.in" });

    await UserModel.create({
      uid,
      email: "upload-route@stron.in",
      username: "UploadRouteUser",
    });
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  it("POST /api/upload/image rejects unauthenticated request with 401", async () => {
    const res = await request(app).post("/api/upload/image");
    expect(res.status).toBe(401);
  });

  it("POST /api/upload/image rejects missing file with 400", async () => {
    const res = await request(app)
      .post("/api/upload/image")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/upload/public/:key returns 404 or 503 if not found/configured", async () => {
    const res = await request(app).get("/api/upload/public/non-existent-key.jpg");
    expect([404, 503]).toContain(res.status);
  });
});

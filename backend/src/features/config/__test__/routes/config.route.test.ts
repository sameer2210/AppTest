import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "@/app.js";

describe("config: config.route", () => {
  const originalToken = process.env.INTERNAL_SYNC_TOKEN;

  beforeAll(() => {
    process.env.INTERNAL_SYNC_TOKEN = "test-sync-token-123";
  });

  afterAll(() => {
    if (originalToken !== undefined) {
      process.env.INTERNAL_SYNC_TOKEN = originalToken;
    } else {
      delete process.env.INTERNAL_SYNC_TOKEN;
    }
  });

  it("GET /api/config/refresh rejects requests without Bearer token with 401", async () => {
    const res = await request(app).get("/api/config/refresh");
    expect(res.status).toBe(401);
  });

  it("GET /api/config/refresh accepts valid Bearer token and returns 202", async () => {
    const res = await request(app)
      .get("/api/config/refresh")
      .set("Authorization", "Bearer test-sync-token-123");

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
  });
});

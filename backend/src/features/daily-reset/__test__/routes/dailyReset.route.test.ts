import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import app from "@/app.js";
import * as dailyResetService from "@/features/daily-reset/services/dailyReset.service.js";

describe("daily-reset: reset.route", () => {
  const originalToken = process.env.INTERNAL_SYNC_TOKEN;

  beforeAll(() => {
    process.env.INTERNAL_SYNC_TOKEN = "daily-reset-token-123";
    vi.spyOn(dailyResetService, "runDailyReset").mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof dailyResetService.runDailyReset>>,
    );
  });

  afterAll(() => {
    if (originalToken !== undefined) {
      process.env.INTERNAL_SYNC_TOKEN = originalToken;
    } else {
      delete process.env.INTERNAL_SYNC_TOKEN;
    }
  });

  it("POST /api/daily-reset rejects requests without Bearer token with 401", async () => {
    const res = await request(app).post("/api/daily-reset");
    expect(res.status).toBe(401);
  });

  it("POST /api/daily-reset accepts valid Bearer token and triggers reset", async () => {
    const res = await request(app)
      .post("/api/daily-reset")
      .set("Authorization", "Bearer daily-reset-token-123");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

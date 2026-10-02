import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as resetController from "@/features/daily-reset/controllers/reset.controller.js";
import * as dailyResetService from "@/features/daily-reset/services/dailyReset.service.js";

describe("daily-reset: reset.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("triggerDailyReset handles service error via sendError", async () => {
    vi.spyOn(dailyResetService, "runDailyReset").mockRejectedValueOnce(new Error("Reset failure"));

    const req = {} as Request;
    const res = mockResponse();

    await resetController.triggerDailyReset(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

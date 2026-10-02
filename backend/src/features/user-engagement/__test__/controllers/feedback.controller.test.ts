import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as feedbackController from "@/features/user-engagement/controllers/feedback.controller.js";
import * as feedbackService from "@/features/user-engagement/services/feedback.service.js";

describe("user-engagement: feedback.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("submitFeedback handles service errors via sendError", async () => {
    vi.spyOn(feedbackService, "submitFeedbackService").mockRejectedValueOnce(new Error("DB failure"));

    const req = { user: undefined, body: { rating: 5 } } as unknown as Request;
    const res = mockResponse();

    await feedbackController.submitFeedback(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

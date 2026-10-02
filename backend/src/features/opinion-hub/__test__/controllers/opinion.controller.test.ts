import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as opinionController from "@/features/opinion-hub/controllers/opinion.controller.js";
import { opinionService } from "@/features/opinion-hub/index.js";

describe("opinion-hub: opinion.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("getOpinion handles service error by passing to sendError with status 500", async () => {
    vi.spyOn(opinionService, "getOpinionPollDetails").mockRejectedValueOnce(new Error("Service failure"));

    const req = { user: { uid: "user-1" } } as unknown as Request;
    const res = mockResponse();

    await opinionController.getOpinion(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("voteOpinion returns 401 when user is unauthenticated", async () => {
    const req = { user: undefined, body: { questionId: "q1", optionId: 1 } } as unknown as Request;
    const res = mockResponse();

    await opinionController.voteOpinion(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("voteOpinion catches invalid option and returns 400 error response", async () => {
    vi.spyOn(opinionService, "submitOpinionVote").mockRejectedValueOnce(new Error("Invalid option"));

    const req = {
      user: { uid: "user-1" },
      body: { questionId: "q1", optionId: 999 },
    } as unknown as Request;
    const res = mockResponse();

    await opinionController.voteOpinion(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

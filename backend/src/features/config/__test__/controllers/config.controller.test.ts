import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as configController from "@/features/config/controllers/config.controller.js";
import * as configService from "@/features/config/services/config.service.js";

describe("config: config.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("triggerConfigRefresh returns 202 on success", async () => {
    vi.spyOn(configService, "triggerRemoteConfigRefresh").mockImplementation(() => {});

    const req = {} as Request;
    const res = mockResponse();

    await configController.triggerConfigRefresh(req, res);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

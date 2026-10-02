import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { MongoMemoryServer } from "mongodb-memory-server";
import type { Request, Response } from "express";
import * as stepRaceController from "@/features/step-race/controllers/stepRace.controller.js";
import stepRaceService from "@/features/step-race/services/stepRace.service.js";
import { createTestMongo } from "@/test-helpers/helpers.js";

describe("step-race: stepRace.controller unit edge cases", () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    const testMongo = await createTestMongo();
    mongoServer = testMongo.server;
    await testMongo.connect();
  });

  afterAll(async () => {
    await mongoServer.stop();
  });

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("getStepRaceStats forwards service errors to sendError", async () => {
    vi.spyOn(stepRaceService, "getStepRaceStatsService").mockRejectedValueOnce(new Error("Stats error"));

    const req = { params: { userId: "user-1" } } as unknown as Request;
    const res = mockResponse();

    await stepRaceController.getStepRaceStats(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("getActiveRace returns 404 when no active race exists", async () => {
    const req = { params: { userId: "user-no-race" } } as unknown as Request;
    const res = mockResponse();

    await stepRaceController.getActiveRace(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "not_found" }));
  });
});

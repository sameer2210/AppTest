import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as stronEventController from "@/features/managed-events/controllers/stronEvent.controller.js";
import * as stronEventService from "@/features/managed-events/services/stronEvent.service.js";

describe("managed-events: stronEvent.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("createFaceOff passes service errors to sendError", async () => {
    vi.spyOn(stronEventService, "createEvent").mockRejectedValueOnce(new Error("Creation error"));

    const req = { user: { uid: "user-1" }, body: {} } as unknown as Request;
    const res = mockResponse();

    await stronEventController.createFaceOff(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("getCatalogHandler forwards service errors to sendError", async () => {
    vi.spyOn(stronEventService, "getCatalog").mockRejectedValueOnce(new Error("Catalog load failed"));

    const req = { query: {} } as unknown as Request;
    const res = mockResponse();

    await stronEventController.getCatalogHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

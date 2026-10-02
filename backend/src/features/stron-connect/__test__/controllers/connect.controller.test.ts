import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as stronConnectController from "@/features/stron-connect/controllers/stronConnect.controller.js";
import { stronConnectService } from "@/features/stron-connect/index.js";

describe("stron-connect: connect.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("getMyConnectQrHandler returns 200 with qr payload", async () => {
    const mockQr = { displayCode: "ABCDE", qrPayload: '{"t":"user"}' };
    vi.spyOn(stronConnectService, "getMyConnectQr").mockResolvedValueOnce(
      mockQr as unknown as Awaited<ReturnType<typeof stronConnectService.getMyConnectQr>>,
    );

    const req = { user: { uid: "scanner-1" }, query: {} } as unknown as Request;
    const res = mockResponse();

    await stronConnectController.getMyConnectQrHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, qr: mockQr });
  });

  it("scanConnectQrHandler forwards service errors to sendError", async () => {
    vi.spyOn(stronConnectService, "scanConnectQr").mockRejectedValueOnce(new Error("Scan failure"));

    const req = {
      user: { uid: "scanner-1" },
      body: { payload: "some-qr" },
    } as unknown as Request;
    const res = mockResponse();

    await stronConnectController.scanConnectQrHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});

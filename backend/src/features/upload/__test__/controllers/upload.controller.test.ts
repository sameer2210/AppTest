import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as uploadController from "@/features/upload/controllers/upload.controller.js";
import * as uploadService from "@/features/upload/services/upload.service.js";

describe("upload: upload.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("uploadImageHandler returns 201 on success", async () => {
    vi.spyOn(uploadService, "uploadImage").mockResolvedValueOnce({
      url: "https://cdn.stron.in/img.png",
      key: "img.png",
    });

    const req = {
      file: { buffer: Buffer.from("data"), mimetype: "image/png" },
      body: { folder: "avatars" },
      get: vi.fn().mockReturnValue("localhost"),
    } as unknown as Request;
    const res = mockResponse();

    await uploadController.uploadImageHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ url: "https://cdn.stron.in/img.png" }),
      }),
    );
  });

  it("uploadImageHandler passes service errors to sendError", async () => {
    vi.spyOn(uploadService, "uploadImage").mockRejectedValueOnce(new Error("R2 upload error"));

    const req = {
      file: { buffer: Buffer.from("data") },
      body: {},
      get: vi.fn(),
    } as unknown as Request;
    const res = mockResponse();

    await uploadController.uploadImageHandler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

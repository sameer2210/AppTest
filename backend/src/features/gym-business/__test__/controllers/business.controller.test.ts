import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as businessController from "@/features/gym-business/controllers/business.controller.js";
import businessService from "@/features/gym-business/services/business.service.js";

describe("gym-business: business.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("getBusinessProfile returns cached req.business immediately if already attached by middleware", async () => {
    const cachedBusiness = { _id: "biz-123", businessName: "Cached Gym" };
    const req = { business: cachedBusiness } as unknown as Request;
    const res = mockResponse();

    await businessController.getBusinessProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: cachedBusiness });
  });

  it("getBusinessProfile calls getBusinessProfileOptional when req.businessId is missing", async () => {
    const optionalData = { _id: "biz-456", businessName: "Optional Gym" };
    vi.spyOn(businessService, "getBusinessProfileOptional").mockResolvedValueOnce(
      optionalData as unknown as Awaited<
        ReturnType<typeof businessService.getBusinessProfileOptional>
      >,
    );

    const req = { user: { uid: "owner-1" } } as unknown as Request;
    const res = mockResponse();

    await businessController.getBusinessProfile(req, res);
    expect(businessService.getBusinessProfileOptional).toHaveBeenCalledWith({ ownerId: "owner-1" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: optionalData });
  });

  it("updateBusinessProfile catches service errors and sends via sendError", async () => {
    const err = new Error("Business not found") as Error & { code: string };
    err.code = "business_not_found";
    vi.spyOn(businessService, "updateBusinessProfile").mockRejectedValueOnce(err);

    const req = { businessId: "biz-789", body: { businessName: "New" } } as unknown as Request;
    const res = mockResponse();

    await businessController.updateBusinessProfile(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: "business_not_found" }));
  });
});

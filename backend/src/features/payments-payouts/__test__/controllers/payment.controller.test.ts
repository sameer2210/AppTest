import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import * as razorpayController from "@/features/payments-payouts/controllers/razorpay.controller.js";
import * as eventPaymentService from "@/features/payments-payouts/services/eventPayment.service.js";

describe("payments-payouts: razorpay.controller unit edge cases", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("createPaymentOrder forwards service errors to sendError", async () => {
    vi.spyOn(eventPaymentService, "createPaymentOrderService").mockRejectedValueOnce(new Error("Gateway down"));

    const req = { user: { uid: "user-1" }, body: {} } as unknown as Request;
    const res = mockResponse();

    await razorpayController.createPaymentOrder(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it("getPaymentHistory returns user transactions", async () => {
    vi.spyOn(eventPaymentService, "getPaymentHistoryService").mockResolvedValueOnce(
      [{ id: "tx-1" }] as unknown as Awaited<
        ReturnType<typeof eventPaymentService.getPaymentHistoryService>
      >,
    );

    const req = { user: { uid: "user-1" } } as unknown as Request;
    const res = mockResponse();

    await razorpayController.getPaymentHistory(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, payments: [{ id: "tx-1" }] });
  });
});

import type { Request, Response } from "express";
import { headerString } from "../../../types/controller.util.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { resolveRequestCountryCode } from "../../../utils/requestGeo.util.js";
import {
  createPaymentOrderService,
  verifyPaymentService,
  handleRazorpayWebhookService,
  getPaymentHistoryService,
  refundRazorpayPaymentService,
} from "../services/eventPayment.service.js";

const getRequestUid = (req: Request) => String(req.user?.uid || "").trim();

export const createPaymentOrder = async (req: Request, res: Response) => {
  try {
    const uid = getRequestUid(req);
    const {
      eventKey,
      eventId,
      planId = null,
      currentStepCount = null,
      couponCode = null,
    } = req.body || {};

    const { countryCode } = await resolveRequestCountryCode(req);

    const orderData = await createPaymentOrderService({
      uid,
      eventKey,
      eventId,
      planId,
      currentStepCount,
      couponCode,
      countryCode,
    });

    return res.status(200).json({
      success: true,
      ...orderData,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const uid = getRequestUid(req);
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    const result = await verifyPaymentService({
      uid,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      ...result,
    });
  } catch (error) {
    if (error && typeof error === "object" && "pending" in error) {
      return res.status(202).json({
        success: false,
        pending: true,
        message: (error as unknown as Error).message || "Payment verification pending",
      });
    }
    return sendError(res, error);
  }
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = headerString(req.headers["x-razorpay-signature"]);
    const rawBody = req.rawBody
      ? req.rawBody.toString("utf8")
      : JSON.stringify(req.body || {});

    await handleRazorpayWebhookService({
      signature,
      rawBody,
      body: req.body || {},
    });

    return res.status(200).send("OK");
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const uid = getRequestUid(req);
    const payments = await getPaymentHistoryService({ uid });

    return res.status(200).json({
      success: true,
      payments,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const refundRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const uid = getRequestUid(req);
    const { razorpayOrderId, amount } = req.body || {};

    const refund = await refundRazorpayPaymentService({
      uid,
      razorpayOrderId,
      amount,
    });

    return res.status(200).json({
      success: true,
      refund,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPaymentHistory,
  refundRazorpayPayment,
};

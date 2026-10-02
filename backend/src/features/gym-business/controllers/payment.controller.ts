import { sendError } from "../../../utils/stronHttpError.util.js";
import type { NextFunction, Request, Response } from "express";
import { getPaginationParams, buildPaginationMeta } from "../../../utils/pagination.js";
import paymentService from "../services/payment.service.js";
import type { PaginationQuery } from "../../../types/service.util.js";

export const listPayments = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const { page, limit } = getPaginationParams(req.query);
      return res.status(200).json({
        success: true,
        payments: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }
    const paginationParams = getPaginationParams(req.query) as PaginationQuery & {
      sort?: Record<string, 1 | -1>;
    };
    const result = await paymentService.listPayments({
      businessId: req.businessId,
      paginationParams,
      filters: req.query,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const data = await paymentService.getPaymentById({
      businessId: req.businessId,
      paymentId: req.params.paymentId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberPaymentSummaries = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, summaries: [] });
    }
    const data = await paymentService.getMemberPaymentSummaries({
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberPaymentSummary = async (req: Request, res: Response) => {
  try {
    const data = await paymentService.getMemberPaymentSummary({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const recordManualPayment = async (req: Request, res: Response) => {
  try {
    const data = await paymentService.recordManualPayment({
      businessId: req.businessId,
      recordedBy: req.user!.uid,
      paymentData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createOnlinePaymentOrder = async (req: Request, res: Response) => {
  try {
    // Staff tenant only from optionalBusiness/requireBusiness — never trust body.businessId (V1 §5).
    const data = await paymentService.createOnlinePaymentOrder({
      businessId: req.businessId || null,
      orderData: req.body,
      userId: req.user?.uid || null,
      userAuth: req.user || null,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const verifyOnlinePayment = async (req: Request, res: Response) => {
  try {
    // Staff with a gym business may opt-in to activate; customers cannot force ACTIVE.
    // Tenant only from middleware — never trust body.businessId (V1 §5).
    const data = await paymentService.verifyOnlinePayment({
      businessId: req.businessId,
      verificationData: req.body,
      hasGymStaffContext: Boolean(req.businessId),
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const handleRazorpayWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const data = await paymentService.handleRazorpayWebhook({
      rawBody: req.rawBody || req.body,
      signature,
      eventPayload: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listPayments,
  getPaymentById,
  getMemberPaymentSummaries,
  getMemberPaymentSummary,
  recordManualPayment,
  createOnlinePaymentOrder,
  verifyOnlinePayment,
  handleRazorpayWebhook,
};

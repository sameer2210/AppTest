import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import payoutAccountService from "../services/payoutAccount.service.js";

export const getPayoutAccount = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({ success: true, data: null });
    }
    const data = await payoutAccountService.getPayoutAccount({
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createPayoutAccount = async (req: Request, res: Response) => {
  try {
    const data = await payoutAccountService.createPayoutAccount({
      businessId: req.businessId,
      accountData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updatePayoutAccount = async (req: Request, res: Response) => {
  try {
    const data = await payoutAccountService.updatePayoutAccount({
      businessId: req.businessId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const verifyPayoutAccount = async (req: Request, res: Response) => {
  try {
    const data = await payoutAccountService.verifyPayoutAccount({
      businessId: req.businessId,
      verificationPayload: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const handlePayoutWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body);
    const data = await payoutAccountService.handlePayoutWebhook({
      rawBody,
      signature,
      eventPayload: req.body,
    });
    return res.status(200).json({ success: true, ...data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const saveBankDetailsOnly = async (req: Request, res: Response) => {
  try {
    const data = await payoutAccountService.saveBankDetailsOnly({
      businessId: req.businessId,
      accountData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getPayoutAccount,
  createPayoutAccount,
  updatePayoutAccount,
  verifyPayoutAccount,
  handlePayoutWebhook,
  saveBankDetailsOnly,
};

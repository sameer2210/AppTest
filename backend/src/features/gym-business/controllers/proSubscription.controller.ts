import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import proSubscriptionService from "../services/proSubscription.service.js";
import entitlementService from "../services/entitlement.service.js";

export const getSubscription = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.getSubscription({
      businessId: req.businessId,
      userId: uid,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getEntitlementFeatures = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const entitlements = await entitlementService.getBusinessEntitlements({
      businessId: req.businessId,
      userId: uid,
    });

    const feeConfig = await entitlementService.getPlatformFeeConfig({
      businessId: req.businessId,
      userId: uid,
    });

    return res.status(200).json({
      success: true,
      data: {
        entitlements,
        feeConfig,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const subscribe = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.subscribe({
      businessId: req.businessId,
      userId: uid,
      subscriptionData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.cancelSubscription({
      businessId: req.businessId,
      userId: uid,
      cancelData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const pauseSubscription = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.pauseSubscription({
      businessId: req.businessId,
      userId: uid,
      pauseDays: req.body?.pauseDays,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const resumeSubscription = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.resumeSubscription({
      businessId: req.businessId,
      userId: uid,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const handleSubscriptionWebhook = async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const data = await proSubscriptionService.handleSubscriptionWebhook({
      rawBody: req.rawBody || req.body,
      signature,
      eventPayload: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const handleRevenueCatWebhook = async (req: Request, res: Response) => {
  try {
    const data = await proSubscriptionService.handleRevenueCatWebhook({
      authHeader: req.headers.authorization,
      eventPayload: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncRevenueCat = async (req: Request, res: Response) => {
  try {
    const userUid = req.user?.uid || req.user?.userId;
    const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
    const requestIp = forwarded || req.ip || null;
    const data = await proSubscriptionService.syncRevenueCatPurchase({
      businessId: req.businessId,
      userUid,
      appUserId: userUid,
      requestIp,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const checkTrialEligibility = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const installedAt =
      req.query?.installedAt ||
      req.query?.installTimestamp ||
      req.headers["x-app-installed-at"];
    const data = await proSubscriptionService.checkTrialEligibility({
      uid,
      businessId: req.businessId,
      installedAt,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const activateFreeTrial = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const data = await proSubscriptionService.activateFreeTrial({
      uid,
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const cycle = req.body?.cycle || req.body?.billingCycle || "MONTHLY";
    const data = await proSubscriptionService.createProRazorpayOrder({
      businessId: req.businessId,
      uid,
      cycle,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const data = await proSubscriptionService.verifyProRazorpayPayment({
      businessId: req.businessId,
      uid,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getSubscription,
  getEntitlementFeatures,
  subscribe,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  handleSubscriptionWebhook,
  handleRevenueCatWebhook,
  syncRevenueCat,
  checkTrialEligibility,
  activateFreeTrial,
  createRazorpayOrder,
  verifyRazorpayPayment,
};

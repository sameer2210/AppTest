// HTTP layer for buying a ticket (order creation) and reading one's own participation.
// Payment verification reuses the shared /api/payment/verify + webhook, which branch
// into finalizeParticipation for STRON-managed transactions.

import type { NextFunction, Request, Response } from "express";
import {
  createParticipationOrder,
  getLatestParticipantInfoPrefill,
  getMyParticipation,
  validateEventRegistrationCoupon,
} from "../services/stronRegistration.service.js";
import { listMyRecentActivity } from "../services/stronActivity.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { routeParam } from "../../../types/controller.util.js";

export const createOrderHandler = async (req: Request, res: Response) => {
  try {
    const result = await createParticipationOrder({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.key),
      ticketTypeId: req.body?.ticketTypeId ?? null,
      currentStepCount: req.body?.currentStepCount ?? null,
      participantInfo: req.body?.participantInfo ?? null,
      couponCode: req.body?.couponCode ?? null,
    });
    trackEvent(ANALYTICS_EVENTS.TICKET_ORDER_CREATED, {
      user_id: req.user!.uid,
      event_key: routeParam(req.params.key),
      is_free:
        ("free" in result && result.free === true) || Number(result?.amount) <= 0,
      amount: Number(result?.amount) || 0,
      ticket_type: req.body?.ticketTypeId ?? result?.ticketTypeId,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const validateCouponHandler = async (req: Request, res: Response) => {
  try {
    const result = await validateEventRegistrationCoupon({
      eventKey: routeParam(req.params.key),
      ticketTypeId: req.body?.ticketTypeId ?? null,
      couponCode: req.body?.couponCode ?? null,
    });
    trackEvent(ANALYTICS_EVENTS.COUPON_APPLIED, {
      user_id: req.user?.uid,
      event_key: routeParam(req.params.key),
      code: result?.couponCode || req.body?.couponCode,
      valid: true,
      discount: Number(result?.discountRupees) || 0,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    trackEvent(ANALYTICS_EVENTS.COUPON_APPLIED, {
      user_id: req.user?.uid,
      event_key: routeParam(req.params.key),
      code: req.body?.couponCode,
      valid: false,
    });
    return sendError(res, error);
  }
};

export const getMyParticipationHandler = async (req: Request, res: Response) => {
  try {
    const participation = await getMyParticipation({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.key),
    });
    return res.status(200).json({ success: true, participation });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyActivityHandler = async (req: Request, res: Response) => {
  try {
    const activity = await listMyRecentActivity(req.user!.uid);
    return res.status(200).json({ success: true, activity });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyParticipantInfoPrefillHandler = async (req: Request, res: Response) => {
  try {
    const participantInfo = await getLatestParticipantInfoPrefill(req.user!.uid);
    return res.status(200).json({ success: true, participantInfo });
  } catch (error) {
    return sendError(res, error);
  }
};

// HTTP layer for settlements. Organizers initialize and view;
// release is allowed for event owner or finance/admin (temporary until admin console).

import type { Request, Response } from "express";
import {
  getSettlement,
  initSettlement,
  listOrganizerSettlements,
  releaseSettlement,
} from "../services/stronSettlement.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { routeParam } from "../../../types/controller.util.js";

export const initSettlementHandler = async (req: Request, res: Response) => {
  try {
    const settlement = await initSettlement({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.eventKey),
    });
    trackEvent(ANALYTICS_EVENTS.SETTLEMENT_REQUESTED, {
      user_id: req.user!.uid,
      event_key: routeParam(req.params.eventKey),
      amount: settlement?.netPayable,
    });
    return res.status(200).json({ success: true, settlement });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getSettlementHandler = async (req: Request, res: Response) => {
  try {
    const settlement = await getSettlement({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.eventKey),
    });
    return res.status(200).json({ success: true, settlement });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listSettlementsHandler = async (req: Request, res: Response) => {
  try {
    const settlements = await listOrganizerSettlements(req.user!.uid);
    return res.status(200).json({ success: true, settlements });
  } catch (error) {
    return sendError(res, error);
  }
};

export const releaseSettlementHandler = async (req: Request, res: Response) => {
  try {
    const settlement = await releaseSettlement({
      eventKey: routeParam(req.params.eventKey),
      reference: req.body?.reference,
      uid: req.user!.uid,
    });
    trackEvent(ANALYTICS_EVENTS.STRON_SETTLEMENT_RELEASED, {
      user_id: req.user!.uid,
      event_key: routeParam(req.params.eventKey),
      amount: settlement.netPayable,
    });
    return res.status(200).json({ success: true, settlement });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  initSettlementHandler,
  getSettlementHandler,
  listSettlementsHandler,
  releaseSettlementHandler,
};

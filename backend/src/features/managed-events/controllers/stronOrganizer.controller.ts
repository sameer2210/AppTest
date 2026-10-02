// Thin HTTP layer for organizer onboarding, profile, and KYC.
// Auth is enforced by requireAuth upstream; we always trust req.user!.uid, never the body.

import type { NextFunction, Request, Response } from "express";
import {
  getOrganizer,
  updateKyc,
  upsertOrganizer,
} from "../services/stronOrganizer.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";

export const onboardOrganizer = async (req: Request, res: Response) => {
  try {
    const organizer = await upsertOrganizer(req.user!.uid, req.body || {});
    trackEvent(ANALYTICS_EVENTS.ORGANIZER_PROFILE_SAVED, { user_id: req.user!.uid });
    return res.status(200).json({ success: true, organizer });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyOrganizer = async (req: Request, res: Response) => {
  try {
    const organizer = await getOrganizer(req.user!.uid);
    return res.status(200).json({ success: true, organizer });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateOrganizerKyc = async (req: Request, res: Response) => {
  try {
    const organizer = await updateKyc(req.user!.uid, req.body || {});
    return res.status(200).json({ success: true, organizer });
  } catch (error) {
    return sendError(res, error);
  }
};

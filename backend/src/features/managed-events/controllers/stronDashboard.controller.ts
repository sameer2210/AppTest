// HTTP layer for organizer dashboards.

import type { NextFunction, Request, Response } from "express";
import {
  getEventDashboard,
  getOrganizerDashboard,
} from "../services/stronDashboard.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { routeParam } from "../../../types/controller.util.js";

export const organizerDashboardHandler = async (req: Request, res: Response) => {
  try {
    const dashboard = await getOrganizerDashboard(req.user!.uid);
    return res.status(200).json({ success: true, ...dashboard });
  } catch (error) {
    return sendError(res, error);
  }
};

export const eventDashboardHandler = async (req: Request, res: Response) => {
  try {
    const dashboard = await getEventDashboard({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.key),
    });
    return res.status(200).json({ success: true, ...dashboard });
  } catch (error) {
    return sendError(res, error);
  }
};

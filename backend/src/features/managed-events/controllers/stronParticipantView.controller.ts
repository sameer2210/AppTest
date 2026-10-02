import type { Request, Response } from "express";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { routeParam } from "../../../types/controller.util.js";
import {
  getProgressService,
  getLeaderboardService,
  getMatchesService,
} from "../services/stronParticipantView.service.js";

export const getProgressHandler = async (req: Request, res: Response) => {
  try {
    const progress = await getProgressService({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.key),
    });
    return res.status(200).json({ success: true, progress });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getLeaderboardHandler = async (req: Request, res: Response) => {
  try {
    const result = await getLeaderboardService({
      eventKey: routeParam(req.params.key),
    });
    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMatchesHandler = async (req: Request, res: Response) => {
  try {
    const matches = await getMatchesService({
      uid: req.user!.uid,
      eventKey: routeParam(req.params.key),
    });
    return res.status(200).json({ success: true, matches });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getProgressHandler,
  getLeaderboardHandler,
  getMatchesHandler,
};

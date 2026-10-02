import type { Request, Response } from "express";
import InterestModel from "../models/interest.model.js";
import { sendError } from "../utils/stronHttpError.util.js";

/**
 * GET /api/interests
 * Returns the list of active interest areas for user preference selection.
 */
export const listInterestsHandler = async (_req: Request, res: Response) => {
  try {
    const interests = await InterestModel.find({ isActive: true })
      .select("name")
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({ success: true, interests });
  } catch (error) {
    return sendError(res, error);
  }
};

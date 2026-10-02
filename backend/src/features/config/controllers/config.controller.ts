import type { Request, Response } from "express";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { triggerRemoteConfigRefresh } from "../services/config.service.js";

export const triggerConfigRefresh = async (_req: Request, res: Response) => {
  try {
    triggerRemoteConfigRefresh();
    return res.status(202).json({
      success: true,
      data: { message: "Config refresh triggered. Cache will be updated shortly." },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

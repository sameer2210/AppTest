import type { Request, Response } from "express";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { syncAllUsersFromFirestore } from "../services/userSync.service.js";

export const syncAllUsers = async (_req: Request, res: Response) => {
  try {
    const data = await syncAllUsersFromFirestore();
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

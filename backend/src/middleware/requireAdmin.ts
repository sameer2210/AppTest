import type { RequestHandler, Response } from "express";
import { requireAdminUser } from "../utils/eventOwnership.util.js";

type AdminCheckSuccess = {
  uid: string;
  email: string;
};

type AdminCheckFailure = {
  error: Response;
};

const isAdminCheckFailure = (
  result: AdminCheckSuccess | AdminCheckFailure,
): result is AdminCheckFailure => "error" in result && Boolean(result.error);

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const result = (await requireAdminUser(req, res)) as
      | AdminCheckSuccess
      | AdminCheckFailure;

    if (isAdminCheckFailure(result)) {
      return result.error;
    }

    req.admin = { uid: result.uid, email: result.email };
    return next();
  } catch (error) {
    console.error("requireAdmin:", error);
    return res.status(500).json({ error: "Failed to verify admin access." });
  }
};

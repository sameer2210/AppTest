import type { Request, Response } from "express";
import { db } from "../../../config/firebase.js";
import { assertSelfUid, getRequesterUid } from "../../../utils/authOwnership.util.js";
import { routeParam } from "../../../types/controller.util.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import userService from "../services/user.service.js";
import { getUserRoles } from "../services/userRoles.service.js";

export const handleDailyReset = userService.handleDailyReset;

export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await userService.getUserProfileService({
      uid: routeParam(uid),
      traceContext: { ip: req.ip, headers: req.headers },
    });
    return res.status(200).json(user);
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const ownershipError = assertSelfUid(req, res, routeParam(uid));
    if (ownershipError) return ownershipError;

    const updatedUser = await userService.updateUserProfileService({
      uid: routeParam(uid),
      rawUpdateData: req.body || {},
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncUserSteps = async (req: Request, res: Response) => {
  try {
    const uid = String(getRequesterUid(req) || "");
    const { todaysStepCount, localDate, utcTimestamp, timezone, source } = req.body;

    const { user, dayKey } = await userService.syncUserStepsService({
      uid,
      todaysStepCount,
      localDate,
      utcTimestamp,
      timezone,
      source,
      traceContext: { ip: req.ip, headers: req.headers },
    });

    return res.status(200).json({ message: "Synced", user, dayKey });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const usersSnapshot = await db.collection("users").limit(limit).get();
    const users = usersSnapshot.docs.map((doc) => doc.data());
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: getErrorMessage(err) });
  }
};

export const getActivityHistory = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const history = await userService.getActivityHistoryService({
      uid: routeParam(uid),
      traceContext: { ip: req.ip, headers: req.headers },
    });
    return res.status(200).json(history);
  } catch (error) {
    return sendError(res, error);
  }
};

export const getLifetimeStats = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const stats = await userService.getLifetimeStatsService({
      uid: routeParam(uid),
    });
    return res.status(200).json(stats);
  } catch (error) {
    return sendError(res, error);
  }
};

export const syncPastSteps = async (req: Request, res: Response) => {
  try {
    const uid = String(getRequesterUid(req) || "");
    const { date, steps, timezone, source } = req.body;

    const result = await userService.syncPastStepsService({
      uid,
      date,
      steps,
      timezone,
      source,
      traceContext: { ip: req.ip, headers: req.headers },
    });

    return res.status(200).json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      stepCount: result.stepCount,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteAccount = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const requesterUid = String(getRequesterUid(req) || "");

    const result = await userService.deleteAccountService({
      uid: routeParam(uid),
      requesterUid,
    });

    if (result.alreadyDeleted) {
      return res.status(200).json({ message: "Account already deleted." });
    }

    return res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyRoles = async (req: Request, res: Response) => {
  try {
    const data = await getUserRoles({ uid: req.user!.uid });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const checkIsAdmin = async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { isAdmin } = await userService.checkIsAdminService({
      uid: routeParam(uid),
    });
    return res.status(200).json({ isAdmin });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  handleDailyReset,
  getUserProfile,
  updateUserProfile,
  syncUserSteps,
  getAllUsers,
  getActivityHistory,
  getLifetimeStats,
  syncPastSteps,
  deleteAccount,
  checkIsAdmin,
  getMyRoles,
};

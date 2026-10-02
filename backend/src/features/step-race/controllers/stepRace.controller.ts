import type { Request, Response } from "express";
import { queryNumber, queryString, routeParam } from "../../../types/controller.util.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import stepRaceService from "../services/stepRace.service.js";

// Get step race statistics
export const getStepRaceStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const stats = await stepRaceService.getStepRaceStatsService({
      userId: routeParam(userId),
      requesterUid: req.user?.uid,
    });
    return res.json(stats);
  } catch (error) {
    return sendError(res, error);
  }
};

// Search opponents
export const searchOpponents = async (req: Request, res: Response) => {
  try {
    const q = queryString(req.query.q) || "";
    const results = await stepRaceService.searchOpponentsService({
      q,
      requesterUid: req.user?.uid,
    });
    return res.json(results);
  } catch (error) {
    return sendError(res, error);
  }
};

// Get random shadow opponents
export const getRandomShadowOpponents = async (_req: Request, res: Response) => {
  try {
    const opponents = stepRaceService.getRandomShadowOpponentsService();
    return res.json(opponents);
  } catch (error) {
    return sendError(res, error);
  }
};

// Create step race
export const createStepRace = async (req: Request, res: Response) => {
  try {
    const { opponentUid, opponentType, duration = 24, userId, startSteps = 0 } = req.body || {};
    const finalUserId = req.user?.uid || userId || "current_user";

    const race = await stepRaceService.createStepRaceService({
      userId: finalUserId,
      opponentUid,
      opponentType,
      duration,
      startSteps,
    });
    return res.json(race);
  } catch (error) {
    return sendError(res, error);
  }
};

// Get active race
export const getActiveRace = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const activeRace = await stepRaceService.getActiveRaceService({
      userId: routeParam(userId),
      requesterUid: req.user?.uid,
    });
    return res.json(activeRace);
  } catch (error) {
    return sendError(res, error);
  }
};

// Update race progress
export const updateRaceProgress = async (req: Request, res: Response) => {
  try {
    const { raceId, userSteps, userTimeSeconds } = req.body || {};
    const race = await stepRaceService.updateRaceProgressService({
      raceId,
      userSteps,
      userTimeSeconds,
      requesterUid: req.user?.uid,
    });
    return res.json({ success: true, race });
  } catch (error) {
    return sendError(res, error);
  }
};

// Complete race
export const completeRace = async (req: Request, res: Response) => {
  try {
    const { raceId, userSteps, userTimeSeconds } = req.body || {};
    const race = await stepRaceService.completeRaceService({
      raceId,
      userSteps,
      userTimeSeconds,
      requesterUid: req.user?.uid,
    });
    return res.json(race);
  } catch (error) {
    return sendError(res, error);
  }
};

// Get leaderboard
export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const requestedLimit = queryNumber(req.query.limit, 10) ?? 10;
    const leaderboard = await stepRaceService.getLeaderboardService({
      limit: requestedLimit,
    });
    return res.json(leaderboard);
  } catch (error) {
    return sendError(res, error);
  }
};

// Get rivalry history against specific opponent
export const getRivalryHistory = async (req: Request, res: Response) => {
  try {
    const { userId, opponentUid } = req.query;
    const authUserId = req.user?.uid;
    const finalUserId = String(userId || authUserId || "");
    const opponent = String(opponentUid || "");

    const rivalry = await stepRaceService.getRivalryHistoryService({
      userId: finalUserId,
      opponentUid: opponent,
      requesterUid: authUserId,
    });
    return res.json(rivalry);
  } catch (error) {
    return sendError(res, error);
  }
};

// Get match history for My Races screen
export const getStepRaceHistory = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const history = await stepRaceService.getStepRaceHistoryService({
      userId: routeParam(userId),
      requesterUid: req.user?.uid,
    });
    return res.json(history);
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getStepRaceStats,
  searchOpponents,
  getRandomShadowOpponents,
  createStepRace,
  getActiveRace,
  updateRaceProgress,
  completeRace,
  getLeaderboard,
  getRivalryHistory,
  getStepRaceHistory,
};

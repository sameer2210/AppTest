import type { NextFunction, Request, Response } from "express";
import {
  getOpinionPollDetails,
  submitOpinionVote,
  toggleOpinionLike,
} from "../services/opinion.service.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";

export const getOpinion = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    const poll = await getOpinionPollDetails(uid);
    return res.status(200).json({ success: true, ...poll });
  } catch (error) {
    return sendError(res, error, 500);
  }
};

export const voteOpinion = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    if (!uid) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const { optionId, questionId } = req.body || {};

    // Vote weight is derived server-side from user.todaysStepCount (0 → 1).
    const updatedPoll = await submitOpinionVote(uid, optionId, questionId);
    trackEvent(ANALYTICS_EVENTS.OPINION_VOTE_SUBMITTED, {
      user_id: uid,
      opinion_id: updatedPoll?.questionId,
      option: optionId,
    });
    return res.status(200).json({ success: true, ...updatedPoll });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export const toggleLikeOpinion = async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid || req.user?.userId;
    if (!uid) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const { questionId } = req.body || {};
    const result = await toggleOpinionLike(uid, questionId);

    const eventName = result.isLiked
      ? ANALYTICS_EVENTS.OPINION_LIKED
      : ANALYTICS_EVENTS.OPINION_UNLIKED;
    trackEvent(eventName, {
      user_id: uid,
      opinion_id: result.questionId,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error, 400);
  }
};

export default {
  getOpinion,
  voteOpinion,
  toggleLikeOpinion,
};

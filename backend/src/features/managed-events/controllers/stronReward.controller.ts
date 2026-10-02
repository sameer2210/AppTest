// HTTP layer for participant rewards (medals + certificates).

import type { NextFunction, Request, Response } from "express";
import {
  getBadgeCounts,
  getRewardById,
  listMyRewards,
  listRewardPreviews,
} from "../services/stronReward.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";

export const listMyRewardsHandler = async (req: Request, res: Response) => {
  try {
    const [rewards, badges] = await Promise.all([
      listMyRewards(req.user!.uid),
      getBadgeCounts(req.user!.uid),
    ]);
    return res.status(200).json({ success: true, rewards, badges });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listRewardPreviewsHandler = async (req: Request, res: Response) => {
  try {
    const rewards = await listRewardPreviews(req.user!.uid, 12);
    return res.status(200).json({ success: true, rewards });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getRewardHandler = async (req: Request, res: Response) => {
  try {
    const reward = await getRewardById({
      uid: req.user!.uid,
      rewardId: req.params.rewardId,
    });
    return res.status(200).json({ success: true, reward });
  } catch (error) {
    return sendError(res, error);
  }
};

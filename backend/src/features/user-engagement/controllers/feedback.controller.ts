import type { Request, Response } from "express";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { submitFeedbackService } from "../services/feedback.service.js";

export const submitFeedback = async (req: Request, res: Response) => {
  try {
    const { userId, uid, isLiked, rating, feedback } = req.body || {};

    const feedbackEntry = await submitFeedbackService({
      userId,
      uid,
      isLiked,
      rating,
      feedback,
      requesterUid: req.user?.uid,
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully.",
      data: feedbackEntry,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  submitFeedback,
};

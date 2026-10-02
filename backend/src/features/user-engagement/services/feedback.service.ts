import FeedbackModel from "../models/feedback.model.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { logger } from "../../../utils/logger.util.js";
import type { SubmitFeedbackParams, IFeedback } from "../types/index.js";

export const submitFeedbackService = async ({
  userId,
  uid,
  isLiked,
  rating,
  feedback,
  requesterUid,
}: SubmitFeedbackParams): Promise<IFeedback> => {
  const effectiveUserId = requesterUid || userId || uid || "anonymous";

  const feedbackEntry = await FeedbackModel.create({
    userId: effectiveUserId,
    isLiked: Boolean(isLiked),
    rating: Number(rating) || 5,
    feedback: String(feedback || "").trim(),
  });

  logger.info(`[Feedback] User feedback recorded from ${effectiveUserId}`);

  trackEvent(ANALYTICS_EVENTS.FEEDBACK_SUBMITTED, {
    user_id: effectiveUserId,
    rating: Number(rating) || 5,
    has_comment: Boolean(String(feedback || "").trim()),
  });

  return feedbackEntry;
};

export default {
  submitFeedbackService,
};

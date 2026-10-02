import { apiClient } from "../core/apiClient.service";

export type SubmitUserFeedbackPayload = {
  userId: string;
  isLiked: boolean;
  rating?: number;
  feedback?: string;
};

export const submitUserFeedback = async (payload: SubmitUserFeedbackPayload): Promise<void> => {
  await apiClient.post("/api/feedback", payload);
};

import { z } from "zod";

export const submitFeedbackSchema = {
  body: z.object({
    userId: z.string().optional(),
    uid: z.string().optional(),
    isLiked: z.boolean().optional(),
    rating: z.coerce.number().min(1).max(5).optional(),
    feedback: z.string().max(2000).optional(),
  }),
};

import { z } from "zod";

export const voteOpinionSchema = {
  body: z.object({
    optionId: z.string().min(1, "optionId is required").trim(),
    questionId: z.string().min(1, "questionId is required").trim(),
  }),
};

export const toggleLikeOpinionSchema = {
  body: z.object({
    questionId: z.string().min(1, "questionId is required").trim(),
  }),
};

export type VoteOpinionBody = z.infer<typeof voteOpinionSchema.body>;
export type ToggleLikeOpinionBody = z.infer<typeof toggleLikeOpinionSchema.body>;

export default {
  voteOpinionSchema,
  toggleLikeOpinionSchema,
};

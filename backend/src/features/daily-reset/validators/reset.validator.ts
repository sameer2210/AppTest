import { z } from "zod";

export const triggerDailyResetSchema = {
  body: z.object({}).optional(),
};

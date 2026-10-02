import { z } from "zod";

export const refreshConfigSchema = {
  query: z.object({}).optional(),
};

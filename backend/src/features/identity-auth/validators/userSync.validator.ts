import { z } from "zod";

export const syncAllUsersSchema = {
  query: z.object({}).optional(),
};

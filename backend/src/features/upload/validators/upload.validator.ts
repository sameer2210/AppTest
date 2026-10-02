import { z } from "zod";

export const uploadImageSchema = {
  body: z.object({
    folder: z.string().max(120).optional(),
    publicId: z.string().max(200).optional(),
  }),
};

export const publicUploadKeySchema = {
  params: z.object({
    key: z.string().min(1, "Invalid key."),
  }),
};

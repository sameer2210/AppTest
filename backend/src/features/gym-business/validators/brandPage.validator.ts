import { z } from "zod";

const slugParam = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens.")
  .min(3)
  .max(60);

export const slugParamSchema = {
  params: z.object({
    slug: slugParam,
  }),
};

export const recordVisitSchema = {
  params: z.object({
    slug: slugParam,
  }),
  body: z.object({
    visitorHash: z
      .string()
      .trim()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9_-]+$/, "visitorHash must be alphanumeric.")
      .optional(),
  }),
};

export type BrandPageSlugParams = z.infer<typeof slugParamSchema.params>;
export type RecordVisitBody = z.infer<typeof recordVisitSchema.body>;

export default {
  slugParamSchema,
  recordVisitSchema,
};

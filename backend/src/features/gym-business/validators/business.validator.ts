import { z } from "zod";

const httpUrlOrNull = z
  .string()
  .nullable()
  .optional()
  .transform((v) => {
    const raw = typeof v === "string" ? v.trim() : v;
    if (!raw) return null;
    try {
      const url = new URL(String(raw));
      return url.protocol === "http:" || url.protocol === "https:" ? String(raw) : null;
    } catch {
      return null;
    }
  });

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens.")
  .min(3)
  .max(60);

const MAX_GALLERY_IMAGES = 7;

const sanitizeHttpUrlList = (urls: string[] | undefined): string[] | undefined => {
  if (urls === undefined) return undefined;
  const cleaned: string[] = [];
  for (const raw of urls) {
    const value = String(raw || "").trim();
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    } catch {
      continue;
    }
    if (!cleaned.includes(value)) cleaned.push(value);
    if (cleaned.length >= MAX_GALLERY_IMAGES) break;
  }
  return cleaned;
};

const galleryUrlsSchema = z
  .array(z.string())
  .max(MAX_GALLERY_IMAGES)
  .optional()
  .transform(sanitizeHttpUrlList);

const openingHourItemSchema = z.object({
  day: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ]),
  isAvailable: z.boolean().default(true),
  openTime: z.string().nullable().optional(),
  closeTime: z.string().nullable().optional(),
});

export const createBusinessSchema = {
  body: z.object({
    businessName: z.preprocess(
      (v) => (typeof v === "string" && v.trim() ? v.trim() : "Register Your Business"),
      z.string().min(1).max(100),
    ),
    logo: z.string().nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    mapLink: httpUrlOrNull,
    bannerUrl: httpUrlOrNull,
    galleryUrls: galleryUrlsSchema,
    bio: z.string().trim().max(500).nullable().optional(),
    slug: slugSchema.optional(),
    phone: z.string().max(25).nullable().optional(),
    services: z.array(z.string().trim()).optional().default([]),
    openingHours: z.array(openingHourItemSchema).optional(),
  }),
};

export const updateBusinessSchema = {
  body: z.object({
    businessName: z.string().min(1).max(100).optional(),
    logo: z.string().nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    mapLink: httpUrlOrNull,
    bannerUrl: httpUrlOrNull,
    galleryUrls: galleryUrlsSchema,
    bio: z.string().trim().max(500).nullable().optional(),
    slug: slugSchema.optional(),
    phone: z.string().max(25).nullable().optional(),
    services: z.array(z.string().trim()).optional(),
    openingHours: z.array(openingHourItemSchema).optional(),
  }),
};

export const homeSummaryQuerySchema = {
  query: z.object({
    period: z.enum(["THIS_MONTH"]).optional().default("THIS_MONTH"),
  }),
};

export type CreateBusinessBody = z.infer<typeof createBusinessSchema.body>;
export type UpdateBusinessBody = z.infer<typeof updateBusinessSchema.body>;
export type HomeSummaryQuery = z.infer<typeof homeSummaryQuerySchema.query>;

export default {
  createBusinessSchema,
  updateBusinessSchema,
  homeSummaryQuerySchema,
};

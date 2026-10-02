import type { Request, Response } from "express";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { getUploadedObject, getUploadConfiguration, uploadImage } from "../services/upload.service.js";

export const getUploadStatus = (_req: Request, res: Response) => {
  return res.json({
    success: true,
    ...getUploadConfiguration(),
  });
};

export const uploadImageHandler = async (req: Request, res: Response) => {
  try {
    const folder = String(req.body?.folder || "uploads");
    const publicId = req.body?.publicId ? String(req.body.publicId) : undefined;
    const contentType = req.file?.mimetype || "image/jpeg";
    const protoHeader = String(req.get("x-forwarded-proto") || "").split(",")[0].trim();

    const { url, key } = await uploadImage({
      buffer: req.file?.buffer as Buffer,
      contentType,
      folder,
      publicId,
      publicUrlContext: {
        host: req.get("x-forwarded-host") || req.get("host") || undefined,
        proto: protoHeader || req.protocol || "https",
      },
    });

    trackEvent(ANALYTICS_EVENTS.PROFILE_PHOTO_UPLOADED, {
      user_id: req.user?.uid,
      context: String(folder).includes("banner") ? "event_banner" : "profile",
    });

    return res.status(201).json({
      success: true,
      data: { url, key, provider: "cloudflare-r2" },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

const publicObjectKey = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value.join("/");
  return String(value || "");
};

export const getPublicUploadHandler = async (req: Request, res: Response) => {
  try {
    const object = await getUploadedObject(publicObjectKey(req.params.key));
    const contentType = object.ContentType || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const body = object.Body;
    if (!body) {
      return res.status(404).json({
        success: false,
        code: "not_found",
        message: "File not found.",
      });
    }

    const bytes = await body.transformToByteArray();
    return res.send(Buffer.from(bytes));
  } catch (error) {
    return sendError(res, error, 404);
  }
};

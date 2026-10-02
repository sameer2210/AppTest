import { codedError } from "../../../utils/stronHttpError.util.js";
import {
  getR2Object,
  isR2Configured,
  uploadImageToR2,
} from "../../../services/r2Upload.service.js";
import type { PublicUrlContext, UploadImageParams, IUploadResult } from "../types/index.js";

export type { PublicUrlContext, UploadImageParams, IUploadResult };

export const uploadImage = async ({
  buffer,
  contentType,
  folder,
  publicId,
  publicUrlContext,
}: UploadImageParams): Promise<IUploadResult> => {
  if (!isR2Configured()) {
    throw codedError("service_unavailable", "Cloudflare R2 upload is not configured.");
  }
  if (!buffer?.length) {
    throw codedError("validation_error", "Image file is required.");
  }
  return uploadImageToR2({
    buffer,
    contentType,
    folder,
    publicId,
    publicUrlContext,
  });
};

export const getUploadConfiguration = () => ({
  configured: isR2Configured(),
});

export const getUploadedObject = async (key: string) => {
  if (!isR2Configured()) {
    throw codedError("service_unavailable", "Cloudflare R2 is not configured.");
  }
  const trimmed = decodeURIComponent(String(key || ""))
    .replace(/^\/+/, "")
    .trim();
  if (!trimmed || trimmed.includes("..")) {
    throw codedError("validation_error", "Invalid key.");
  }
  return getR2Object(trimmed);
};

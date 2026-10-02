/**
 * Upload module — authenticated image upload via Cloudflare R2 infra.
 */

export { uploadImage, getUploadedObject } from "./services/upload.service.js";
export { isR2Configured } from "../../services/r2Upload.service.js";

export * from "./types/index.js";

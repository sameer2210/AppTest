import type { PublicUrlContext } from "../../../types/service.util.js";
export type { PublicUrlContext };

export interface IUploadResult {
  url: string;
  key: string;
  contentType?: string;
  sizeBytes?: number;
}

export interface UploadImageParams {
  buffer: Buffer;
  contentType?: string;
  folder?: string;
  publicId?: string;
  publicUrlContext?: PublicUrlContext;
}


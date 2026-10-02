import { randomUUID } from "crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { ServiceParams, PublicUrlContext } from "../types/service.util.js";
import {
  getR2Endpoint,
  getR2Bucket,
  getR2AccessKeyId,
  getR2SecretAccessKey,
  getR2PublicBaseUrl,
} from "../constants/index.js";

export type { PublicUrlContext };


let client: S3Client | null = null;

const getClient = (): S3Client => {
  if (client) return client;
  const endpoint = getR2Endpoint();
  const bucket = getR2Bucket();
  const accessKeyId = getR2AccessKeyId();
  const secretAccessKey = getR2SecretAccessKey();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 is not configured on the server.");
  }
  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  return client;
};

export const isR2Configured = () =>
  Boolean(
    getR2Endpoint() &&
      getR2Bucket() &&
      getR2AccessKeyId() &&
      getR2SecretAccessKey(),
  );

const sanitizeSegment = (value: unknown, fallback: string) => {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
  return cleaned || fallback;
};

const resolvePublicBase = (publicUrlContext?: PublicUrlContext | null) => {
  const publicBaseUrl = getR2PublicBaseUrl();
  if (publicBaseUrl) return publicBaseUrl;

  // Prefer the host that handled the upload so local/apidev both work.
  if (publicUrlContext?.host) {
    const proto = publicUrlContext.proto || "https";
    return `${proto}://${publicUrlContext.host}/api/upload/public`;
  }

  const fromEnv = (process.env.PUBLIC_API_BASE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) {
    const cleanEnv = fromEnv.includes("apidev.stron.in")
      ? fromEnv.replace(/https?:\/\/apidev\.stron\.in/i, "https://apiv2.stron.in")
      : fromEnv;
    return `${cleanEnv}/api/upload/public`;
  }

  const backendHost = (process.env.BACKEND_URL || "").trim().replace(/\/$/, "");
  if (backendHost) {
    const cleanHost = backendHost.includes("apidev.stron.in") ? "apiv2.stron.in" : backendHost;
    const withProto = /^https?:\/\//i.test(cleanHost) ? cleanHost : `https://${cleanHost}`;
    return `${withProto}/api/upload/public`;
  }

  return "";
};

const buildPublicUrl = (key: string, publicUrlContext?: PublicUrlContext | null) => {
  const base = resolvePublicBase(publicUrlContext);
  if (!base) {
    throw new Error(
      "R2_PUBLIC_BASE_URL (or PUBLIC_API_BASE_URL / BACKEND_URL) is required to return image URLs.",
    );
  }
  const cleanKey = String(key || "").replace(/^\/+/, "");
  return `${base}/${cleanKey}`;
};

/**
 * Upload an image buffer to Cloudflare R2 and return a publicly usable URL.
 */
export const uploadImageToR2 = async ({
  buffer,
  contentType = "image/jpeg",
  folder = "uploads",
  publicId,
  publicUrlContext,
}: ServiceParams & {
  buffer: Buffer;
  contentType?: string;
  folder?: string;
  publicId?: string;
  publicUrlContext?: PublicUrlContext | null;
}) => {
  const safeFolder = sanitizeSegment(folder, "uploads");
  const id = sanitizeSegment(publicId, randomUUID());
  const ext =
    contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
  const key = `${safeFolder}/${id}.${ext}`;

  await getClient().send(
    new PutObjectCommand({
      Bucket: getR2Bucket() || "",
      Key: key,
      Body: buffer,
      ContentType: contentType || "image/jpeg",
    }),
  );

  return { key, url: buildPublicUrl(key, publicUrlContext) };
};

/**
 * Stream an object from R2 (used when no public bucket URL is configured).
 */
export const getR2Object = async (key: string) => {
  const result = await getClient().send(
    new GetObjectCommand({
      Bucket: getR2Bucket() || "",
      Key: key,
    }),
  );
  return result;
};

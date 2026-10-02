import { STRON_BACKEND_URL } from "@/constants/stron";

/**
 * Remote image URI helpers — SVG detection, raster fallbacks,
 * and host-agnostic R2 public proxy URL resolution.
 */

const UPLOAD_PUBLIC_PREFIX = "/api/upload/public/";

const backendBase = (): string => {
  const configured = (STRON_BACKEND_URL || "").trim().replace(/\/$/, "");
  if (!configured || configured.includes("apidev.stron.in")) {
    return "https://apiv2.stron.in";
  }
  return configured;
};

export const normalizeRemoteImageUri = (uri?: string | null): string | undefined => {
  const raw = uri?.trim();
  if (!raw) return undefined;

  if (raw.startsWith("file://") || raw.startsWith("content://") || raw.startsWith("data:")) {
    return raw;
  }

  const base = backendBase();

  if (/^https?:\/\//i.test(raw)) {
    const uploadMatch = raw.match(/\/api\/upload\/public\/(.+)$/i);
    if (uploadMatch && base) {
      const key = uploadMatch[1];
      return `${base}${UPLOAD_PUBLIC_PREFIX}${key}`;
    }
    if (raw.includes("apidev.stron.in") && base) {
      return raw.replace(/https?:\/\/apidev\.stron\.in/i, base);
    }
    return raw;
  }

  if (raw.startsWith(UPLOAD_PUBLIC_PREFIX)) {
    const key = raw.slice(UPLOAD_PUBLIC_PREFIX.length);
    return `${base}${UPLOAD_PUBLIC_PREFIX}${key}`;
  }

  if (raw.startsWith("/")) {
    return `${base}${UPLOAD_PUBLIC_PREFIX}${raw.replace(/^\/+/, "")}`;
  }

  if (/^(uploads|athletes|app-assets|images|bitmoji)\//i.test(raw)) {
    return `${base}${UPLOAD_PUBLIC_PREFIX}${raw}`;
  }

  return raw;
};

export const isRemoteSvgUri = (uri: string): boolean => /\.svg($|\?|#)/i.test(uri);

export const resolveRasterImageUri = (uri?: string | null): string | undefined => {
  const url = normalizeRemoteImageUri(uri);
  if (!url) return undefined;

  if (!isRemoteSvgUri(url)) {
    return url;
  }

  if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
    if (/\/f_(png|jpg|jpeg|webp|auto)\//i.test(url)) {
      return url;
    }
    return url.replace("/upload/", "/upload/f_png/");
  }

  return undefined;
};

/** @deprecated Use normalizeRemoteImageUri / resolveRasterImageUri / RemoteImage instead. */
export const resolveRemoteImageUri = resolveRasterImageUri;

export const resolveEventBannerUri = (bannerName?: string | null): string | undefined => {
  const raw = bannerName?.trim();
  if (!raw) return undefined;

  const base = backendBase();

  if (/^https?:\/\//i.test(raw)) {
    const uploadMatch = raw.match(/\/api\/upload\/public\/(.+)$/i);
    if (uploadMatch && base) {
      const key = uploadMatch[1];
      return resolveRasterImageUri(`${base}${UPLOAD_PUBLIC_PREFIX}${key}`);
    }
    return resolveRasterImageUri(raw);
  }

  if (raw.startsWith(UPLOAD_PUBLIC_PREFIX) && base) {
    return resolveRasterImageUri(`${base}${raw}`);
  }

  if (base && !raw.startsWith("/")) {
    return resolveRasterImageUri(`${base}${UPLOAD_PUBLIC_PREFIX}${raw}`);
  }

  return resolveRasterImageUri(raw);
};

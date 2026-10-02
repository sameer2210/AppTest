import type { ImageSourcePropType } from "react-native";
import r2AssetsMap from "../../assets/r2-assets.json";
import { STRON_BACKEND_URL } from "@/constants/stron";

/** Production host that actually serves `/api/upload/public` app-assets. */
const PROD_ASSET_ORIGIN = "https://apiv2.stron.in";

const isUnreachableAssetHost = (url: string) =>
  /apidev\.stron\.in|localhost|127\.0\.0\.1|10\.0\.2\.2|192\.168\./i.test(url);

/**
 * Public proxy base for Cloudflare R2 objects.
 * Local / apidev hosts 502 these files — fall back to apiv2.
 */
export const getR2PublicBaseUrl = (): string => {
  const api = (STRON_BACKEND_URL || "").replace(/\/$/, "");
  if (api && !isUnreachableAssetHost(api)) {
    return `${api}/api/upload/public`;
  }
  return `${PROD_ASSET_ORIGIN}/api/upload/public`;
};

export const getR2PublicProxyBase = getR2PublicBaseUrl;

export const R2_PUBLIC_BASE_URL = getR2PublicBaseUrl();

/** Rewrite a stored upload URL onto a host that can serve the file. */
export const rewriteUploadPublicUrl = (url: string): string => {
  const match = url.match(/^(https?:\/\/[^/]+)(\/api\/upload\/public\/)(.+)$/i);
  if (!match) return url;
  if (!isUnreachableAssetHost(match[1])) return url;
  return `${PROD_ASSET_ORIGIN}${match[2]}${match[3]}`;
};

export type R2AssetKey = keyof typeof r2AssetsMap;

export const getR2AssetUrl = (assetPath: string): string => {
  const normalized = assetPath.replace(/^\/+/, "").replace(/\\/g, "/");
  const mapped = (r2AssetsMap as Record<string, string>)[normalized];
  if (mapped) return rewriteUploadPublicUrl(mapped);
  return `${getR2PublicBaseUrl()}/${encodeURIComponent(`app-assets/${normalized}`)}`;
};

export const getR2ImageSource = (assetPath: string): ImageSourcePropType => ({
  uri: getR2AssetUrl(assetPath),
});

/** @deprecated Prefer getR2ImageSource — kept for call-site compatibility. */
export const resolveAssetSource = (
  assetPath: string,
  _fallbackLocalSource?: ImageSourcePropType,
): ImageSourcePropType => getR2ImageSource(assetPath);

export { r2AssetsMap };

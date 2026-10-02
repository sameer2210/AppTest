import { images } from "@/utils/images";
import { withProfileImageCacheBuster } from "@/models/user";

export const getDeterministicBitmoji = (uid?: string) => {
  if (!uid) return "bt1";
  let hash = 0;
  for (let i = 0; i < uid.length; i++) {
    hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = (Math.abs(hash) % 12) + 1;
  return `bt${index}` as keyof typeof images.BITMOJI;
};

export const getProfileImageSource = (profileUrl?: string | null, uid?: string) => {
  if (profileUrl && profileUrl.startsWith("bt")) {
    return images.BITMOJI[profileUrl as keyof typeof images.BITMOJI];
  }
  if (profileUrl && profileUrl.startsWith("http")) {
    return { uri: withProfileImageCacheBuster(profileUrl, uid) };
  }
  const bitmojiKey = getDeterministicBitmoji(uid);
  return images.BITMOJI[bitmojiKey];
};

export const isBitmojiUrl = (profileUrl?: string | null) =>
  !profileUrl || profileUrl.startsWith("bt") || !profileUrl.startsWith("http");

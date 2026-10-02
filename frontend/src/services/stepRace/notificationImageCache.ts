import { Platform } from "react-native";
import { getExpoFileSystem, type FileSystemModule } from "@/provider/expoFileSystemLazy";

const getFs = getExpoFileSystem;

const cache = new Map<string, string>();

/** Short stable hash so each URL gets its own file (avoids stale race-opp.jpg reuse). */
const hashForKey = (input: string): string => {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

const avatarCacheDir = (fs: FileSystemModule): string | null => {
  if (!fs.cacheDirectory) return null;
  return `${fs.cacheDirectory}stron-notif-avatars/`;
};

/** Download a remote image into cache; returns absolute file path for native RemoteViews. */
export const cacheRemoteImageToFile = async (
  url: string | null | undefined,
  keyPrefix: string,
): Promise<string | null> => {
  if (Platform.OS === "web") return null;
  const trimmed = url?.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null;

  const cached = cache.get(trimmed);
  if (cached) return cached;

  const fs = getFs();
  if (!fs?.cacheDirectory || !fs.downloadAsync) return null;

  try {
    const dir = avatarCacheDir(fs);
    if (!dir) return null;
    if (fs.makeDirectoryAsync) {
      await fs.makeDirectoryAsync(dir, { intermediates: true }).catch(() => undefined);
    }
    const ext = trimmed.toLowerCase().includes(".png")
      ? "png"
      : trimmed.toLowerCase().includes(".webp")
        ? "webp"
        : "jpg";
    // Prefix + URL hash — new opponent URL never reuses another opponent's bytes.
    const fileUri = `${dir}${keyPrefix}-${hashForKey(trimmed)}.${ext}`;
    const info = await fs.getInfoAsync(fileUri);
    if (!info.exists) {
      const result = await fs.downloadAsync(trimmed, fileUri);
      if (result.status < 200 || result.status >= 300) return null;
    }
    const path = fileUri.replace(/^file:\/\//, "");
    cache.set(trimmed, path);
    return path;
  } catch {
    return null;
  }
};

/** Drop in-memory + on-disk race avatar files so the next race cannot show a previous face. */
export const clearRaceNotificationAvatarCache = async (): Promise<void> => {
  cache.clear();
  if (Platform.OS === "web") return;
  const fs = getFs();
  const dir = fs ? avatarCacheDir(fs) : null;
  if (!fs || !dir) return;
  try {
    if (fs.readDirectoryAsync && fs.deleteAsync) {
      const names = await fs.readDirectoryAsync(dir).catch(() => [] as string[]);
      await Promise.all(
        names
          .filter((n) => n.startsWith("race-"))
          .map((n) => fs.deleteAsync!(`${dir}${n}`, { idempotent: true }).catch(() => undefined)),
      );
      return;
    }
    // Fallback: remove known legacy fixed-name files
    if (fs.deleteAsync) {
      await Promise.all(
        ["race-opp.jpg", "race-opp.png", "race-you.jpg", "race-you.png"].map((n) =>
          fs.deleteAsync!(`${dir}${n}`, { idempotent: true }).catch(() => undefined),
        ),
      );
    }
  } catch {
    /* ignore */
  }
};

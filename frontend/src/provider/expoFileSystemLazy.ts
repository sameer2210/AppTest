export type FileSystemModule = {
  cacheDirectory: string | null;
  documentDirectory: string | null;
  getInfoAsync: (uri: string) => Promise<{ exists: boolean }>;
  downloadAsync: (uri: string, fileUri: string) => Promise<{ uri: string; status: number }>;
  makeDirectoryAsync?: (uri: string, opts?: { intermediates?: boolean }) => Promise<void>;
  deleteAsync?: (uri: string, opts?: { idempotent?: boolean }) => Promise<void>;
  readDirectoryAsync?: (uri: string) => Promise<string[]>;
};

let cached: FileSystemModule | null | undefined;

/**
 * Lazy-loads Expo FileSystem to avoid hard crashes when native modules are unavailable.
 * Supports both modern Expo 54 legacy exports and base export fallbacks.
 */
export const getExpoFileSystem = (): FileSystemModule | null => {
  if (cached !== undefined) return cached;
  try {
    // Expo 54: legacy download/cache APIs live under /legacy
    cached = require("expo-file-system/legacy") as FileSystemModule;
    return cached;
  } catch {
    try {
      cached = require("expo-file-system") as FileSystemModule;
      return cached;
    } catch {
      cached = null;
      return null;
    }
  }
};

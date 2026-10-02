import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAppVersion } from "./appVersion";

export const RATING_PROMPT_OPEN_COUNT_KEY = "stron_rating_prompt_open_count";
export const RATING_PROMPT_DISMISSED_KEY = "stron_rating_prompt_dismissed";
export const RATING_PROMPT_DISMISSED_VERSION_KEY = "stron_rating_prompt_dismissed_version";

export const RATING_PROMPT_MIN_APP_OPENS = 5;

let openCountRecordedThisSession = false;

const parseOpenCount = (value: string | null) => {
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

export const isRatingPromptDismissedForCurrentVersion = async (): Promise<boolean> => {
  const currentVersion = getAppVersion();
  const dismissedVersion = await AsyncStorage.getItem(RATING_PROMPT_DISMISSED_VERSION_KEY);
  if (dismissedVersion === currentVersion) {
    return true;
  }

  // Backward compatibility fallback for legacy key
  const legacyDismissed = await AsyncStorage.getItem(RATING_PROMPT_DISMISSED_KEY);
  if (legacyDismissed === "true" && !dismissedVersion) {
    await AsyncStorage.setItem(RATING_PROMPT_DISMISSED_VERSION_KEY, currentVersion);
    return true;
  }

  return false;
};

export const markRatingPromptDismissed = async (): Promise<void> => {
  const currentVersion = getAppVersion();
  await AsyncStorage.setItem(RATING_PROMPT_DISMISSED_VERSION_KEY, currentVersion);
  await AsyncStorage.setItem(RATING_PROMPT_DISMISSED_KEY, "true");
};

export const getAppOpenCount = async (): Promise<number> => {
  const stored = await AsyncStorage.getItem(RATING_PROMPT_OPEN_COUNT_KEY);
  return parseOpenCount(stored);
};

export const incrementAppOpenCount = async (): Promise<number> => {
  const nextCount = (await getAppOpenCount()) + 1;
  await AsyncStorage.setItem(RATING_PROMPT_OPEN_COUNT_KEY, String(nextCount));
  return nextCount;
};

export const recordAppOpenAndShouldShowPrompt = async (): Promise<boolean> => {
  if (await isRatingPromptDismissedForCurrentVersion()) {
    return false;
  }

  let openCount = await getAppOpenCount();

  if (!openCountRecordedThisSession) {
    openCountRecordedThisSession = true;
    openCount = await incrementAppOpenCount();
  }

  return openCount >= RATING_PROMPT_MIN_APP_OPENS;
};

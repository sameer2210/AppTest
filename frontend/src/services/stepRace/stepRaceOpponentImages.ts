import type { ImageSourcePropType } from "react-native";
import { images } from "@/utils/images";

/** Unsplash License portraits for fictional starter bots. */
const unsplashPortrait = (photoId: string) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&q=80&w=400&h=400`;

/**
 * Actual Wikimedia Commons portraits.
 * Android's default OkHttp User-Agent is 403'd by Wikimedia; Image sources
 * must send a named User-Agent via `WIKIMEDIA_IMAGE_HEADERS`.
 */
const commonsFile = (fileName: string) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=400`;

export const WIKIMEDIA_IMAGE_HEADERS = {
  "User-Agent": "StronApp/1.0 (https://stron.in; step-race-avatars)",
  Accept: "image/jpeg,image/png,image/webp,*/*",
};

const WIKIMEDIA_CELEBRITY_PHOTOS: Record<string, string> = {
  athlete_bolt: commonsFile("Usain_Bolt_smiling_Berlin_2009.JPG"),
  athlete_ronaldo: commonsFile(
    "Cristiano_Ronaldo_Croatia_v_Portugal_2_July_2026-075_(cropped).jpg",
  ),
  athlete_kohli: commonsFile(
    "Virat_Kohli_during_the_India_vs_Aus_4th_Test_match_at_Narendra_Modi_Stadium_on_09_March_2023.jpg",
  ),
  athlete_messi: commonsFile("Leo_Messi_Argentina_v_Egypt_7_July_2026-1.jpg"),
  athlete_kipchoge: commonsFile("Eliud_Kipchoge_in_Berlin_-_2015_(cropped).jpg"),
  athlete_goggins: commonsFile("DavidGogginsMay08.jpg"),
  athlete_soman: commonsFile("Milind_Soman_at_the_NDTV_Marks_for_Sports_event_12.jpg"),
  athlete_singh: commonsFile("Fauja_Singh_(3x4_cropped).jpg"),
};

export const STEP_RACE_OPPONENT_AVATAR_URLS: Record<string, string> = {
  bot_roshni: unsplashPortrait("photo-1573496359142-b8d87734a5a2"),
  bot_amit: unsplashPortrait("photo-1560250097-0b93528c311a"),
  bot_sarthak: unsplashPortrait("photo-1519085360753-af0119f7cbe7"),
  ...WIKIMEDIA_CELEBRITY_PHOTOS,
};

const needsWikimediaHeaders = (url?: string | null) =>
  !!url && /wikimedia\.org|wikipedia\.org|Special:FilePath/i.test(url);

export const resolveStepRaceOpponentAvatarUrl = (
  uid?: string | null,
  url?: string | null,
): string | undefined => {
  if (uid && STEP_RACE_OPPONENT_AVATAR_URLS[uid]) {
    return STEP_RACE_OPPONENT_AVATAR_URLS[uid];
  }
  if (url) return url;
  return undefined;
};

export const resolveStepRaceOpponentAvatarSource = (
  uid?: string | null,
  url?: string | null,
): ImageSourcePropType => {
  const resolved = resolveStepRaceOpponentAvatarUrl(uid, url);
  if (!resolved) return images.HOME_V2.AVATAR_SAMPLE;
  if (needsWikimediaHeaders(resolved)) {
    return { uri: resolved, headers: WIKIMEDIA_IMAGE_HEADERS };
  }
  return { uri: resolved };
};

import { SCREEN_CONTENT_PADDING_TOP } from "@/utils/screen-layout";

/** Space between the status bar / notch and the explore search row (Tailwind mt-6). */
export const EXPLORE_NOTCH_SEARCH_GAP = 24;

/** Matches `GLASS_SEARCH_BAR_HEIGHT` in GlassSearchField. */
export const EXPLORE_SEARCH_BAR_HEIGHT = 52;

export const getExploreStickySearchPaddingTop = () =>
  SCREEN_CONTENT_PADDING_TOP + EXPLORE_NOTCH_SEARCH_GAP;

/** Scroll content offset below the sticky explore search row. */
export const getExploreStickySearchContentOffset = (bottomPadding = 8) =>
  SCREEN_CONTENT_PADDING_TOP + EXPLORE_NOTCH_SEARCH_GAP + EXPLORE_SEARCH_BAR_HEIGHT + bottomPadding;

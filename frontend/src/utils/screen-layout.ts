import type { TextStyle, ViewStyle } from "react-native";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

/** Screen edge padding — matches HomeScreen / Figma shell */
export const SCREEN_HORIZONTAL_PADDING = 16;

/** Screen edge padding for form-heavy / detail shells */
export const SCREEN_HORIZONTAL_PADDING_WIDE = 22;

/** Scroll/content container vertical padding (see screen-padding.mdc) */
export const SCREEN_CONTENT_PADDING_TOP = 18;
export const SCREEN_CONTENT_PADDING_BOTTOM = 30;

/** Vertical gap between major sections on a screen */
export const SCREEN_SECTION_GAP = 20;

/** Gap between sibling cards in a row or list */
export const SCREEN_CARD_GAP = 12;

/** Horizontal battle card width on home — peek next card */
export const SCREEN_BATTLE_CARD_WIDTH_PCT = "82%";

/** Default ScrollView / screen content container (16px edge padding) */
export const screenContentContainerStyle: ViewStyle = {
  paddingTop: SCREEN_CONTENT_PADDING_TOP,
  paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
  paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
};

/** Wide ScrollView / screen content container (22px edge padding for form-heavy shells / sticky CTAs) */
export const screenContentContainerWideStyle: ViewStyle = {
  paddingTop: SCREEN_CONTENT_PADDING_TOP,
  paddingBottom: SCREEN_CONTENT_PADDING_BOTTOM,
  paddingHorizontal: SCREEN_HORIZONTAL_PADDING_WIDE,
};

/** Uppercase section header — e.g. ACTIVE CLAN BATTLES */
export const screenSectionLabelStyle: TextStyle = {
  ...headingTextStyles.fourteenBoldBlack,
  color: "rgba(245,236,216,0.8)",
};

/** Gold underlined action link — e.g. VIEW BATTLES */
export const screenLinkTextStyle: TextStyle = {
  ...fontTextStyles.fourteenNormalBlack,
  color: "#FDD85D",
  textDecorationLine: "underline",
};

export const screenSectionShellStyle = {
  paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
} as const;

/** Horizontal ScrollView / FlatList content — left inset only so the next card peeks at the right edge (HomeScreen pattern). */
export const horizontalScrollContentStyle: ViewStyle = {
  paddingLeft: SCREEN_HORIZONTAL_PADDING,
  gap: SCREEN_CARD_GAP,
};

/** Static blocks (titles, cards, forms) when the screen scroll container has no horizontal padding. */
export const screenSectionInsetStyle: ViewStyle = {
  paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
};

/** Break a horizontal list out of a padded parent so it can bleed to the right screen edge. */
export const horizontalScrollBreakoutStyle = (
  inset: number = SCREEN_HORIZONTAL_PADDING,
): ViewStyle => ({
  marginHorizontal: -inset,
});

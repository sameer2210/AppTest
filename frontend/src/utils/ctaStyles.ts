import { StyleSheet } from "react-native";
import { fontTextStyles, headingTextStyles } from "@/utils/typography";

export const CTA_GOLD = "#FDD85D";
export const CTA_TEXT_DARK = "#111111";

/** Extra scroll padding when a sticky gold CTA bar sits above the tab bar. */
export const STICKY_FOOTER_SCROLL_PADDING = 120;

export const ctaStyles = StyleSheet.create({
  primaryButton: {
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: CTA_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonCompact: {
    minHeight: 38,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: CTA_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonSoft: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CTA_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    ...headingTextStyles.eighteenExtraBoldBlack,
    color: CTA_TEXT_DARK,
    textAlign: "center",
  },
  primaryButtonTextCompact: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: CTA_TEXT_DARK,
    textAlign: "center",
  },
  secondaryButtonText: {
    ...fontTextStyles.eighteenSemiBoldBlack,
    color: CTA_TEXT_DARK,
    textAlign: "center",
  },
  stickyBar: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 24,
    paddingTop: 8,
  },
  compactButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    minWidth: 64,
    borderRadius: 6,
    backgroundColor: CTA_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButtonOutline: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    minWidth: 64,
    borderRadius: 6,
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: CTA_GOLD,
    alignItems: "center",
    justifyContent: "center",
  },
  compactButtonText: {
    ...fontTextStyles.fourteenSemiBoldBlack,
    color: CTA_TEXT_DARK,
    textAlign: "center",
  },
  compactOutlineText: {
    ...fontTextStyles.fourteenMediumBlack,
    color: CTA_GOLD,
    textAlign: "center",
  },
  cardSurface: {
    padding: 16,
    borderRadius: 12,
  },
});

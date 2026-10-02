/**
 * Expo font assets — loaded once in app/_layout.tsx via useFonts(rootFonts).
 * Family name maps live in src/utils/typography.ts.
 */
export const rootFonts = {
  "Barlow-Regular": require("../../assets/fonts/Barlow-Regular.ttf"),
  "Barlow-Medium": require("../../assets/fonts/Barlow-Medium.ttf"),
  "Barlow-SemiBold": require("../../assets/fonts/Barlow-SemiBold.ttf"),
  "Barlow-Bold": require("../../assets/fonts/Barlow-Bold.ttf"),
  "Barlow-ExtraBold": require("../../assets/fonts/Barlow-ExtraBold.ttf"),
  "BarlowCondensed-Regular": require("../../assets/fonts/BarlowCondensed-Regular.ttf"),
  "BarlowCondensed-Medium": require("../../assets/fonts/BarlowCondensed-Medium.ttf"),
  "BarlowCondensed-Bold": require("../../assets/fonts/BarlowCondensed-Bold.ttf"),
  "BarlowCondensed-ExtraBold": require("../../assets/fonts/BarlowCondensed-ExtraBold.ttf"),
  "BarlowCondensed-SemiBoldItalic": require("../../assets/fonts/BarlowCondensed-SemiBoldItalic.ttf"),
  "Inter-Regular": require("../../assets/fonts/Inter/Inter-Regular.ttf"),
  "Inter-Medium": require("../../assets/fonts/Inter/Inter-Medium.ttf"),
  "Inter-SemiBold": require("../../assets/fonts/Inter/Inter-SemiBold.ttf"),
  "Inter-Bold": require("../../assets/fonts/Inter/Inter-Bold.ttf"),
} as const;

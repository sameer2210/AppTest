/** Shared font manifest — used by app.config.js (native linking) and kept in sync with src/constants/fonts.ts */
const FONT_FILES = [
  "Barlow-Regular.ttf",
  "Barlow-Medium.ttf",
  "Barlow-SemiBold.ttf",
  "Barlow-Bold.ttf",
  "Barlow-ExtraBold.ttf",
  "BarlowCondensed-Regular.ttf",
  "BarlowCondensed-Medium.ttf",
  "BarlowCondensed-Bold.ttf",
  "BarlowCondensed-ExtraBold.ttf",
  "BarlowCondensed-SemiBoldItalic.ttf",
  "Inter/Inter-Regular.ttf",
  "Inter/Inter-Medium.ttf",
  "Inter/Inter-SemiBold.ttf",
  "Inter/Inter-Bold.ttf",
];

const fontPaths = FONT_FILES.map((fileName) => `./assets/fonts/${fileName}`);

module.exports = {
  FONT_FILES,
  fontPaths,
};

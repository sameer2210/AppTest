const {
  colors,
  fontFamily,
  spacing,
  fontSize,
  lineHeight,
} = require("./src/theme/figma-tokens.js");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors,
      fontFamily,
      fontSize: {
        "display-lg": [
          `${fontSize["display-lg"]}px`,
          { lineHeight: `${lineHeight["display-lg"]}px` },
        ],
        "title-md": [`${fontSize["title-md"]}px`, { lineHeight: `${lineHeight["title-md"]}px` }],
        "body-md": [`${fontSize["body-md"]}px`, { lineHeight: `${lineHeight["body-md"]}px` }],
      },
      spacing: {
        "screen-px": `${spacing.screen.px}px`,
        "screen-pt": `${spacing.screen.pt}px`,
        "screen-pb": `${spacing.screen.pb}px`,
        "section-gap": `${spacing.section.gap}px`,
      },
      borderRadius: {
        card: `${spacing.card.radius.lg}px`,
        pill: `${spacing.card.radius.pill}px`,
        action: `${spacing.card.radius.sm}px`,
        bar: `${spacing.card.radius.bar}px`,
        fab: `${spacing.card.radius.fab}px`,
      },
    },
  },
  plugins: [],
};

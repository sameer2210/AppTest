/** Figma Stron design tokens — source for tailwind.config.js (Node). */
module.exports = {
  colors: {
    brand: {
      blue: "#086CFF",
      "blue-dark": "#003DCF",
      "blue-light": "#4E92FF",
    },
    background: {
      dark: "#121212",
      card: "#212121",
      glass: "rgba(25,25,25,0.2)",
      "glass-strong": "rgba(38,38,38,0.2)",
      white: "#FFFFFF",
      muted: "#D9D9D9",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "rgba(255,255,255,0.6)",
      tertiary: "rgba(255,255,255,0.5)",
      dark: "#000000",
      "dark-muted": "rgba(0,0,0,0.6)",
      "dark-subtle": "rgba(0,0,0,0.5)",
    },
    border: {
      white: "#FFFFFF",
      subtle: "rgba(255,255,255,0.08)",
    },
    status: {
      live: "#086CFF",
      badge: "#FF5252",
    },
    /** Step Race screen — matches assets/bg/Step Race.png (blue top → black bottom) */
    gradient: {
      stepRace: ["#2B7FFF", "#1A6FEB", "#086CFF", "#053A9E", "#021A4A", "#000000"],
      /** Step Race lose result — bright magenta top → black bottom */
      stepRaceLose: ["#7A2280", "#5A1860", "#3D1045", "#1A0A20", "#0A0A0F", "#000000"],

      /** Explore (Figma 1423:70) — blue glow bottom-left → black top-right */
      explore: ["#0057D9", "#0049BA", "#00307A", "#0A1A38", "#00040B"],
    },
    stepRace: {
      loseCard: "#3C1002",
    },
    /** Legacy gold palette — keep during migration */
    legacy: {
      gold: "#FDD85D",
      "gradient-top": "#042656",
      "gradient-mid": "#051D3F",
      "gradient-bottom": "#070707",
      card: "#192B44",
    },
  },
  fontFamily: {
    body: ["Helvetica"],
    "body-medium": ["Helvetica"],
    "body-semibold": ["Helvetica"],
    heading: ["Helvetica"],
    "heading-medium": ["Helvetica"],
    "heading-bold": ["Helvetica"],
    inter: ["Helvetica"],
    "inter-medium": ["Helvetica"],
    "inter-semibold": ["Helvetica"],
    "inter-bold": ["Helvetica"],
  },
  /** Figma v2 type scale (Step Race node 1:3216) */
  fontSize: {
    "display-lg": 40,
    "title-md": 20,
    "body-md": 16,
  },
  lineHeight: {
    "display-lg": 39,
    "title-md": 39,
    "body-md": 39,
  },
  spacing: {
    screen: { px: 13, pt: 8, pb: 120 },
    section: { gap: 16 },
    card: {
      gap: 12,
      radius: { sm: 8, md: 10, lg: 18, pill: 23, bar: 42, fab: 58 },
    },
  },
  boxShadow: {
    tab: "0px 3px 6px rgba(0,0,0,0.16), 0px 11px 11px rgba(0,0,0,0.14), 0px 25px 15px rgba(0,0,0,0.08)",
  },
};

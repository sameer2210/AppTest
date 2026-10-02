// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  smMd: 12,
  md: 16,
  mdLg: 20,
  lg: 24,
  xl: 32,
  xxl: 40,
  screen: 16,
  screenWide: 22,
} as const;

// ─── Border radius ───────────────────────────────────────────────────────────

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
} as const;

// ─── Shadow (Cosmic Violet) ──────────────────────────────────────────────────

export const shadow = {
  card: {
    shadowColor: "#7C6FCD",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modal: {
    shadowColor: "#7C6FCD",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
  fab: {
    shadowColor: "#7C6FCD",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 28,
    elevation: 10,
  },
} as const;

// ─── Motion ───────────────────────────────────────────────────────────────────

export const motion = {
  instant: {
    duration: 0,
    easing: "easeOut",
  },
  fast: {
    duration: 100,
    easing: "easeOut",
  },
  base: {
    duration: 150,
    easing: "easeOut",
  },
  standard: {
    duration: 200,
    easing: "cubicBezier(0.4, 0, 0.2, 1)",
  },
  emphasized: {
    duration: 300,
    easing: "spring",
    stiffness: 300,
    damping: 28,
  },
} as const;

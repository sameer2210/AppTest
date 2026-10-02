import { figmaColors } from "./figma-tokens";

export const GRADIENT_LOCATIONS = {
  stepRace: [0, 0.14, 0.32, 0.52, 0.74, 1] as const,
  stepRaceLose: [0, 0.14, 0.32, 0.52, 0.74, 1] as const,
} as const;

export type ScreenGradientVariant = "stepRace" | "stepRaceLose";

export const SCREEN_GRADIENTS: Record<
  ScreenGradientVariant,
  { colors: readonly string[]; locations: readonly number[] }
> = {
  stepRace: {
    colors: figmaColors.gradient.stepRace,
    locations: GRADIENT_LOCATIONS.stepRace,
  },
  stepRaceLose: {
    colors: figmaColors.gradient.stepRaceLose,
    locations: GRADIENT_LOCATIONS.stepRaceLose,
  },
};

export const GRADIENT_AXIS = {
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
} as const;

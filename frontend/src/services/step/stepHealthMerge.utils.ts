import { MAX_DAILY_STEPS, sanitizeDailySteps } from "@/constants/steps";

/**
 * When |pedometer − Google Fit / Health Connect| is at or below this, trust the
 * on-device pedometer. Above this gap, adopt the health-store total and sync it.
 */
export const PEDOMETER_HEALTH_DIVERGENCE_THRESHOLD = 50;

/**
 * Soft cap still used by Health Connect day sanitizers for multi-day dump rejection.
 * Merge itself no longer uses this — divergence > 50 always prefers Fit.
 */
export const DEFAULT_MAX_HEALTH_JUMP_ABOVE_PEDOMETER = 4_000;

export type StepHealthMergeResult = {
  steps: number;
  /** True when we replaced pedometer with a lower health total. */
  corrected: boolean;
  source: "pedometer" | "health";
  healthSteps: number;
  pedometerSteps: number;
};

/**
 * Production merge rule:
 * - |ped − health| ≤ 50 → sync / use pedometer
 * - |ped − health| > 50 → sync / use Google Fit (Health Connect / HealthKit)
 *
 * Health total of 0 → always pedometer (Fit unavailable / unauthorized).
 */
export const mergePedometerWithHealthSteps = (
  pedometerSteps: number,
  healthSteps: number,
  options?: { threshold?: number; maxJumpAbovePedometer?: number },
): StepHealthMergeResult => {
  const ped = sanitizeDailySteps(pedometerSteps);
  const hc = sanitizeDailySteps(healthSteps);
  const threshold = options?.threshold ?? PEDOMETER_HEALTH_DIVERGENCE_THRESHOLD;

  if (hc <= 0) {
    return {
      steps: ped,
      corrected: false,
      source: "pedometer",
      healthSteps: hc,
      pedometerSteps: ped,
    };
  }

  const diff = Math.abs(ped - hc);
  if (diff <= threshold) {
    return {
      steps: ped,
      corrected: false,
      source: "pedometer",
      healthSteps: hc,
      pedometerSteps: ped,
    };
  }

  // Divergence > 50 → prefer Google Fit / Health Connect (capped).
  const adopted = Math.min(hc, MAX_DAILY_STEPS);
  return {
    steps: adopted,
    corrected: adopted < ped,
    source: "health",
    healthSteps: hc,
    pedometerSteps: ped,
  };
};

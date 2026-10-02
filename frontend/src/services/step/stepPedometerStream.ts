import { Pedometer } from "expo-sensors";
import { hasPedometerAccess } from "./stepNativePlatform";
import { saveLocalSteps } from "./stepStorage";

let subscription: { remove: () => void } | null = null;
let iosWatcherBase = 0;

export const getIosWatcherBase = (): number => iosWatcherBase;
export const setIosWatcherBase = (val: number): void => {
  iosWatcherBase = Math.max(0, val);
};

export const subscribeIosWatcher = async (
  base: number,
  onStepUpdate: (steps: number) => void,
): Promise<void> => {
  if (!(await hasPedometerAccess())) return;
  iosWatcherBase = Math.max(0, base);
  subscription?.remove();
  subscription = Pedometer.watchStepCount(async (result) => {
    const steps = iosWatcherBase + Math.max(0, result.steps);
    const best = await saveLocalSteps(steps);
    onStepUpdate(best);
  });
};

export const resetIosWatcher = (): void => {
  iosWatcherBase = 0;
  subscription?.remove();
  subscription = null;
};

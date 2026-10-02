export const SPLASH_DURATION_MS = 500;

let splashStartedAt = Date.now();

export const markSplashStart = () => {
  splashStartedAt = Date.now();
};

export const waitForSplashEnd = async (): Promise<void> => {
  const remaining = SPLASH_DURATION_MS - (Date.now() - splashStartedAt);
  if (remaining > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
};

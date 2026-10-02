export const log = (...args: unknown[]) => {
  if (__DEV__) {
    console.log(...args);
  }
};

export const logError = (...args: unknown[]) => {
  if (__DEV__) {
    console.error(...args);
  }
};

export const logWarn = (...args: unknown[]) => {
  if (__DEV__) {
    console.warn(...args);
  }
};

export const logInfo = (...args: unknown[]) => {
  if (__DEV__) {
    console.info(...args);
  }
};

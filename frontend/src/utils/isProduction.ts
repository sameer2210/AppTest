export type IsProductionOptions = {
  mode?: string;
  isDevBuild?: boolean;
};

export const isProduction = (options?: IsProductionOptions): boolean => {
  if (options?.isDevBuild === true) {
    return false;
  }
  const mode = options?.mode?.trim().toLowerCase();
  if (mode === "development") {
    return false;
  }
  return true;
};

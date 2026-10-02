/** MongoDB duplicate-key and driver error helpers for catch blocks. */
export type MongoDriverError = Error & { code?: number; name?: string };

export const isMongoDuplicateKeyError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  const { code, name } = error as MongoDriverError;
  return code === 11_000 || (name === "MongoServerError" && code === 11_000);
};

export const getMongoErrorCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  return (error as MongoDriverError).code;
};

/** True when an E11000 duplicate-key error is on the given field (e.g. slug vs ownerId). */
export const isMongoDuplicateOnField = (error: unknown, field: string): boolean => {
  if (!isMongoDuplicateKeyError(error) || !error || typeof error !== "object") {
    return false;
  }
  const { keyValue, keyPattern } = error as {
    keyValue?: Record<string, unknown>;
    keyPattern?: Record<string, unknown>;
  };
  return Boolean(keyValue?.[field] ?? keyPattern?.[field]);
};

export const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

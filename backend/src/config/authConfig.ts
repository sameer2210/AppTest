export type AuthConfig = {
  jwtSecret: string;
  accessExpiry: string;
  refreshExpiry: string;
  accessTokenBufferSeconds: number;
};

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const authConfig: AuthConfig = {
  jwtSecret: process.env.JWT_SECRET?.trim() || "",
  accessExpiry: process.env.JWT_ACCESS_EXPIRY?.trim() || "15m",
  refreshExpiry: process.env.JWT_REFRESH_EXPIRY?.trim() || "7d",
  accessTokenBufferSeconds: parsePositiveInt(
    process.env.JWT_ACCESS_BUFFER_SECONDS,
    30,
  ),
};

export function assertJwtConfigured(): void {
  if (!authConfig.jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

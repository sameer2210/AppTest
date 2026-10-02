import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import crypto from "node:crypto";
import { authConfig, assertJwtConfigured } from "../config/authConfig.js";
import type {
  AccessTokenPayload,
  AuthUser,
  RefreshTokenPayload,
  SignTokenInput,
} from "../types/auth.js";

const JWT_ALGORITHM = "HS256" as const;

function parseRefreshExpiryMs(): number {
  const match = authConfig.refreshExpiry.match(/^(\d+)([dhms])$/);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * (multipliers[unit] ?? multipliers.d);
}

function assertTokenPayload(
  decoded: JwtPayload | string,
): asserts decoded is AccessTokenPayload {
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload.");
  }
  if (
    !decoded.uid ||
    typeof decoded.uid !== "string" ||
    !decoded.uid.trim()
  ) {
    throw new Error("Invalid token payload.");
  }
}

export function signAccessToken({ uid, email }: SignTokenInput): string {
  assertJwtConfigured();
  const options: SignOptions = {
    expiresIn: authConfig.accessExpiry as SignOptions["expiresIn"],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(
    { uid, email: email ?? null, type: "access" },
    authConfig.jwtSecret,
    options,
  );
}

export function signRefreshToken({ uid, email }: SignTokenInput): string {
  assertJwtConfigured();
  const options: SignOptions = {
    expiresIn: authConfig.refreshExpiry as SignOptions["expiresIn"],
    algorithm: JWT_ALGORITHM,
  };
  return jwt.sign(
    {
      uid,
      email: email ?? null,
      type: "refresh",
      jti: crypto.randomUUID(),
    },
    authConfig.jwtSecret,
    options,
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  assertJwtConfigured();
  const decoded = jwt.verify(token, authConfig.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload.");
  }
  if (decoded.type === "refresh") {
    throw new Error("Invalid token type.");
  }
  assertTokenPayload(decoded);
  return decoded;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  assertJwtConfigured();
  const decoded = jwt.verify(token, authConfig.jwtSecret, {
    algorithms: [JWT_ALGORITHM],
  });
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload.");
  }
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type.");
  }
  assertTokenPayload(decoded);
  return decoded as RefreshTokenPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiryDate(): Date {
  return new Date(Date.now() + parseRefreshExpiryMs());
}

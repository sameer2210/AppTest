import type { Request, RequestHandler } from "express";
import { authConfig, assertJwtConfigured } from "../config/authConfig.js";
import { verifyAccessToken } from "../utils/jwt.util.js";
import type { AccessTokenPayload, AuthUser } from "../types/auth.js";

const attachUser = (req: Request, decoded: AccessTokenPayload): void => {
  const user: AuthUser = {
    uid: decoded.uid,
    email: decoded.email ?? null,
  };
  req.user = user;
  req.auth = user;
};

const verifyAppAccessToken = (token: string): AccessTokenPayload => {
  assertJwtConfigured();
  return verifyAccessToken(token);
};

/** Protected routes accept only short-lived app JWTs. */
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    if (!authConfig.jwtSecret) {
      return res.status(503).json({
        success: false,
        message: "Authentication is not configured.",
      });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Missing Bearer token." });
    }

    try {
      const decoded = verifyAppAccessToken(token);
      attachUser(req, decoded);
      return next();
    } catch (jwtError) {
      if (
        jwtError instanceof Error &&
        jwtError.name === "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({ success: false, message: "Token expired." });
      }
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token." });
    }
  } catch {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token." });
  }
};

/** Attach user when a valid JWT is present; never block the request. */
export const optionalAuth: RequestHandler = async (req, res, next) => {
  try {
    if (!authConfig.jwtSecret) return next();
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return next();
    const decoded = verifyAppAccessToken(token);
    attachUser(req, decoded);
  } catch {
    // Invalid/expired token — still serve the resource anonymously.
  }
  return next();
};

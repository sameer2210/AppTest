import type { Request, Response } from "express";
import {
  ensureMongoUser,
  guestSignInService,
  refreshAccessTokenService,
  logoutService,
  sendOtpService,
  resendOtpService,
  verifyOtpService,
  exchangeTokenService,
  tryGetUidFromAccessToken,
} from "../services/auth.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { getErrorCode } from "../../../types/errors.js";

const clientFromReq = (req: Request) => ({ ip: req.ip });

export const syncUser = async (req: Request, res: Response) => {
  const uid = req.user?.uid || req.body?.uid;
  const { email, username, profileImageUrl, contactNo } = req.body || {};

  if (!uid) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      code: "unauthorized",
    });
  }

  try {
    const mongoUser = await ensureMongoUser(uid, {
      email,
      username,
      profileImageUrl,
      contactNo: contactNo || undefined,
    });
    return res.json({ message: "User synced", user: mongoUser });
  } catch (err) {
    if (getErrorCode(err) === "phone_already_linked") {
      const fallbackUser = await ensureMongoUser(uid, {
        email,
        username,
        profileImageUrl,
      });
      return res.json({ message: "User synced (phone unlinked)", user: fallbackUser });
    }
    return sendError(res, err);
  }
};

export const guestSignIn = async (req: Request, res: Response) => {
  try {
    const result = await guestSignInService(req.body || {});
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const sendOtp = async (req: Request, res: Response) => {
  try {
    const result = await sendOtpService(req.body.phone, clientFromReq(req));
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const resendOtp = async (req: Request, res: Response) => {
  try {
    const result = await resendOtpService(req.body.phone, clientFromReq(req));
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const result = await verifyOtpService({
      phone: req.body.phone,
      otp: req.body.otp,
      existingUid: tryGetUidFromAccessToken(req.headers.authorization),
      client: clientFromReq(req),
    });
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const exchangeToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const firebaseToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    const result = await exchangeTokenService({
      firebaseToken,
      username: req.body?.username,
      profileImageUrl: req.body?.profileImageUrl,
    });
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const result = await refreshAccessTokenService(req.body?.refreshToken);
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const result = await logoutService(req.body?.refreshToken, req.user?.uid);
    return res.json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export default {
  syncUser,
  guestSignIn,
  sendOtp,
  resendOtp,
  verifyOtp,
  exchangeToken,
  refreshAccessToken,
  logout,
};

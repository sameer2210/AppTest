import express from "express";
import {
  syncUser,
  guestSignIn,
  sendOtp,
  verifyOtp,
  resendOtp,
  exchangeToken,
  refreshAccessToken,
  logout,
} from "../controllers/auth.controller.js";
import { authLimiter } from "../../../middleware/rateLimiter.js";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  syncUserSchema,
  guestSignInSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  exchangeTokenSchema,
  refreshAccessTokenSchema,
  logoutSchema,
} from "../validators/auth.validator.js";

const router = express.Router();

router.post("/sync-user", requireAuth, validateRequest(syncUserSchema), syncUser);

// Device-bound guest (restore progress on same device after reinstall)
router.post("/guest", authLimiter, validateRequest(guestSignInSchema), guestSignIn);

// OTP auth — send / verify / resend only (APITxT)
router.post("/send-otp", authLimiter, validateRequest(sendOtpSchema), sendOtp);
router.post("/verify-otp", authLimiter, validateRequest(verifyOtpSchema), verifyOtp);
router.post("/resend-otp", authLimiter, validateRequest(resendOtpSchema), resendOtp);

// Global JWT session (OAuth + refresh)
router.post("/exchange-token", authLimiter, validateRequest(exchangeTokenSchema), exchangeToken);
router.post("/refresh", authLimiter, validateRequest(refreshAccessTokenSchema), refreshAccessToken);
router.post("/logout", validateRequest(logoutSchema), logout);

export default router;

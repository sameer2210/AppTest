/**
 * Identity & Auth — routes for app mount + services/models for other modules.
 */

export { default as UserModel } from "./models/user.model.js";
export { default as RefreshToken } from "./models/refreshToken.model.js";
export { default as PhoneOtp } from "./models/phoneOtp.model.js";
export { default as OtpAuditLog } from "./models/otpAuditLog.model.js";

export * as authService from "./services/auth.service.js";
export * as userService from "./services/user.service.js";
export * as otpService from "./services/otp.service.js";
export { syncAllUsersFromFirestore } from "./services/userSync.service.js";

export * from "./types/index.js";

import admin from "firebase-admin";
import UserModel from "../models/user.model.js";
import RefreshToken from "../models/refreshToken.model.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import type { OtpClientContext, OtpThrown, IUser, IRefreshToken } from "../types/index.js";

import { codedError } from "../../../utils/stronHttpError.util.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  getRefreshTokenExpiryDate,
  verifyAccessToken,
} from "../../../utils/jwt.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import {
  sendPhoneOtp,
  resendPhoneOtp,
  verifyPhoneOtp,
  getPhoneE164,
} from "./otp.service.js";

export const defaultUserInsertFields = () => ({
  coins: 0,
  todaysStepCount: 0,
  isDeleted: false,
});

export const normalizeContactNo = (phone: string | null | undefined): string => {
  if (!phone) return "";
  return String(phone).replace(/^\+91/, "").trim();
};

const getFirebaseErrorCode = (error: unknown): string | undefined => {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code: unknown }).code;
  return typeof code === "string" ? code : undefined;
};

export const getOrCreateFirebaseUserByPhone = async (phoneE164: string) => {
  try {
    return await admin.auth().getUserByPhoneNumber(phoneE164);
  } catch (error) {
    if (getFirebaseErrorCode(error) === "auth/user-not-found") {
      return admin.auth().createUser({ phoneNumber: phoneE164 });
    }
    throw error;
  }
};

export const ensureFirebaseUserByUid = async (uid: string) => {
  try {
    return await admin.auth().getUser(uid);
  } catch (error) {
    if (getFirebaseErrorCode(error) === "auth/user-not-found") {
      return admin.auth().createUser({ uid });
    }
    throw error;
  }
};

export const persistRefreshToken = async (
  uid: string,
  refreshToken: string,
  { email = null, retries = 2 }: { email?: string | null; retries?: number } = {},
) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const token =
      attempt === 0 ? refreshToken : signRefreshToken({ uid, email });
    try {
      await RefreshToken.create({
        tokenHash: hashToken(token),
        uid,
        expiresAt: getRefreshTokenExpiryDate(),
      });
      return token;
    } catch (err) {
      if (isMongoDuplicateKeyError(err) && attempt < retries) continue;
      throw err;
    }
  }
  throw new Error("Failed to persist refresh token.");
};

export const issueJwtPair = async (uid: string, email: string | null = null) => {
  const accessToken = signAccessToken({ uid, email });
  const refreshToken = signRefreshToken({ uid, email });

  await RefreshToken.updateMany({ uid, revoked: false }, { revoked: true });
  const storedRefreshToken = await persistRefreshToken(uid, refreshToken, {
    email,
  });

  return { accessToken, refreshToken: storedRefreshToken };
};

/** Finds an existing active user by verified phone number. */
export const findUserByPhone = async (rawPhone: string | null | undefined) => {
  const contactNo = normalizeContactNo(rawPhone);
  if (!contactNo) return null;

  const phoneE164 = `+91${contactNo}`;

  return await UserModel.findOne({
    $or: [{ contactNo }, { contactNo: phoneE164 }],
    phoneVerified: true,
    isDeleted: false,
  });
};

/** Asserts that a phone number is not already verified and linked to another active account. */
export const assertPhoneNotLinked = async (
  rawPhone: string | null | undefined,
  excludeUid: string | null = null,
) => {
  const contactNo = normalizeContactNo(rawPhone);
  if (!contactNo) return;

  const phoneE164 = `+91${contactNo}`;

  const query: MongoFilter = {
    $or: [{ contactNo }, { contactNo: phoneE164 }],
    phoneVerified: true,
    isDeleted: false,
  };

  if (excludeUid) {
    query.uid = { $ne: excludeUid };
  }

  const existing = await UserModel.findOne(query).lean();
  if (existing) {
    throw codedError(
      "phone_already_linked",
      "This mobile number is already linked to another STRON account.",
    );
  }
};

export const ensureMongoUser = async (
  uid: string,
  profile: ServiceParams = {},
) => {
  const {
    email,
    username,
    profileImageUrl,
    contactNo,
    emailVerified,
    phoneVerified,
  } = profile;

  const normalizedContact = contactNo ? normalizeContactNo(String(contactNo)) : "";
  const willVerifyPhone = phoneVerified === true && Boolean(normalizedContact);

  if (willVerifyPhone) {
    await assertPhoneNotLinked(normalizedContact, uid);
  }

  const $set: MongoFilter = {};
  if (email) $set.email = email;
  if (username) $set.username = username;
  if (profileImageUrl) $set.profileImageUrl = profileImageUrl;
  if (normalizedContact) $set.contactNo = normalizedContact;
  if (emailVerified === true) $set.emailVerified = true;
  if (willVerifyPhone) $set.phoneVerified = true;

  try {
    return await UserModel.findOneAndUpdate(
      { uid },
      {
        ...(Object.keys($set).length ? { $set } : {}),
        $setOnInsert: {
          uid,
          ...defaultUserInsertFields(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw codedError(
        "phone_already_linked",
        "This mobile number is already linked to another STRON account.",
      );
    }
    throw err;
  }
};

export const linkUserPhone = async ({ uid, phone }: ServiceParams) => {
  if (!uid) {
    throw codedError("unauthorized", "User ID is required.");
  }
  const contactNo = normalizeContactNo(phone != null ? String(phone) : "");
  if (!contactNo) {
    throw codedError("bad_request", "Valid phone number is required.");
  }

  await assertPhoneNotLinked(contactNo, String(uid));

  try {
    const user = await UserModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          contactNo,
          phoneVerified: true,
          isDeleted: false,
        },
      },
      { new: true },
    );

    return user;
  } catch (err) {
    if (isMongoDuplicateKeyError(err)) {
      throw codedError(
        "phone_already_linked",
        "This mobile number is already linked to another STRON account.",
      );
    }
    throw err;
  }
};

export const generateGuestUsername = (length = 6) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const suffix = Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `guest_${suffix}`;
};

export const normalizeGuestDeviceId = (value: unknown) => {
  const deviceId = String(value ?? "").trim();
  if (!deviceId || deviceId.length < 8 || deviceId.length > 160) {
    return null;
  }
  if (!/^[a-zA-Z0-9:_-]+$/.test(deviceId)) {
    return null;
  }
  return deviceId;
};

export const guestSignInService = async (body: Record<string, unknown>) => {
  const deviceId = normalizeGuestDeviceId(body?.deviceId);
  const platform = String(body?.platform ?? "")
    .trim()
    .toLowerCase();

  if (!deviceId) {
    throw codedError("bad_request", "Valid deviceId is required.");
  }
  if (platform !== "android" && platform !== "ios") {
    throw codedError("bad_request", "platform must be android or ios.");
  }

  let mongoUser = await UserModel.findOne({
    guestDeviceId: deviceId,
    isDeleted: { $ne: true },
  });

  let restored = false;

  const requestedUsername = String(body?.username ?? "").trim().slice(0, 40);
  const requestedLocation = String(body?.location ?? "").trim().slice(0, 120);

  const onboardingRole = ["individual", "business"].includes(body?.onboardingRole as string)
    ? (body.onboardingRole as "individual" | "business")
    : null;
  const onboardingBusinessName = String(body?.onboardingBusinessName ?? "").trim().slice(0, 100) || null;
  const onboardingBusinessOffers = Array.isArray(body?.onboardingBusinessOffers)
    ? body.onboardingBusinessOffers.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];
  const onboardingBusinessFeatures = Array.isArray(body?.onboardingBusinessFeatures)
    ? body.onboardingBusinessFeatures.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 20)
    : [];

  if (mongoUser?.uid) {
    restored = true;
    await ensureFirebaseUserByUid(mongoUser.uid);
    if (!mongoUser.isGuest) {
      mongoUser.isGuest = true;
      await mongoUser.save();
    }
  } else {
    const username = requestedUsername || generateGuestUsername();
    const email = `${username}@stepwars.app`;
    const firebaseUser = await admin.auth().createUser({
      displayName: username,
    });

    try {
      mongoUser = await UserModel.create({
        uid: firebaseUser.uid,
        email,
        username,
        guestDeviceId: deviceId,
        guestPlatform: platform,
        isGuest: true,
        ...(requestedLocation ? { location: requestedLocation } : {}),
        ...(onboardingRole ? { onboardingRole } : {}),
        ...(onboardingBusinessName ? { onboardingBusinessName } : {}),
        ...(onboardingBusinessOffers.length ? { onboardingBusinessOffers } : {}),
        ...(onboardingBusinessFeatures.length ? { onboardingBusinessFeatures } : {}),
        ...defaultUserInsertFields(),
      });
    } catch (createErr) {
      if (isMongoDuplicateKeyError(createErr)) {
        mongoUser = await UserModel.findOne({
          guestDeviceId: deviceId,
          isDeleted: { $ne: true },
        });
        if (!mongoUser?.uid) {
          throw createErr;
        }
        restored = true;
        await ensureFirebaseUserByUid(mongoUser.uid);
        try {
          await admin.auth().deleteUser(firebaseUser.uid);
        } catch {
          /* ignore */
        }
      } else {
        throw createErr;
      }
    }
  }

  if (requestedUsername && mongoUser.username !== requestedUsername) {
    mongoUser.username = requestedUsername;
  }
  if (requestedLocation && mongoUser.location !== requestedLocation) {
    mongoUser.location = requestedLocation;
  }
  if (onboardingRole) mongoUser.onboardingRole = onboardingRole;
  if (onboardingBusinessName) mongoUser.onboardingBusinessName = onboardingBusinessName;
  if (onboardingBusinessOffers.length) mongoUser.onboardingBusinessOffers = onboardingBusinessOffers;
  if (onboardingBusinessFeatures.length) mongoUser.onboardingBusinessFeatures = onboardingBusinessFeatures;
  await mongoUser.save();

  const guestUid = mongoUser.uid;
  if (!guestUid) {
    throw codedError("bad_request", "Guest account is missing uid.");
  }

  const customToken = await admin.auth().createCustomToken(guestUid);
  const { accessToken, refreshToken } = await issueJwtPair(
    guestUid,
    mongoUser.email ?? null,
  );

  trackEvent(ANALYTICS_EVENTS.GUEST_LOGIN, { user_id: guestUid, restored });
  trackEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, {
    user_id: guestUid,
    method: "guest",
    is_new_user: !restored,
  });

  return {
    message: restored ? "Guest session restored." : "Guest session created.",
    restored,
    token: customToken,
    accessToken,
    refreshToken,
    uid: mongoUser.uid,
    email: mongoUser.email ?? null,
    username: mongoUser.username ?? null,
    location: mongoUser.location ?? null,
    onboardingRole: mongoUser.onboardingRole ?? null,
    onboardingBusinessName: mongoUser.onboardingBusinessName ?? null,
    isGuest: true,
  };
};

export const refreshAccessTokenService = async (refreshToken: string) => {
  if (!refreshToken) {
    throw codedError("bad_request", "refreshToken is required.");
  }

  const decoded = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const storedToken = await RefreshToken.findOne({
    tokenHash,
    uid: decoded.uid,
    revoked: false,
  });

  if (!storedToken || storedToken.expiresAt < new Date()) {
    throw codedError("unauthorized", "Invalid or expired refresh token.");
  }

  const accessToken = signAccessToken({
    uid: decoded.uid,
    email: decoded.email ?? null,
  });
  const candidateRefreshToken = signRefreshToken({
    uid: decoded.uid,
    email: decoded.email ?? null,
  });

  await RefreshToken.updateOne({ _id: storedToken._id }, { revoked: true });
  await RefreshToken.updateMany(
    { uid: decoded.uid, revoked: false, _id: { $ne: storedToken._id } },
    { revoked: true },
  );

  const newRefreshToken = await persistRefreshToken(
    decoded.uid,
    candidateRefreshToken,
    { email: decoded.email ?? null },
  );

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutService = async (refreshToken?: string, userUid?: string) => {
  if (refreshToken) {
    await RefreshToken.updateOne(
      { tokenHash: hashToken(refreshToken) },
      { revoked: true },
    );
  }

  trackEvent(ANALYTICS_EVENTS.LOGGED_OUT, { user_id: userUid });
  return { message: "Logged out successfully." };
};

const rethrowOtpError = (err: unknown): never => {

  const otpErr = err instanceof Error ? (err as OtpThrown) : null;
  if (!otpErr) {
    throw codedError("internal_error", "Failed to send OTP");
  }
  const extras =
    otpErr.retryAfterSeconds != null
      ? { retryAfterSeconds: otpErr.retryAfterSeconds }
      : undefined;
  if (otpErr.code === "invalid_phone") {
    throw codedError("invalid_phone", otpErr.message, extras);
  }
  if (
    otpErr.code === "cooldown" ||
    otpErr.code === "hourly_limit" ||
    otpErr.code === "minute_limit"
  ) {
    throw codedError(otpErr.code, otpErr.message, extras);
  }
  if (otpErr.code === "not_found" || otpErr.code === "expired" || otpErr.code === "limit") {
    throw codedError(
      otpErr.code === "limit" ? "otp_limit" : otpErr.code === "expired" ? "expired" : "not_found",
      otpErr.message,
      extras,
    );
  }
  if (otpErr.code === "provider_error") {
    throw codedError("provider_error", otpErr.message, extras);
  }
  throw codedError("internal_error", otpErr.message || "Failed to send OTP");
};

export const sendOtpService = async (phone: string, client?: OtpClientContext) => {
  try {
    const result = await sendPhoneOtp(phone, { clientContext: client });
    trackEvent(ANALYTICS_EVENTS.OTP_SENT, { entry_point: "login" });
    return result;
  } catch (err) {
    rethrowOtpError(err);
  }
};

export const resendOtpService = async (phone: string, client?: OtpClientContext) => {
  try {
    const result = await resendPhoneOtp(phone, { clientContext: client });
    trackEvent(ANALYTICS_EVENTS.OTP_RESENT, { entry_point: "login" });
    return result;
  } catch (err) {
    rethrowOtpError(err);
  }
};

export const verifyOtpService = async ({
  phone,
  otp,
  existingUid,
  client,
}: {
  phone: string;
  otp: string;
  existingUid?: string | null;
  client?: OtpClientContext;
}) => {
  const verification = await verifyPhoneOtp(phone, otp, { clientContext: client });
  if (!verification.valid) {
    const statusCode =
      verification.reason === "attempts_exceeded" ||
      verification.reason === "verify_hourly_limit"
        ? "rate_limited"
        : "invalid_otp";
    trackEvent(ANALYTICS_EVENTS.OTP_VERIFIED, {
      success: false,
      entry_point: existingUid ? "organizer_gate" : "login",
    });
    throw codedError(
      statusCode,
      verification.message || "OTP verification failed.",
      {
        ...(verification.attemptsRemaining != null
          ? { attemptsRemaining: verification.attemptsRemaining }
          : {}),
        ...(verification.retryAfterSeconds != null
          ? { retryAfterSeconds: verification.retryAfterSeconds }
          : {}),
      },
    );
  }

  const phoneE164 = getPhoneE164(phone);
  if (!phoneE164) {
    throw codedError("invalid_phone", "Invalid phone number");
  }

  const contactNo = phoneE164.replace(/^\+91/, "");
  const linkedUser = await findUserByPhone(contactNo);

  if (linkedUser) {
    const linkedUid = linkedUser.uid;
    if (!linkedUid) {
      throw codedError("internal_error", "Linked account is missing uid.");
    }
    const customToken = await admin.auth().createCustomToken(linkedUid);
    const { accessToken, refreshToken } = await issueJwtPair(
      linkedUid,
      linkedUser.email ?? null,
    );
    trackEvent(ANALYTICS_EVENTS.OTP_VERIFIED, {
      user_id: linkedUid,
      success: true,
      entry_point: existingUid ? "organizer_gate" : "login",
    });
    trackEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, {
      user_id: linkedUid,
      method: "phone",
    });
    return {
      success: true,
      message: "OTP verified successfully",
      isNewUser: false,
      token: customToken,
      accessToken,
      refreshToken,
      uid: linkedUid,
      phone: contactNo,
      contactNo,
      phoneVerified: true,
      user: linkedUser,
    };
  }

  if (existingUid) {
    const user = await linkUserPhone({ uid: existingUid, phone: contactNo });
    trackEvent(ANALYTICS_EVENTS.OTP_VERIFIED, {
      user_id: existingUid,
      success: true,
      entry_point: "organizer_gate",
    });
    trackEvent(ANALYTICS_EVENTS.PHONE_LINKED, {
      user_id: existingUid,
      context: "organizer_gate",
    });
    return {
      success: true,
      message: "Phone verified successfully",
      contactNo,
      phoneVerified: true,
      uid: existingUid,
      user,
    };
  }

  const userRecord = await getOrCreateFirebaseUserByPhone(phoneE164);
  const customToken = await admin.auth().createCustomToken(userRecord.uid);
  const mongoUser = await ensureMongoUser(userRecord.uid, {
    contactNo,
    phoneVerified: true,
  });
  const { accessToken, refreshToken } = await issueJwtPair(
    userRecord.uid,
    mongoUser?.email ?? null,
  );
  trackEvent(ANALYTICS_EVENTS.OTP_VERIFIED, {
    user_id: userRecord.uid,
    success: true,
    entry_point: "login",
  });
  trackEvent(ANALYTICS_EVENTS.LOGIN_COMPLETED, {
    user_id: userRecord.uid,
    method: "phone",
  });
  return {
    success: true,
    message: "OTP verified successfully",
    isNewUser: true,
    token: customToken,
    accessToken,
    refreshToken,
    uid: userRecord.uid,
    phone: contactNo,
    contactNo,
    phoneVerified: true,
    user: mongoUser,
  };
};

export const exchangeTokenService = async ({
  firebaseToken,
  username,
  profileImageUrl,
}: {
  firebaseToken: string;
  username?: string;
  profileImageUrl?: string;
}) => {
  if (!firebaseToken) {
    throw codedError("unauthorized", "Firebase token is required.");
  }
  let decoded: { uid?: string; email?: string; phone_number?: string; email_verified?: boolean; firebase?: { sign_in_provider?: string } };
  try {
    decoded = await admin.auth().verifyIdToken(firebaseToken);
  } catch {
    throw codedError("firebase_token_invalid", "Invalid or expired Firebase token.");
  }
  const {
    uid,
    email,
    phone_number: phoneNumber,
    email_verified: emailVerified,
  } = decoded;
  const provider = decoded.firebase?.sign_in_provider ?? null;
  if (!uid) {
    throw codedError("unauthorized", "Invalid Firebase token.");
  }
  const mongoUser = await ensureMongoUser(uid, {
    email,
    username,
    profileImageUrl,
    contactNo: phoneNumber ? phoneNumber.replace(/^\+91/, "") : undefined,
    emailVerified: emailVerified === true,
    phoneVerified: phoneNumber ? true : undefined,
  });
  const resolvedEmail = email ?? mongoUser?.email ?? null;
  const { accessToken, refreshToken } = await issueJwtPair(uid, resolvedEmail);
  return {
    success: true,
    accessToken,
    refreshToken,
    uid,
    email: resolvedEmail,
    phone: phoneNumber ?? mongoUser?.contactNo ?? null,
    provider,
  };
};

export const tryGetUidFromAccessToken = (authorizationHeader?: string) => {
  try {
    const token = String(authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return null;
    const decoded = verifyAccessToken(token);
    return decoded?.uid ? String(decoded.uid) : null;
  } catch {
    return null;
  }
};

export default {
  defaultUserInsertFields,
  normalizeContactNo,
  getOrCreateFirebaseUserByPhone,
  ensureFirebaseUserByUid,
  persistRefreshToken,
  issueJwtPair,
  findUserByPhone,
  assertPhoneNotLinked,
  ensureMongoUser,
  linkUserPhone,
  generateGuestUsername,
  normalizeGuestDeviceId,
  guestSignInService,
  refreshAccessTokenService,
  logoutService,
  sendOtpService,
  resendOtpService,
  verifyOtpService,
  exchangeTokenService,
  tryGetUidFromAccessToken,
};

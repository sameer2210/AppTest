import FcmTokenModel from "../models/fcmToken.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";

/**
 * Upsert the single FCM token for a user (overwrite previous device token).
 */
export const registerUserFcmToken = async ({
  uid,
  token,
}: {
  uid: string;
  token: string;
}) => {
  const user = await UserModel.findOne({ uid }).select("_id").lean();
  if (!user) {
    throw codedError("user_not_found", "User not found.");
  }

  await FcmTokenModel.findByIdAndUpdate(
    uid,
    {
      $set: {
        user: uid,
        token,
      },
    },
    { upsert: true, new: true },
  );

  logger.info(`[FCM] Registered/Updated token for user ${uid}`);
  return { success: true as const };
};

/**
 * Clear FCM token only when it still matches the provided device token.
 */
export const unregisterUserFcmToken = async ({
  uid,
  token,
}: {
  uid: string;
  token: string;
}) => {
  await FcmTokenModel.updateOne(
    { _id: uid, token },
    { $set: { token: null } },
  );

  logger.info(`[FCM] Unregistered token for user ${uid}`);
  return { success: true as const };
};

export default {
  registerUserFcmToken,
  unregisterUserFcmToken,
};

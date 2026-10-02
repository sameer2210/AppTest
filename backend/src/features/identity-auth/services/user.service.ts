import UserModel from "../models/user.model.js";
import {
  DailyActivity as DailyActivityModel,
  archiveDaySteps,
  dayKeyInTimezone,
  MAX_DAILY_STEPS,
  sanitizeDailySteps,
} from "../../daily-reset/index.js";
import moment from "moment-timezone";
import { isUserAdmin } from "../../../config/remoteConfigService.js";
import { processUserActivityStatus } from "../../../utils/userActivityStatus.util.js";
import { onUserStepsSynced } from "../../managed-events/index.js";
import { updateUserOpinionVotesOnStepSync } from "../../opinion-hub/index.js";
import { logStepTrace } from "../../../utils/stepTraceLogger.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { RequestTraceContext, IUser } from "../types/index.js";
import {
  MAX_STEPS_PER_MINUTE,
  MIN_SYNC_INCREASE_GRACE,
  POISON_DEMOTE_STREAK,
  LOCAL_DATE_RE,
  ALLOWED_PROFILE_UPDATE_FIELDS,
} from "../../../constants/index.js";


export const maybePersistUserTimezone = async (
  uid: string,
  timezone: string,
  currentTimezone: string | undefined,
) => {
  if (!uid || !timezone || typeof timezone !== "string") return;
  const trimmed = timezone.trim();
  if (!trimmed || trimmed === currentTimezone) return;
  await UserModel.updateOne({ uid }, { $set: { timezone: trimmed } });
};

export const maxPlausibleStepIncrease = (lastActive: Date | string | null | undefined) => {
  if (!lastActive) {
    return Math.min(MAX_DAILY_STEPS, Math.max(MIN_SYNC_INCREASE_GRACE, MAX_STEPS_PER_MINUTE * 60 * 18));
  }
  const elapsedMs = Math.max(0, Date.now() - new Date(lastActive).getTime());
  const elapsedMinutes = Math.max(1, Math.ceil(elapsedMs / 60_000));
  return Math.min(
    MAX_DAILY_STEPS,
    Math.max(MIN_SYNC_INCREASE_GRACE, elapsedMinutes * MAX_STEPS_PER_MINUTE),
  );
};

export const validateClientLocalDate = (
  clientLocalDate: unknown,
  userTimezone: string,
  user: ServiceParams,
  traceContext?: RequestTraceContext,
) => {
  if (clientLocalDate == null || clientLocalDate === "") {
    return { ok: true };
  }
  if (typeof clientLocalDate !== "string" || !LOCAL_DATE_RE.test(clientLocalDate)) {
    if (traceContext) {
      logStepTrace("sync.invalid_client_local_date", {
        user,
        request: traceContext,
        clientLocalDate,
      });
    }
    return { ok: false, error: "Invalid localDate" };
  }
  const tz = userTimezone || "Asia/Kolkata";
  const serverToday = moment.tz(tz).format("YYYY-MM-DD");
  if (clientLocalDate === serverToday) {
    return { ok: true, dayKey: serverToday };
  }
  const clientMoment = moment.tz(clientLocalDate, "YYYY-MM-DD", tz);
  const serverMoment = moment.tz(serverToday, "YYYY-MM-DD", tz);
  const dayDiff = Math.abs(serverMoment.diff(clientMoment, "days"));
  if (traceContext) {
    logStepTrace("sync.client_local_date_mismatch", {
      user,
      request: traceContext,
      clientLocalDate,
      serverToday,
      dayDiff,
      timezone: tz,
    });
  }
  if (dayDiff > 1) {
    return { ok: false, error: "localDate too far from server clock" };
  }
  return { ok: true, dayKey: serverToday };
};

export const handleDailyReset = async (user: IUser | ServiceParams) => {
  const userTimezone = user.timezone || "Asia/Kolkata";
  const todayIST = moment().tz(userTimezone);
  const todayString = todayIST.format("YYYY-MM-DD");

  const lastActiveDate = user.lastActive || new Date(0);
  const lastActiveIST = moment(lastActiveDate).tz(userTimezone);
  const lastActiveString = lastActiveIST.format("YYYY-MM-DD");

  if (lastActiveString === todayString) {
    logStepTrace("lazy_reset.skipped_same_day", {
      user,
      lastActiveString,
      todayString,
      todaysStepCountBefore: user.todaysStepCount ?? 0,
    });
    return null;
  }
  const archiveDate = lastActiveIST.startOf("day").toDate();

  logger.info(`[Daily Reset] Triggered for user ${user.uid}. Archiving for ${lastActiveString}.`);
  logStepTrace("lazy_reset.triggered", {
    user,
    lastActiveString,
    todayString,
    archiveDate: archiveDate.toISOString(),
    stepsBeingArchived: user.todaysStepCount ?? 0,
  });

  try {
    if (sanitizeDailySteps(user.todaysStepCount) > 0) {
      await archiveDaySteps({
        uid: user.uid,
        archiveDate,
        stepCount: user.todaysStepCount || 0,
        context: user,
        timezone: userTimezone,
      });
    }

    const updatedUser = await UserModel.findOneAndUpdate(
      {
        uid: user.uid,
      },
      {
        $set: {
          todaysStepCount: 0,
          lastActive: new Date(),
          stepLowerStreak: 0,
        },
      },
      {
        new: true,
      },
    );

    if (!updatedUser) {
      logStepTrace("lazy_reset.error", { user, error: "findOneAndUpdate returned null" });
      return null;
    }

    logStepTrace("lazy_reset.completed", {
      user: updatedUser,
      todaysStepCountAfter: updatedUser.todaysStepCount,
    });
    await processUserActivityStatus(user.uid, 0);
    return updatedUser;
  } catch (error) {
    logger.error(`[Daily Reset] Error for ${user.uid}:`, error);
    logStepTrace("lazy_reset.error", { user, error: (error as Error).message });
    return null;
  }
};

export const getUserProfileService = async ({
  uid,
  traceContext,
}: {
  uid: string;
  traceContext?: RequestTraceContext;
}) => {
  if (!uid) throw codedError("bad_request", "User UID is required.");

  let user = await UserModel.findOne({ uid });
  if (!user) throw codedError("not_found", "User not found.");
  if (user.isDeleted) {
    throw codedError("forbidden", "This account has been deleted.");
  }

  const resetUser = await handleDailyReset(user as unknown as ServiceParams);
  if (resetUser) {
    user = resetUser;
  }

  if (traceContext) {
    logStepTrace("read.user_profile", {
      user,
      request: traceContext,
      todaysStepCountServed: user.todaysStepCount ?? 0,
      resetTriggeredThisRequest: Boolean(resetUser),
    });
  }

  let requiresBackfillSave = false;
  const backfillDefaults: Record<string, null> = {
    address: null,
    receiverName: null,
    addressLine1: null,
    city: null,
    state: null,
    pinCode: null,
    location: null,
    shortBio: null,
  };

  for (const [key, defVal] of Object.entries(backfillDefaults)) {
    if (typeof (user as unknown as Record<string, unknown>)[key] === "undefined") {
      (user as unknown as Record<string, unknown>)[key] = defVal;
      requiresBackfillSave = true;
    }
  }

  if (requiresBackfillSave) {
    await user.save();
  }

  return user;
};

export const updateUserProfileService = async ({
  uid,
  rawUpdateData,
}: {
  uid: string;
  rawUpdateData: Record<string, unknown>;
}) => {
  if (!uid) throw codedError("bad_request", "User UID is required.");

  const filteredUpdateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawUpdateData || {})) {
    if (ALLOWED_PROFILE_UPDATE_FIELDS.has(key)) {
      filteredUpdateData[key] = value;
    }
  }

  const updatedUser = await UserModel.findOneAndUpdate(
    { uid, isDeleted: { $ne: true } },
    { $set: filteredUpdateData },
    { new: true },
  );

  if (!updatedUser) throw codedError("not_found", "User not found.");

  let requiresBackfillSave = false;
  const backfillDefaults: Record<string, null> = {
    address: null,
    receiverName: null,
    addressLine1: null,
    city: null,
    state: null,
    pinCode: null,
    location: null,
    shortBio: null,
    about: null,
  };

  for (const [key, defVal] of Object.entries(backfillDefaults)) {
    if (typeof (updatedUser as unknown as Record<string, unknown>)[key] === "undefined") {
      (updatedUser as unknown as Record<string, unknown>)[key] = defVal;
      requiresBackfillSave = true;
    }
  }

  if (requiresBackfillSave) {
    await updatedUser.save();
  }

  trackEvent(ANALYTICS_EVENTS.PROFILE_UPDATED, {
    user_id: uid,
    fields_changed: Object.keys(filteredUpdateData),
  });

  return updatedUser;
};

export const syncUserStepsService = async ({
  uid,
  todaysStepCount,
  localDate,
  utcTimestamp,
  timezone,
  source,
  traceContext,
}: {
  uid: string;
  todaysStepCount: number;
  localDate?: string;
  utcTimestamp?: unknown;
  timezone?: string;
  source?: string;
  traceContext?: RequestTraceContext;
}) => {
  if (!uid) {
    throw codedError("unauthorized", "Authentication required.");
  }
  if (todaysStepCount === undefined) {
    throw codedError("bad_request", "Missing data");
  }

  let user = await UserModel.findOne({ uid });
  if (!user) {
    if (traceContext) {
      logStepTrace("sync.user_not_found", {
        user: { uid },
        request: traceContext,
        todaysStepCount,
      });
    }
    throw codedError("not_found", "User not found");
  }

  const userTimezone = user.timezone || timezone || "Asia/Kolkata";
  await maybePersistUserTimezone(uid, timezone || "", user.timezone);
  if (timezone && timezone !== user.timezone) {
    user.timezone = timezone;
  }
  const dateCheck = validateClientLocalDate(localDate, userTimezone, user as unknown as ServiceParams, traceContext);
  if (!dateCheck.ok) {
    throw codedError("bad_request", dateCheck.error || "Invalid date");
  }

  if (traceContext) {
    logStepTrace("sync.received", {
      user,
      request: traceContext,
      incomingRaw: todaysStepCount,
      todaysStepCountBefore: user.todaysStepCount ?? 0,
      lastActiveBefore: user.lastActive,
      clientLocalDate: localDate ?? null,
      clientUtcTimestamp: utcTimestamp ?? null,
      clientTimezone: timezone ?? null,
      clientSource: source ?? null,
    });
  }

  const resetUser = await handleDailyReset(user as unknown as ServiceParams);
  if (resetUser) {
    user = resetUser;
  }

  let incoming = sanitizeDailySteps(todaysStepCount);
  let previous = sanitizeDailySteps(user.todaysStepCount);

  const rawIncoming = Math.max(0, Math.floor(Number(todaysStepCount) || 0));
  if (rawIncoming > MAX_DAILY_STEPS) {
    if (traceContext) {
      logStepTrace("sync.capped_implausible", {
        user,
        request: traceContext,
        rawIncoming,
        cappedTo: incoming,
      });
    }
  }

  let resolved = Math.max(previous, incoming);
  let wasRatchetedUp = resolved > incoming;
  let demotedPoison = false;
  let nextLowerStreak = 0;
  const increase = incoming - previous;

  if (increase > 0) {
    const lastActiveForBound = resetUser ? null : user.lastActive;
    const maxIncrease = maxPlausibleStepIncrease(lastActiveForBound);
    if (increase > maxIncrease) {
      const clamped = sanitizeDailySteps(previous + maxIncrease);
      if (traceContext) {
        logStepTrace("sync.rejected_implausible_jump", {
          user,
          request: traceContext,
          previous,
          incoming,
          increase,
          maxIncrease,
          clampedTo: clamped,
          lastActiveBefore: user.lastActive ?? null,
          resetTriggeredThisRequest: Boolean(resetUser),
          clientSource: source ?? null,
        });
      }
      resolved = Math.max(previous, clamped);
      wasRatchetedUp = resolved > incoming;
    }
    nextLowerStreak = 0;
  } else if (incoming < previous) {
    const drop = previous - incoming;
    nextLowerStreak = (user.stepLowerStreak || 0) + 1;
    const trustedHcReconcile = source === "health_connect_reconcile";
    if (
      trustedHcReconcile ||
      (nextLowerStreak >= POISON_DEMOTE_STREAK && drop >= MIN_SYNC_INCREASE_GRACE) ||
      (previous > 20000 && incoming < 15000)
    ) {
      resolved = incoming;
      wasRatchetedUp = false;
      demotedPoison = true;
      nextLowerStreak = 0;
      if (traceContext) {
        logStepTrace("sync.poison_demoted", {
          user,
          request: traceContext,
          previous,
          incoming,
          drop,
          streakRequired: POISON_DEMOTE_STREAK,
          trustedHcReconcile,
          clientSource: source ?? null,
        });
      }
    } else {
      resolved = previous;
      wasRatchetedUp = true;
    }
  } else {
    nextLowerStreak = 0;
  }

  const now = new Date();
  let updated;
  if (demotedPoison) {
    updated = await UserModel.findOneAndUpdate(
      { uid, todaysStepCount: previous },
      {
        $set: {
          todaysStepCount: resolved,
          lastActive: now,
          stepLowerStreak: nextLowerStreak,
        },
      },
      { new: true },
    );
    if (!updated) {
      updated = await UserModel.findOne({ uid });
    }
  } else if (resolved > previous) {
    updated = await UserModel.findOneAndUpdate(
      { uid },
      [
        {
          $set: {
            todaysStepCount: {
              $max: [{ $ifNull: ["$todaysStepCount", 0] }, resolved],
            },
            lastActive: now,
            stepLowerStreak: 0,
          },
        },
      ],
      { new: true },
    );
  } else {
    updated = await UserModel.findOneAndUpdate(
      { uid },
      {
        $set: {
          lastActive: now,
          stepLowerStreak: nextLowerStreak,
        },
      },
      { new: true },
    );
  }

  if (!updated) {
    throw codedError("not_found", "User not found");
  }
  user = updated;
  const finalResolved = sanitizeDailySteps(user.todaysStepCount);

  if (traceContext) {
    logStepTrace("sync.resolved", {
      user,
      request: traceContext,
      previous,
      incoming,
      resolved: finalResolved,
      discardedLowerIncoming: wasRatchetedUp && !demotedPoison,
      demotedPoison,
      stepLowerStreak: user.stepLowerStreak ?? 0,
      resetTriggeredThisRequest: Boolean(resetUser),
    });
  }

  await processUserActivityStatus(uid, finalResolved);
  await onUserStepsSynced({ uid, todaysStepCount: finalResolved });
  await updateUserOpinionVotesOnStepSync(uid, finalResolved);

  const dayKey =
    dateCheck.dayKey ||
    dayKeyInTimezone(now, user.timezone || userTimezone);

  return { user, dayKey };
};

export const getActivityHistoryService = async ({
  uid,
  traceContext,
}: {
  uid: string;
  traceContext?: RequestTraceContext;
}) => {
  const [doc, user] = await Promise.all([
    DailyActivityModel.findOne({ uid }),
    UserModel.findOne({ uid }).select("timezone").lean(),
  ]);
  const history: Array<{ date: Date; stepCount: number }> = doc
    ? Array.from(doc.history || [])
    : [];
  const tz = user?.timezone || "Asia/Kolkata";
  const normalized = history.map((h) => ({
    date: h.date,
    dateKey: h?.date ? dayKeyInTimezone(h.date, tz) : undefined,
    stepCount: h.stepCount,
  }));
  if (traceContext) {
    logStepTrace("read.activity_history", {
      user: { uid },
      request: traceContext,
      entryCount: history.length,
      recentEntries: normalized.slice(0, 3).map((h) => ({
        dateKey: h.dateKey,
        stepCount: h.stepCount,
      })),
    });
  }
  return normalized;
};

export const getLifetimeStatsService = async ({ uid }: { uid: string }) => {
  const doc = await DailyActivityModel.findOne({ uid });
  const stats = doc?.lifetime || { totalSteps: 0 };
  return { _id: null, totalSteps: stats.totalSteps };
};

export const syncPastStepsService = async ({
  uid,
  date,
  steps,
  timezone: bodyTimezone,
  source,
  traceContext,
}: {
  uid: string;
  date: string;
  steps: number;
  timezone?: string;
  source?: string;
  traceContext?: RequestTraceContext;
}) => {
  if (!uid) {
    throw codedError("unauthorized", "Authentication required.");
  }
  if (!date || steps === undefined) {
    throw codedError("bad_request", "Date and steps are required.");
  }
  if (typeof date !== "string" || !LOCAL_DATE_RE.test(date)) {
    throw codedError("bad_request", "Invalid date format (YYYY-MM-DD).");
  }

  const user = await UserModel.findOne({ uid });
  if (!user) {
    throw codedError("not_found", "User not found");
  }
  const userTimezone = user.timezone || bodyTimezone || "Asia/Kolkata";
  await maybePersistUserTimezone(uid, bodyTimezone || "", user.timezone);
  if (bodyTimezone && bodyTimezone !== user.timezone) {
    user.timezone = bodyTimezone;
  }
  const todayKey = moment.tz(userTimezone).format("YYYY-MM-DD");
  const safeSteps = sanitizeDailySteps(steps);

  if (date >= todayKey) {
    if (traceContext) {
      logStepTrace("sync_past.rejected_not_past", {
        user,
        request: traceContext,
        date,
        todayKey,
        steps: safeSteps,
        clientSource: source ?? null,
      });
    }
    throw codedError("bad_request", "Past sync date must be before today.");
  }

  const dayDiff = moment
    .tz(todayKey, "YYYY-MM-DD", userTimezone)
    .diff(moment.tz(date, "YYYY-MM-DD", userTimezone), "days");
  if (dayDiff > 400) {
    if (traceContext) {
      logStepTrace("sync_past.rejected_too_old", {
        user,
        request: traceContext,
        date,
        dayDiff,
        steps: safeSteps,
      });
    }
    throw codedError("bad_request", "Date is too far in the past.");
  }

  const archiveDate = moment
    .tz(date, "YYYY-MM-DD", userTimezone)
    .startOf("day")
    .toDate();

  if (traceContext) {
    logStepTrace("sync_past.received", {
      user,
      request: traceContext,
      date,
      steps: safeSteps,
      rawSteps: steps,
      targetDateUTC: archiveDate.toISOString(),
      clientSource: source ?? null,
    });
  }

  const result = await archiveDaySteps({
    uid,
    archiveDate,
    stepCount: safeSteps,
    context: user as unknown as ServiceParams,
    timezone: userTimezone,
  });

  if (traceContext) {
    logStepTrace("sync_past.resolved", {
      user,
      request: traceContext,
      date,
      steps: safeSteps,
      inserted: result.inserted,
      updated: result.updated,
      storedSteps: result.stepCount,
    });
  }

  return result;
};

export const deleteAccountService = async ({
  uid,
  requesterUid,
}: {
  uid: string;
  requesterUid: string;
}) => {
  if (!uid) throw codedError("bad_request", "User UID is required.");
  if (!requesterUid) throw codedError("unauthorized", "Authentication required.");
  if (requesterUid !== uid) {
    throw codedError("forbidden", "You can only delete your own account.");
  }

  const user = await UserModel.findOne({ uid });
  if (!user) throw codedError("not_found", "User not found.");

  if (user.isDeleted) {
    return { alreadyDeleted: true };
  }

  const now = new Date();
  await UserModel.updateOne(
    { uid },
    {
      $set: {
        isDeleted: true,
        deletedAt: now,
      },
    },
  );

  trackEvent(ANALYTICS_EVENTS.ACCOUNT_DELETED, { user_id: uid });
  return { alreadyDeleted: false };
};

export const checkIsAdminService = async ({ uid }: { uid: string }) => {
  if (!uid) throw codedError("bad_request", "User UID is required.");
  const user = await UserModel.findOne({ uid });
  if (!user) return { isAdmin: false };
  const isAdmin = isUserAdmin(user.email);
  return { isAdmin };
};

export default {
  handleDailyReset,
  getUserProfileService,
  updateUserProfileService,
  syncUserStepsService,
  getActivityHistoryService,
  getLifetimeStatsService,
  syncPastStepsService,
  deleteAccountService,
  checkIsAdminService,
};

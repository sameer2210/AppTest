import moment from "moment-timezone";
import { UserModel } from "../../identity-auth/index.js";
import DailyActivityModel from "../models/dailyActivity.model.js";
import { processUserActivityStatus } from "../../../utils/userActivityStatus.util.js";
import { runStronDailySettle } from "../../managed-events/index.js";
import { logStepTrace } from "../../../utils/stepTraceLogger.util.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import { logger } from "../../../utils/logger.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import {
  MAX_DAILY_STEPS,
  sanitizeDailySteps,
  dayKeyInTimezone,
} from "../../../utils/dailyReset.util.js";

import type {
  IDailyHistoryEntry,
  ArchiveDayStepsParams,
  ArchiveDayStepsResult,
} from "../types/index.js";

export { MAX_DAILY_STEPS, sanitizeDailySteps, dayKeyInTimezone };

/**
 * Idempotent archive for one calendar day.
 * Upserts history by timezone day key; only $inc lifetime for the delta when raising an existing entry.
 */
export const archiveDaySteps = async ({
  uid,
  archiveDate,
  stepCount,
  context,
  timezone = "Asia/Kolkata",
}: ArchiveDayStepsParams): Promise<ArchiveDayStepsResult> => {
  const steps = sanitizeDailySteps(stepCount);
  const tz = timezone || "Asia/Kolkata";
  const archiveKey = dayKeyInTimezone(archiveDate, tz);
  const traceUser = (context ?? { uid }) as ServiceParams;

  const doc = await DailyActivityModel.findOne({ uid }).lean();
  const history: IDailyHistoryEntry[] = Array.isArray(doc?.history) ? [...doc.history] : [];
  const existing = history.find(
    (entry) => entry?.date && dayKeyInTimezone(entry.date, tz) === archiveKey,
  );

  if (existing) {
    const prev = sanitizeDailySteps(existing.stepCount);
    if (steps <= prev) {
      logStepTrace("archive.skipped_not_higher", {
        user: traceUser,
        archiveKey,
        incomingSteps: steps,
        existingSteps: prev,
        timezone: tz,
      });
      return { inserted: false, updated: false, stepCount: prev, archiveKey };
    }
    const delta = steps - prev;
    await DailyActivityModel.updateOne(
      { uid, "history.date": existing.date },
      {
        $set: { "history.$.stepCount": steps },
        $inc: { "lifetime.totalSteps": delta },
      },
    );
    logStepTrace("archive.updated_existing_day", {
      user: traceUser,
      archiveKey,
      previousSteps: prev,
      newSteps: steps,
      lifetimeDelta: delta,
      timezone: tz,
    });
    return { inserted: false, updated: true, stepCount: steps, archiveKey };
  }

  if (steps <= 0) {
    // No lifetime bump for empty days; avoid noisy zero rows from cron.
    return { inserted: false, updated: false, stepCount: 0, archiveKey };
  }

  await DailyActivityModel.findOneAndUpdate(
    { uid },
    {
      $push: {
        history: {
          $each: [{ date: archiveDate, stepCount: steps }],
          $position: 0,
          $slice: 365,
        },
      },
      $inc: { "lifetime.totalSteps": steps },
    },
    { upsert: true },
  );
  logStepTrace("archive.inserted_new_day", {
    user: traceUser,
    archiveKey,
    steps,
    timezone: tz,
  });
  return { inserted: true, updated: false, stepCount: steps, archiveKey };
};

export const runDailyReset = async () => {
  logger.info("--- [CRON JOB] Starting Lifetime + Minimal History Reset ---");

  const istYesterdayKey = moment
    .tz("Asia/Kolkata")
    .subtract(1, "day")
    .format("YYYY-MM-DD");
  const allUsers = await UserModel.find({});

  logStepTrace("cron_reset.started", {
    user: null,
    totalUsers: allUsers.length,
    istYesterdayKey,
  });

  if (allUsers.length === 0) return;

  const usersToReset = [];
  const usersForIstSettle = [];

  for (const user of allUsers) {
    if (!user.uid) {
      continue;
    }

    const userTimezone = user.timezone || "Asia/Kolkata";
    const todayKey = moment.tz(userTimezone).format("YYYY-MM-DD");
    const lastActiveKey = user.lastActive
      ? dayKeyInTimezone(user.lastActive, userTimezone)
      : null;

    // Same rules as lazy reset: never archive mid-local-day.
    if (lastActiveKey === todayKey) {
      continue;
    }

    if (user.timezone && user.timezone !== "Asia/Kolkata") {
      logStepTrace("cron_reset.user_tz_archive", {
        user,
        lastActiveKey,
        todayKey,
        userTimezone,
      });
    }

    // Archive onto the user's last-active calendar day (not always "yesterday IST").
    const archiveDate = lastActiveKey
      ? moment.tz(lastActiveKey, "YYYY-MM-DD", userTimezone).startOf("day").toDate()
      : moment.tz(userTimezone).subtract(1, "day").startOf("day").toDate();

    usersToReset.push(user);
    await archiveDaySteps({
      uid: user.uid,
      archiveDate,
      stepCount: user.todaysStepCount ?? 0,
      context: user,
      timezone: userTimezone,
    });

    const archiveKey = dayKeyInTimezone(archiveDate, userTimezone);
    if (archiveKey === istYesterdayKey) {
      usersForIstSettle.push(user);
    }
  }

  await Promise.all(
    usersToReset
      .filter((user): user is (typeof user & { uid: string }) => typeof user.uid === "string")
      .map((user) => processUserActivityStatus(user.uid, 0)),
  );

  try {
    // Face-Off / KotH settle stays on IST yesterday; only include users archived for that day.
    const settleUsers = usersForIstSettle.filter(
      (user): user is (typeof user & { uid: string }) => typeof user.uid === "string",
    );
    await runStronDailySettle({
      users: settleUsers.length
        ? settleUsers.map((user) => ({
            uid: user.uid,
            todaysStepCount: user.todaysStepCount ?? 0,
          }))
        : [],
      settleDayKey: istYesterdayKey,
    });
  } catch (error) {
    logger.warn("[stronManaged] daily settle failed:", getErrorMessage(error));
  }

  if (usersToReset.length > 0) {
    const uids = usersToReset.map((u) => u.uid);
    await UserModel.updateMany(
      { uid: { $in: uids } },
      {
        $set: {
          todaysStepCount: 0,
          lastActive: new Date(),
          stepLowerStreak: 0,
        },
      },
    );
  }

  logger.info(
    `--- [CRON JOB] Finished processing ${usersToReset.length}/${allUsers.length} users ---`,
  );
  logStepTrace("cron_reset.finished", {
    user: null,
    usersReset: usersToReset.length,
    totalUsers: allUsers.length,
    istSettleUsers: usersForIstSettle.length,
  });
};

export default {
  archiveDaySteps,
  runDailyReset,
  sanitizeDailySteps,
  dayKeyInTimezone,
  MAX_DAILY_STEPS,
};

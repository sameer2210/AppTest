import { Platform } from "react-native";
import type { StepRace } from "@/models/stepRace";
import { getExpoNotifications } from "../../provider/expoNotificationsLazy";
import { getStepForegroundService } from "../../provider/stepForegroundServiceLazy";
import {
  computeLiveStepRaceStatus,
  resolveRaceTargetSteps,
  type LiveStepRaceStatus,
} from "./stepRace.live";
import { cacheRemoteImageToFile, clearRaceNotificationAvatarCache } from "./notificationImageCache";
import { getR2AssetUrl } from "@/utils/r2Assets";
import { getDeterministicBitmoji } from "@/utils/profileImage.utils";

export const STEP_RACE_LIVE_NOTIFICATION_ID = "stron-step-race-live";
export const STEP_RACE_LIVE_CHANNEL_ID = "stron-step-race-live";
export const STEP_RACE_DEEP_LINK = "stron://ongoing-step-race";

let channelReady = false;
let lastPayloadKey: string | null = null;
let lastScheduledTime = 0;
let lastScheduledRaceId: string | null = null;
let lastScheduledUserSteps = -1;
/** -1 opponent lead, 0 tied, 1 user lead */
let lastLeadSign: number | null = null;
let lastLeadBucket = -1;
let syncInFlight: Promise<void> | null = null;

/** Android FGS shade can update often; iOS schedules a new local banner each time. */
const MIN_ANDROID_INTERVAL_MS = 10_000;
const MIN_IOS_INTERVAL_MS = 60_000;
/** iOS: only treat lead as "changed enough" in these step buckets */
const IOS_LEAD_BUCKET_STEPS = 25;

const fmt = (n: number) => n.toLocaleString("en-US");

const leadSignOf = (live: LiveStepRaceStatus): number => {
  if (live.leadDiff === 0) return 0;
  return live.isLeading ? 1 : -1;
};

const leadBucketOf = (leadDiff: number): number =>
  Math.floor(Math.abs(leadDiff) / IOS_LEAD_BUCKET_STEPS);

/** Resolve http URL or bitmoji key (bt1..bt12) to a downloadable image URL. */
const resolveAvatarDownloadUrl = (value?: string | null): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^bt\d{1,2}$/i.test(trimmed)) {
    return getR2AssetUrl(`bitmoji/${trimmed.toLowerCase()}.webp`);
  }
  return null;
};

/**
 * Match in-app getProfileImageSource: http / bt key / deterministic bitmoji from uid.
 * Always returns a URL when possible so the shade never falls back to the silhouette placeholder.
 */
const resolveUserAvatarDownloadUrl = (
  value?: string | null,
  uid?: string | null,
): string | null => {
  const direct = resolveAvatarDownloadUrl(value);
  if (direct) return direct;
  const key = getDeterministicBitmoji(uid || undefined);
  return getR2AssetUrl(`bitmoji/${key}.webp`);
};

const raceTitleFor = (live: LiveStepRaceStatus) => {
  if (live.targetSteps === 1000) return "1K STEPS RACE";
  return `${fmt(live.targetSteps)} STEPS RACE`;
};

const buildRaceUi = (live: LiveStepRaceStatus) => {
  const leadLabel = live.leadDiff === 0 ? "TIED" : live.isLeading ? "YOUR LEAD" : "OPPONENT LEAD";
  const leadDiff =
    live.leadDiff === 0
      ? "0"
      : live.isLeading
        ? `+${fmt(Math.abs(live.leadDiff))}`
        : `-${fmt(Math.abs(live.leadDiff))}`;
  const statusLine = live.isLeading
    ? live.leadDiff === 0
      ? "It's neck and neck!"
      : "You're ahead right now!"
    : "You're trailing right now!";
  const userPct = Math.max(
    0,
    Math.min(100, Math.round((live.userSteps / Math.max(1, live.targetSteps)) * 100)),
  );
  const oppPct = Math.max(
    0,
    Math.min(100, Math.round((live.opponentSteps / Math.max(1, live.targetSteps)) * 100)),
  );

  return {
    raceTitle: raceTitleFor(live),
    leadLabel,
    leadDiff,
    isLeading: live.isLeading,
    statusLine,
    userStepsLabel: `${fmt(live.userSteps)} steps`,
    opponentName: live.opponentName,
    opponentStepsLabel: `${fmt(live.opponentSteps)} steps`,
    youLine: `You · ${fmt(live.userSteps)}`,
    oppLine: `${live.opponentName.split(" ")[0] || "Opp"} · ${fmt(live.opponentSteps)}`,
    userProgress: userPct,
    oppProgress: oppPct,
    goalLabel: `${fmt(live.targetSteps)} step goal`,
    userStepsValue: fmt(live.userSteps),
    oppStepsValue: fmt(live.opponentSteps),
    // Lead stays in subtitle only — avoid "OPPONENT LEAD" twice on iOS banners
    iosBody:
      `${statusLine}\n` +
      `You ${fmt(live.userSteps)}   VS   ${live.opponentName} ${fmt(live.opponentSteps)}`,
  };
};

const ensureRaceChannel = async () => {
  if (channelReady || Platform.OS !== "android") return;
  const notifications = getExpoNotifications();
  if (!notifications?.setNotificationChannelAsync) return;
  await notifications.setNotificationChannelAsync(STEP_RACE_LIVE_CHANNEL_ID, {
    name: "Step Race Live",
    description: "Live Step Race lead and progress",
    importance: notifications.AndroidImportance.LOW,
    enableVibrate: false,
    showBadge: false,
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    sound: undefined,
  });
  channelReady = true;
};

const hasPermission = async (): Promise<boolean> => {
  const notifications = getExpoNotifications();
  if (!notifications) return false;
  try {
    const { status } = await notifications.getPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
};

const buildPayloadKey = (
  raceId: string,
  live: LiveStepRaceStatus,
  youPath: string | null,
  oppPath: string | null,
): string => {
  if (Platform.OS === "ios") {
    // Coarse key: ignore second-by-second opponent clock drift
    return JSON.stringify({
      raceId,
      sign: leadSignOf(live),
      bucket: leadBucketOf(live.leadDiff),
      userBucket: Math.floor(live.userSteps / 20),
      youPath,
      oppPath,
    });
  }
  return JSON.stringify({
    raceId,
    lead: live.leadDiff,
    user: live.userSteps,
    opp: live.opponentSteps,
    leading: live.isLeading,
    youPath,
    oppPath,
  });
};

const shouldSkipForThrottle = (
  race: StepRace,
  live: LiveStepRaceStatus,
  now: number,
): boolean => {
  const isNewRace = lastScheduledRaceId !== race.raceId;
  const isFinished = live.userSteps >= live.targetSteps;
  if (isNewRace || isFinished) return false;

  const timeSinceLast = now - lastScheduledTime;
  const stepDelta = Math.abs(live.userSteps - lastScheduledUserSteps);
  const sign = leadSignOf(live);
  const leadFlipped = lastLeadSign !== null && sign !== lastLeadSign;

  if (Platform.OS === "ios") {
    // Never bypass iOS cooldown on small step deltas — each schedule is a new banner.
    if (leadFlipped) return false;
    if (timeSinceLast < MIN_IOS_INTERVAL_MS) return true;
    // After cooldown, skip if lead/user progress hasn't moved enough
    if (
      lastLeadBucket >= 0 &&
      leadBucketOf(live.leadDiff) === lastLeadBucket &&
      stepDelta < 20
    ) {
      return true;
    }
    return false;
  }

  // Android: FGS update — allow sooner on meaningful user step progress
  if (timeSinceLast < MIN_ANDROID_INTERVAL_MS && stepDelta < 20 && !leadFlipped) {
    return true;
  }
  return false;
};

const claimThrottle = (race: StepRace, live: LiveStepRaceStatus, now: number) => {
  lastScheduledTime = now;
  lastScheduledRaceId = race.raceId;
  lastScheduledUserSteps = live.userSteps;
  lastLeadSign = leadSignOf(live);
  lastLeadBucket = leadBucketOf(live.leadDiff);
};

export const syncStepRaceLiveNotification = async ({
  race,
  todaySteps,
  userAvatarUrl,
  userUid,
}: {
  race: StepRace | null | undefined;
  todaySteps: number;
  userAvatarUrl?: string | null;
  /** Used when profileImageUrl is empty — same deterministic bitmoji as the race screen. */
  userUid?: string | null;
}) => {
  if (!race || race.status !== "active") {
    await clearStepRaceLiveNotification();
    return;
  }

  void resolveRaceTargetSteps(race);
  const live = computeLiveStepRaceStatus(race, todaySteps);
  const now = Date.now();

  if (shouldSkipForThrottle(race, live, now)) {
    return;
  }

  // Collapse concurrent callers (Home poll + Ongoing timer + pedometer) into one schedule.
  if (syncInFlight) {
    await syncInFlight;
    return;
  }

  // Claim before any await so parallel callers hit the throttle.
  claimThrottle(race, live, now);

  const run = async () => {
    const ui = buildRaceUi(live);

    const [youPath, oppPath] = await Promise.all([
      cacheRemoteImageToFile(
        resolveUserAvatarDownloadUrl(userAvatarUrl, userUid),
        `race-${race.raceId}-you`,
      ),
      cacheRemoteImageToFile(
        resolveAvatarDownloadUrl(race.opponent?.profileImageUrl),
        `race-${race.raceId}-opp`,
      ),
    ]);

    // Persist computational state for native FGS race updates when JS is dead
    if (Platform.OS === "android") {
      const svc = getStepForegroundService();
      const startMs = race.startTime ? new Date(race.startTime).getTime() : Date.now();
      // Prefer immutable race.startSteps — never re-infer when already set.
      const baseline =
        race.startSteps !== undefined && race.startSteps > 0
          ? race.startSteps
          : Math.max(0, todaySteps - (race.userSteps || 0));
      await svc
        ?.persistActiveRaceState?.({
          raceId: race.raceId,
          startSteps: baseline,
          targetSteps: live.targetSteps,
          opponentPaceSeconds:
            race.opponentPaceSeconds || race.opponent?.shadowData?.bestPaceSeconds || 600,
          startTimeMs: startMs,
          opponentName: live.opponentName,
          youAvatarPath: youPath || "",
          oppAvatarPath: oppPath || "",
        })
        .catch(() => undefined);
    }

    const payloadKey = buildPayloadKey(race.raceId, live, youPath, oppPath);
    if (payloadKey === lastPayloadKey) return;
    lastPayloadKey = payloadKey;

    if (Platform.OS === "android") {
      const svc = getStepForegroundService();
      if (svc?.updateRaceLiveNotification) {
        await svc
          .updateRaceLiveNotification({
            raceTitle: ui.raceTitle,
            leadLabel: ui.leadLabel,
            leadDiff: ui.leadDiff,
            isLeading: ui.isLeading ? "1" : "0",
            statusLine: ui.statusLine,
            userStepsLabel: ui.userStepsLabel,
            opponentName: ui.opponentName,
            opponentStepsLabel: ui.opponentStepsLabel,
            youLine: ui.youLine,
            oppLine: ui.oppLine,
            userProgress: ui.userProgress,
            oppProgress: ui.oppProgress,
            youAvatarPath: youPath || "",
            oppAvatarPath: oppPath || "",
            goalLabel: ui.goalLabel,
            userStepsValue: ui.userStepsValue,
            oppStepsValue: ui.oppStepsValue,
          })
          .catch(() => undefined);
        return;
      }
    }

    const notifications = getExpoNotifications();
    if (!notifications) return;
    if (!(await hasPermission())) return;
    await ensureRaceChannel();

    await notifications.scheduleNotificationAsync({
      identifier: STEP_RACE_LIVE_NOTIFICATION_ID,
      content: {
        title: ui.raceTitle,
        body: ui.iosBody,
        subtitle: `${ui.leadLabel} ${ui.leadDiff}`,
        sound: false,
        color: ui.isLeading ? "#2DE441" : "#FF5C5C",
        sticky: true,
        autoDismiss: false,
      data: {
        key: "step_race_live",
        deepLink: STEP_RACE_DEEP_LINK,
        raceId: race.raceId,
        type: "notification_delivery_tracking",
        _local: "1",
      },
        ...(Platform.OS === "android"
          ? {
              channelId: STEP_RACE_LIVE_CHANNEL_ID,
              priority: notifications.AndroidNotificationPriority.LOW,
            }
          : { interruptionLevel: "passive" as const }),
      },
      trigger: null,
    });
  };

  syncInFlight = run().finally(() => {
    syncInFlight = null;
  });
  await syncInFlight;
};

export const clearStepRaceLiveNotification = async () => {
  lastPayloadKey = null;
  lastScheduledTime = 0;
  lastScheduledRaceId = null;
  lastScheduledUserSteps = -1;
  lastLeadSign = null;
  lastLeadBucket = -1;
  syncInFlight = null;
  await clearRaceNotificationAvatarCache().catch(() => undefined);
  if (Platform.OS === "android") {
    const svc = getStepForegroundService();
    if (svc?.clearRaceLiveNotification) {
      await svc.clearRaceLiveNotification().catch(() => undefined);
    }
    await svc?.clearActiveRaceState?.().catch(() => undefined);
  }
  const notifications = getExpoNotifications();
  if (!notifications) return;
  await notifications
    .dismissNotificationAsync(STEP_RACE_LIVE_NOTIFICATION_ID)
    .catch(() => undefined);
};

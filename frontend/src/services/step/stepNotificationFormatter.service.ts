import type {
  StepNotificationCase,
  StepNotificationContent,
  StepNotificationContext,
  StepNotificationPayload,
} from "@/models/stepNotification.types";

/** Parity: StepNotificationFormatter in lib/services/step_notification_formatter.dart */
export const DISTANCE_KM_PER_STEP = 0.00075;
export const CALORIES_PER_STEP = 0.04;

const formatSteps = (steps: number) => steps.toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatCalories = (steps: number) =>
  estimateCalories(steps).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const estimateCalories = (steps: number) => Math.round(steps * CALORIES_PER_STEP);

export const estimateDistanceKm = (steps: number) => steps * DISTANCE_KM_PER_STEP;

export const formatKm = (km: number) => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

/** Android idle pane secondary copy (notification_stron_idle.xml). */
export const IDLE_GOAL_SUBTITLE = "Keep moving towards your daily goal";

/**
 * iOS banner fields mapped to Android custom idle/event pane hierarchy:
 * title → right title, subtitle → STEPS TODAY + count, body → goal / event line.
 * (No Live Activity / WidgetKit — system banner only.)
 */
export const toIosBannerContent = (content: StepNotificationContent) => {
  const formattedSteps = formatSteps(content.steps);
  return {
    title: content.notificationCase === "idle" ? "STRON Tracker" : content.title,
    subtitle: `STEPS TODAY · ${formattedSteps}`,
    body: content.text || IDLE_GOAL_SUBTITLE,
  };
};

const mvpGap = (steps: number, highestOtherMemberSteps?: number) => {
  const highestOther = highestOtherMemberSteps ?? 0;
  if (steps > highestOther) return 0;
  return highestOther + 1 - steps;
};

export const ctaLabelForCase = (notificationCase: StepNotificationCase): string | null => {
  switch (notificationCase) {
    case "marathonLive":
      return "KEEP GOING";
    case "squadBattleComplete":
      return "VIEW RESULTS";
    case "marathonFinished":
      return "VIEW REWARDS";
    case "battleLive":
      return "PUSH HARDER";
    default:
      return null;
  }
};

export const eventEmojiForCase = (notificationCase: StepNotificationCase): string => {
  switch (notificationCase) {
    case "marathonLive":
      return "🏃";
    case "squadBattleComplete":
      return "🏆";
    case "marathonFinished":
      return "🚩";
    case "battleLive":
      return "⚔️";
    default:
      return "👣";
  }
};

export const buildStepNotificationContent = (
  steps: number,
  context: StepNotificationContext,
): StepNotificationContent => {
  switch (context.notificationCase) {
    case "marathonLive": {
      const remaining = context.marathonRemainingKm ?? 0;
      return {
        title: "Marathon Live!",
        text: `Only ${formatKm(remaining)} left`,
        steps,
        calories: estimateCalories(steps),
        distanceKm: estimateDistanceKm(steps),
        notificationCase: "marathonLive",
      };
    }
    case "squadBattleComplete":
      return {
        title: "Completed!",
        text: "Your squad's fate is waiting",
        steps,
        calories: estimateCalories(steps),
        distanceKm: estimateDistanceKm(steps),
        notificationCase: "squadBattleComplete",
      };
    case "marathonFinished":
      return {
        title: "Completed",
        text: "Marathon finished · Claim your rewards now",
        steps,
        calories: estimateCalories(steps),
        distanceKm: estimateDistanceKm(steps),
        notificationCase: "marathonFinished",
      };
    case "battleLive": {
      const gap = mvpGap(steps, context.highestOtherMemberSteps);
      const gapText =
        gap > 0
          ? `${gap.toLocaleString("en-US")} activity away from MVP`
          : "You are on track for MVP";
      return {
        title: "Battle Live",
        text: gapText,
        steps,
        calories: estimateCalories(steps),
        distanceKm: estimateDistanceKm(steps),
        notificationCase: "battleLive",
      };
    }
    default: {
      const streakDays = Math.max(0, context.streakDays ?? 0);
      return {
        title: "STRON Tracker",
        // Match Android custom pane (not the emoji collapsed summary).
        text: IDLE_GOAL_SUBTITLE,
        steps,
        calories: estimateCalories(steps),
        distanceKm: estimateDistanceKm(steps),
        notificationCase: "idle",
        streakDays,
      };
    }
  }
};

export const toCustomPayload = (content: StepNotificationContent): StepNotificationPayload => {
  const formattedSteps = formatSteps(content.steps);
  const formattedCalories = formatCalories(content.steps);
  const formattedDistance = formatKm(content.distanceKm);
  const streakDays = Math.max(0, content.streakDays ?? 0);
  const streakLabel = streakDays === 1 ? "1 Day" : `${streakDays} Days`;

  // Middle column is ALWAYS Streak.
  const middleColumn = `🔥 ${streakLabel}`;

  return {
    case: content.notificationCase,
    caseName: content.notificationCase,
    title: content.title || "STRON Tracker",
    subtitle: content.text || IDLE_GOAL_SUBTITLE,
    steps: formattedSteps,
    calories: content.notificationCase === "idle" ? String(streakDays) : formattedCalories,
    distance: formattedDistance,
    colSteps: `👣 ${formattedSteps}`,
    colCalories: middleColumn,
    colDistance: `📍 ${formattedDistance}`,
    eventEmoji: eventEmojiForCase(content.notificationCase),
    cta: ctaLabelForCase(content.notificationCase) ?? "",
  };
};

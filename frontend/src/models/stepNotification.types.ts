/** Parity: lib/services/step_notification_formatter.dart StepNotificationCase */
export type StepNotificationCase =
  "idle" | "marathonLive" | "squadBattleComplete" | "marathonFinished" | "battleLive";

export type StepNotificationContext = {
  notificationCase: StepNotificationCase;
  marathonRemainingKm?: number;
  highestOtherMemberSteps?: number;
  eventSubtitle?: string;
  /** Current consecutive active-day streak for idle notification. */
  streakDays?: number;
};

export type StepNotificationContent = {
  title: string;
  text: string;
  steps: number;
  calories: number;
  distanceKm: number;
  notificationCase: StepNotificationCase;
  streakDays?: number;
};

export type StepNotificationPayload = {
  case: string;
  caseName?: string;
  title: string;
  subtitle: string;
  steps: string;
  calories: string;
  distance: string;
  colSteps: string;
  colCalories: string;
  colDistance: string;
  eventEmoji: string;
  cta: string;
};

import { EVENT_KEYS } from "../config/eventCatalog.js";

export const DISTANCE_KM_PER_STEP = 0.00075;
export const CALORIES_PER_STEP = 0.04;

export const STRON_FORMATS = {
  MARATHON: "marathon",
  STEP_CHALLENGE: "virtual_step_challenge",
  KING_OF_THE_HILL: "king_of_the_hill",
  FACE_OFF: "face_off",
} as const;

export const STRON_FORMAT_VALUES = Object.values(STRON_FORMATS);

export const SLUG_TO_FORMAT = {
  virtualmarathon: STRON_FORMATS.MARATHON,
  "virtual-step-challenge": STRON_FORMATS.STEP_CHALLENGE,
  "king-of-the-hill": STRON_FORMATS.KING_OF_THE_HILL,
  "face-off": STRON_FORMATS.FACE_OFF,
} as const;

export const MARATHON_MODES = {
  VIRTUAL: "virtual",
  IN_PERSON: "in_person",
} as const;

export const DAILY_MATCH_FORMATS = new Set<string>([
  STRON_FORMATS.FACE_OFF,
  STRON_FORMATS.KING_OF_THE_HILL,
]);

export const FORMAT_TAG: Record<string, string> = {
  [STRON_FORMATS.FACE_OFF]: "Face-Off",
  [STRON_FORMATS.KING_OF_THE_HILL]: "King of the Hill",
  [STRON_FORMATS.MARATHON]: "Marathon",
  [STRON_FORMATS.STEP_CHALLENGE]: "Step Challenge",
};

export const FORMAT_ACTIVITY_TAG: Record<string, string> = {
  [STRON_FORMATS.MARATHON]: "Running",
  [STRON_FORMATS.STEP_CHALLENGE]: "Running",
  [STRON_FORMATS.KING_OF_THE_HILL]: "Stron Games",
  [STRON_FORMATS.FACE_OFF]: "Stron Games",
};


export const FORMAT_SHORT: Record<string, string> = {
  [STRON_FORMATS.MARATHON]: "mar",
  [STRON_FORMATS.STEP_CHALLENGE]: "stc",
  [STRON_FORMATS.KING_OF_THE_HILL]: "koh",
  [STRON_FORMATS.FACE_OFF]: "fof",
};


export const SERVICE_PATH_BY_FORMAT = {
  [STRON_FORMATS.FACE_OFF]: "face_off",
  [STRON_FORMATS.KING_OF_THE_HILL]: "king_of_the_hill",
  [STRON_FORMATS.MARATHON]: "marathon",
  [STRON_FORMATS.STEP_CHALLENGE]: "step_challenge",
} as const;

export const DRAFT_EDITABLE = new Set<string>([
  "title",
  "description",
  "rules",
  "bannerName",
  "capacity",
  "startDate",
  "durationDays",
  "registrationStartDate",
  "registrationEndDate",
  "destination",
  "virtualLink",
  "successfulDaysRequired",
  "rewardLabels",
  "participantInfoFields",
]);

export const PUBLISHED_EDITABLE = new Set<string>([
  "title",
  "description",
  "rules",
  "bannerName",
  "capacity",
  "registrationStartDate",
  "registrationEndDate",
  "destination",
  "virtualLink",
  "rewardLabels",
  "participantInfoFields",
]);


export const LIVE_EDITABLE = new Set<string>(["bannerName"]);

export const OFFICIAL_HOME_FEED_EMAIL = "stepwars2025@gmail.com";

export const COMPLETED_FEED_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const FREE_TICKET_MARKER = "__STRON_FREE__";
export const FREE_EVENT_MARKER = "__STRON_FREE_EVENT__";

export const ACTIVE_PARTICIPATION_STATUSES = [
  "registered",
  "active",
  "completed",
] as const;

export const ENDED_EVENT_STATUSES = new Set<string>([
  "completed",
  "cancelled",
  "settled",
]);

export const MEDAL_BY_RANK: Record<number, string> = {
  1: "gold",
  2: "silver",
  3: "bronze",
};

export const COUPON_EVENT_TYPE_TO_EVENT_KEY: Record<string, string> = {
  marathon_virtual: EVENT_KEYS.MARATHON,
  marathon: EVENT_KEYS.MARATHON,
  survivor: EVENT_KEYS.SURVIVOR,
  survivor_challenge: EVENT_KEYS.SURVIVOR,
  step_challenge: EVENT_KEYS.STEP_CHALLENGE,
  stepchallenge: EVENT_KEYS.STEP_CHALLENGE,
};

export const getMarathonEnvCouponCode = () =>
  String(process.env.MARATHON_COUPON_CODE || "").trim().toUpperCase();

export const VALID_SUBTYPES_BY_EVENT: Record<string, (string | null)[]> = {
  [EVENT_KEYS.MARATHON]: [
    "40_m_marathon",
    "marathon_40m",
    "marathon_5km",
    "marathon_10kms",
    "marathon_21kms",
    "marathon_42kms",
    "km_0_04",
    "0.04km",
    "40m",
    "5km",
    "10km",
    "21km",
    "42km",
  ],
  [EVENT_KEYS.STEP_CHALLENGE]: [
    "step_5k_7d",
    "step_10k_7d",
    "step_5k_30d",
    "step_10k_30d",
    "5k_7d",
    "10k_7d",
    "5k_30d",
    "10k_30d",
    "walk_5k_7d",
    "walk_10k_7d",
    "walk_5k_30d",
    "walk_10k_30d",
  ],
  [EVENT_KEYS.SURVIVOR]: [null],
};


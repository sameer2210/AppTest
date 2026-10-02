import type { ImageSourcePropType } from "react-native";
import { getR2ImageSource } from "./r2Assets";

const images = {
  APP_ICON: getR2ImageSource("icon.png"),

  LOGO: getR2ImageSource("images/nav/STRON_logo.webp"),
  STRON_LOGO: getR2ImageSource("images/nav/STRON_logo.webp"),
  LOADING_LOGO: getR2ImageSource("logo/logo.webp"),
  LOGIN_HERO: getR2ImageSource("images/walkthrough_1.webp"),

  DEFAULT_BG: getR2ImageSource("images/home/bg.webp"),
  WALKTHROUGH_1: getR2ImageSource("images/walkthrough_1.webp"),
  WALKTHROUGH_2: getR2ImageSource("images/walkthrough_2.webp"),
  WALKTHROUGH_3: getR2ImageSource("images/walkthrough_3.webp"),
  WALKTHROUGH_BOTTOM: getR2ImageSource("images/walkthrough_bottom.webp"),

  GOOGLE: getR2ImageSource("images/google.webp"),
  APPLE: getR2ImageSource("images/apple-logo.webp"),
  UPDATE_ROCKET: getR2ImageSource("images/update_rocket.webp"),
  MAINTENANCE_BOX: getR2ImageSource("images/maintanence_box.webp"),
  RATING_GUARD: getR2ImageSource("images/rating_guard.webp"),
  CROWN_ICON: getR2ImageSource("images/genesis_badge.webp"),
  GOLDEN_FRAME: getR2ImageSource("images/genesis_badge.webp"),
  GENESIS_BADGE: getR2ImageSource("images/genesis_badge.webp"),
  TRAIN_WITH_AI: getR2ImageSource("images/home/robot-mascot.webp"),
  COIN_ICON: getR2ImageSource("images/genesis_badge.webp"),

  PERMISSIONS: {
    WEAK: getR2ImageSource("images/permissions/weak.webp"),
    ACTIVE: getR2ImageSource("images/permissions/active.webp"),
    STABLE: getR2ImageSource("images/permissions/strong.webp"),
    STRONG: getR2ImageSource("images/permissions/great.webp"),
    GREAT: getR2ImageSource("images/permissions/stable.webp"),
  },

  /** Legacy tab icons (root /images, not /nav) */
  HOME: getR2ImageSource("icon.png"),
  SETTINGS: getR2ImageSource("icon.png"),

  NAV: {
    HOME_ACTIVE: getR2ImageSource("images/nav/STRON_logo.webp"),
    HOME_INACTIVE: getR2ImageSource("images/nav/STRON_logo.webp"),
    EVENTS_ACTIVE: getR2ImageSource("images/shop/1.webp"),
    EVENTS_INACTIVE: getR2ImageSource("images/shop/2.webp"),
    SHOP_ACTIVE: getR2ImageSource("images/shop/3.webp"),
    SHOP_INACTIVE: getR2ImageSource("images/shop/4.webp"),
  },

  SHOP: {
    FEATURE_1: getR2ImageSource("images/shop/1.webp"),
    FEATURE_2: getR2ImageSource("images/shop/2.webp"),
    FEATURE_3: getR2ImageSource("images/shop/3.webp"),
    FEATURE_4: getR2ImageSource("images/shop/4.webp"),
    TOP_VOTERS: getR2ImageSource("images/shop/5.webp"),
  },

  BATTLE_RESULTS: {
    MVP: getR2ImageSource("images/battle-results/MVPG.webp"),
    CLUTCH: getR2ImageSource("images/battle-results/clutch.webp"),
    RELENTLESS: getR2ImageSource("images/battle-results/relentless.webp"),
    TOP3: getR2ImageSource("images/battle-results/top3.webp"),
    TOP5: getR2ImageSource("images/battle-results/top5.webp"),
  },

  REWARDS: {
    RELIC: getR2ImageSource("images/rewards/relic2.webp"),
    BIB: getR2ImageSource("images/rewards/rewards_bib.webp"),
    CERTIFICATE: getR2ImageSource("images/rewards/rewards_certificate.webp"),
    BIB_TEMPLATE: getR2ImageSource("images/rewards/e_bib_number.webp"),
    CERTIFICATE_TEMPLATE: getR2ImageSource("images/rewards/certificate.webp"),
    MEDAL_BG: getR2ImageSource("images/rewards/medals/medal_bg.webp"),
    MEDAL_GOLD: getR2ImageSource("images/rewards/medals/medal_gold.webp"),
    MEDAL_SILVER: getR2ImageSource("images/rewards/medals/medal_silver.webp"),
    MEDAL_BRONZE: getR2ImageSource("images/rewards/medals/medal_bronze.webp"),
    MEDAL_KOTH: getR2ImageSource("images/rewards/medals/medal_koth.webp"),
    BADGE_BOUNCE: getR2ImageSource("images/rewards/medals/badge_bounce.webp"),
    BADGE_CLOSE: getR2ImageSource("images/rewards/medals/badge_close.webp"),
    BADGE_KNOCKOUT: getR2ImageSource("images/rewards/medals/badge_knockout.webp"),
    SIGNATURE: getR2ImageSource("images/rewards/stron_signature.webp"),
    CERTIFICATE_LOGO: require("../../assets/logo/certificate_logo.png") as ImageSourcePropType,
    CERTIFICATE_CORNER: require("../../assets/logo/certificate_corner.png") as ImageSourcePropType,
  },

  HOME_V2: {
    BG: getR2ImageSource("images/home/bg.webp"),
    FOREST: getR2ImageSource("images/home/forest.webp"),
    ICON_STEPS: getR2ImageSource("images/home/icon-steps.webp"),
    ICON_DISTANCE: getR2ImageSource("images/home/icon-distance.webp"),
    ICON_STREAK: getR2ImageSource("images/home/icon-streak.webp"),
    ROBOT_MASCOT: getR2ImageSource("images/home/robot-mascot.webp"),
    AVATAR_SAMPLE: getR2ImageSource("images/home/avatar-sample.webp"),
    BELL: require("../../assets/images/home/v2/icon-bell.webp"),
    NOTIFICATION_BG: getR2ImageSource("images/home/bg.webp"),
    DOT: getR2ImageSource("images/home/dot-light.webp"),
    TAB_HOME: getR2ImageSource("images/home/tab-fab-bg.webp"),
    TAB_SEARCH: getR2ImageSource("images/home/tab-fab-bg.webp"),
    TAB_ZAP: getR2ImageSource("images/home/tab-fab-bg.webp"),
    TAB_USER: getR2ImageSource("images/home/tab-fab-bg.webp"),
    TAB_PLUS: getR2ImageSource("images/home/tab-fab-bg.webp"),
    TAB_FAB_BG: getR2ImageSource("images/home/tab-fab-bg.webp"),
    STEP_RACE_FRIEND: getR2ImageSource("images/home/avatar-sample.webp"),
    STEP_RACE_RANDOM: getR2ImageSource("images/home/avatar-sample.webp"),

    /** Bundled locally — remote R2 URLs fail offline / when CDN is unavailable. */
    START_RACE_BANNER: require("../../assets/images/home/v2/start-race-banner.webp"),
    ICON_PLAY: require("../../assets/images/home/v2/icon-play.webp"),
    ICON_CHECKIN: require("../../assets/images/home/v2/icon-checkin.webp"),
    ICON_MY_RACES: require("../../assets/images/home/v2/icon-my-races.webp"),
    ICON_MY_PLANS: require("../../assets/images/home/v2/icon-my-plans.webp"),
    ICON_WINS: require("../../assets/images/home/v2/icon-wins.webp"),
    ICON_LOSE: require("../../assets/images/home/v2/icon-lose.webp"),
    ICON_INFO: require("../../assets/images/home/v2/icon-info.webp"),
    STRON_PRO_CROWN: getR2ImageSource("gym-business/stron_pro_crown_diamond.png"),
  },

  EXPLORE_V2: {
    ICON_SEARCH: getR2ImageSource("images/explore/v2/icon-search.webp"),
    ICON_PLUS: getR2ImageSource("images/explore/v2/icon-plus.webp"),
    ICON_CHEVRON: getR2ImageSource("images/explore/v2/icon-chevron.webp"),
    ICON_LOCATION_CARET: getR2ImageSource("images/explore/v2/icon-location-caret.webp"),
  },

  CREATE_V2: {
    ICON_MARATHON: require("../../assets/images/create/v2/icon-marathon.webp") as ImageSourcePropType,
    ICON_STEP_CHALLENGE: require("../../assets/images/create/v2/icon-step-challenge.webp") as ImageSourcePropType,
    ICON_KOTH: require("../../assets/images/create/v2/icon-koth.webp") as ImageSourcePropType,
    ICON_FACE_OFF: require("../../assets/images/create/v2/icon-face-off.webp") as ImageSourcePropType,
    ICON_CHEVRON: require("../../assets/images/create/v2/icon-chevron.webp") as ImageSourcePropType,
  },

  STEP_RACE: {
    BG: getR2ImageSource("images/step-race/bg.webp"),
    COPY: getR2ImageSource("images/step-race/bg.webp"),
    ELITE_BADGE: getR2ImageSource("images/step-race/elite-badge.webp"),
    CLOSE_CIRCLE: getR2ImageSource("images/step-race/elite-badge.webp"),
    CLOSE_X: getR2ImageSource("images/step-race/elite-badge.webp"),
    DICE: require("../../assets/images/step_race_dice.png"),
  },

  MANAGED_EVENTS: {
    KING_OF_THE_HILL: getR2ImageSource("images/managedEvents/king-of-the-hill.webp"),
    FACE_OFF: getR2ImageSource("images/managedEvents/face-off.webp"),
    LIST_EVENT_BG: getR2ImageSource("images/managedEvents/list-event-bg.webp"),
    INSIDE_EVENT_BANNER: getR2ImageSource("stron-envet-banners/event list.jpg"),
    EVENT_PUBLISHED_BG: getR2ImageSource("images/managedEvents/event-published-bg.webp"),
  },

  TICKET_ICONS: {
    WHATSAPP: getR2ImageSource("images/managedEvents/icon_whatsapp.webp"),
    MAP: getR2ImageSource("images/managedEvents/icon_google_map.webp"),
    RULES: getR2ImageSource("images/managedEvents/icon_rules.webp"),
    CERTIFICATE: getR2ImageSource("images/managedEvents/icon_certificate.webp"),
    REWARDS: getR2ImageSource("images/managedEvents/icon_rewards.webp"),
  },

  EVENT_BANNER_TEMPLATES: {
    MARATHON: require("../../assets/Marathon.png") as ImageSourcePropType,
    STEP_CHALLENGE: require("../../assets/Step-challenge.png") as ImageSourcePropType,
    KING_OF_THE_HILL: require("../../assets/King-of-the-hill.png") as ImageSourcePropType,
    FACE_OFF: require("../../assets/Face-off.png") as ImageSourcePropType,
  },

  BITMOJI: {
    bt1: getR2ImageSource("bitmoji/bt1.webp"),
    bt2: getR2ImageSource("bitmoji/bt2.webp"),
    bt3: getR2ImageSource("bitmoji/bt3.webp"),
    bt4: getR2ImageSource("bitmoji/bt4.webp"),
    bt5: getR2ImageSource("bitmoji/bt5.webp"),
    bt6: getR2ImageSource("bitmoji/bt6.webp"),
    bt7: getR2ImageSource("bitmoji/bt7.webp"),
    bt8: getR2ImageSource("bitmoji/bt8.webp"),
    bt9: getR2ImageSource("bitmoji/bt9.webp"),
    bt10: getR2ImageSource("bitmoji/bt10.webp"),
    bt11: getR2ImageSource("bitmoji/bt11.webp"),
    bt12: getR2ImageSource("bitmoji/bt12.webp"),
  },

  ONBOARDING_SLIDE1_BG: require("../../assets/images/onboarding/first-onboarding.png"),
  ONBOARDING: {
    FIRST: require("../../assets/images/onboarding/first-onboarding.png"),
    BUSINESS_1: require("../../assets/images/onboarding/business-1.jpg"),
    BUSINESS_2: require("../../assets/images/onboarding/business-2.png"),
    BUSINESS_4: require("../../assets/images/onboarding/business-4.png"),
    INDIVIDUAL_1: require("../../assets/images/onboarding/individual-1.jpg"),
    INDIVIDUAL_2: require("../../assets/images/onboarding/individual-2.png"),
    INDIVIDUAL_3: require("../../assets/images/onboarding/individual-3.png"),
    INDIVIDUAL_4: require("../../assets/images/onboarding/individual-4.png"),
  },
  STRON_PRO: {
    BG: require("../../assets/logo/pro-bg.png") as ImageSourcePropType,
    LOGO: require("../../assets/logo/pro-logo.png") as ImageSourcePropType,
  },
  PRO_LOGO: require("../../assets/logo/pro-logo.png") as ImageSourcePropType,
  GYM_BUSINESS: {
    STRON_PRO_CROWN_DIAMOND: getR2ImageSource("gym-business/stron_pro_crown_diamond.png"),
    ANALYTICS_PREVIEW_BLUR: getR2ImageSource("gym-business/gym_analytics_preview_blur.png"),
    SCREEN_BG: getR2ImageSource("gym-business/gym_plan_screen_bg.png"),
  },
} as const satisfies Record<string, unknown>;

export type TabNavIconPair = {
  active: ImageSourcePropType;
  inactive: ImageSourcePropType;
};

export const tabNavIcons = {
  index: { active: images.NAV.HOME_ACTIVE, inactive: images.NAV.HOME_INACTIVE },
  explore: { active: images.NAV.EVENTS_ACTIVE, inactive: images.NAV.EVENTS_INACTIVE },
  events: {
    active: images.NAV.EVENTS_ACTIVE,
    inactive: images.NAV.EVENTS_INACTIVE,
  },
  shop: { active: images.NAV.SHOP_ACTIVE, inactive: images.NAV.SHOP_INACTIVE },
} as const satisfies Record<string, TabNavIconPair>;

export { images };

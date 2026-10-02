import { posthog } from "./client";
import { isPostHogEnabled } from "./enabled";
import type { StronEventFormat } from "@/models/stronManaged/event";

/**
 * PostHog product-event catalog (Phase 1 + Phase 2).
 * Naming: snake_case, object_action past tense.
 * Full spec: Stron_PostHog_Analytics_Audit.xlsx ("P1 Backend Events" sheet).
 */

// ---------------------------------------------------------------- Auth
type AuthEvents = {
  otp_sent: { entry_point?: "login" | "organizer_gate" };
  otp_resent: { entry_point?: "login" | "organizer_gate"; attempt_count?: number };
  otp_verified: { success: boolean; entry_point?: "login" | "organizer_gate" };
  login_completed: {
    method: "google" | "apple" | "phone" | "guest";
    is_new_user?: boolean;
  };
  guest_login: Record<string, never>;
  phone_linked: { context: "organizer_gate" };
  onboarding_completed: { role?: "individual" | "business" };
  logged_out: Record<string, never>;
  account_deleted: Record<string, never>;
};

// ---------------------------------------------------------------- Payments / participant
type PaymentEvents = {
  ticket_order_created: {
    event_key: string;
    format?: string;
    is_free: boolean;
    amount?: number;
    ticket_type?: string;
    quantity?: number;
  };
  coupon_applied: {
    event_key: string;
    code: string;
    valid: boolean;
    discount?: number;
  };
  payment_succeeded: {
    event_key?: string;
    amount?: number;
    order_id?: string;
  };
  payment_failed: {
    event_key?: string;
    amount?: number;
    stage: "checkout" | "verify";
    reason?: string;
  };
};

// ---------------------------------------------------------------- Organizer / managed events
type OrganizerEvents = {
  event_created: {
    format: StronEventFormat;
    event_key?: string;
    is_external?: boolean;
    is_free?: boolean;
    ticket_count?: number;
    capacity?: number;
  };
  event_published: { event_key: string; format?: StronEventFormat };
  event_updated: { event_key: string; fields_changed?: string[] };
  event_cancelled: { event_key: string; format?: StronEventFormat };
  event_deleted: { event_key: string };
  organizer_profile_saved: { is_new?: boolean };
  settlement_requested: { event_key: string; amount?: number };
  settlement_released: { event_key: string };
};

// ---------------------------------------------------------------- Step race
type StepRaceEvents = {
  race_opponent_searched: { query_length: number; result_count: number };
  race_created: {
    opponent_type: "friend" | "shadow";
    is_rematch?: boolean;
    duration?: number;
  };
  race_completed: {
    result: "win" | "loss" | "draw";
    my_steps?: number;
    opponent_steps?: number;
    opponent_type?: string;
    completed_by?: "auto" | "user";
  };
};

// ---------------------------------------------------------------- Engagement (opinions, QR, explore)
type EngagementEvents = {
  opinion_vote_submitted: { opinion_id: string; option: string };
  opinion_liked: { opinion_id: string };
  opinion_unliked: { opinion_id: string };
  qr_scanned: {
    scan_type?: string;
    success: boolean;
    method?: "camera" | "manual" | "gallery";
    reason?: string;
  };
  connect_qr_viewed: { refreshed: boolean };
  explore_city_changed: { city: string; source?: "search" | "gps" };
  bookmark_toggled: { entity_type: string; entity_id: string; added: boolean };
};

// ---------------------------------------------------------------- Profile
type ProfileEvents = {
  profile_updated: { fields_changed?: string[] };
  profile_photo_uploaded: { context: "profile" | "event_banner" };
  bank_details_saved: Record<string, never>;
  step_goal_changed: { new_goal: number; old_goal?: number };
  feedback_submitted: { rating?: number; has_comment?: boolean };
};

// ---------------------------------------------------------------- UI-only events (never hit the backend)
type UiEvents = {
  onboarding_slide_viewed: { slide_index: number };
  onboarding_role_selected: { role: string };
  onboarding_cta_tapped: { method: "google" | "apple" | "phone" | "guest" };
  permission_sheet_shown: { type: "activity" | "health" | "notification" };
  permission_result: {
    type: "activity" | "health" | "notification";
    result: "granted" | "denied" | "settings";
  };
  camera_permission_result: { granted: boolean };
  health_sync_connect_tapped: { provider: "health_connect" | "apple_health" | "google_fit" };
  activity_tracking_enable_tapped: Record<string, never>;
  notification_enable_tapped: Record<string, never>;
  event_shared: { event_key?: string; source_screen?: string };
  opinion_shared: { opinion_id?: string };
  plan_shared: { plan_id?: string; plan_name?: string };
  business_listing_shared: { business_id?: string; business_name?: string };
  race_result_shared: { result?: "win" | "loss" | "draw" };
  app_shared: { source_screen?: string };
  connect_qr_shared: { method: "share" | "copy" };
  receipt_downloaded: { event_key?: string };
  home_quick_action_tapped: { action: string };
  home_profile_tapped: Record<string, never>;
  home_pro_banner_tapped: Record<string, never>;
  race_start_tapped: Record<string, never>;
  notification_bell_tapped: { unread_count?: number };
  home_live_card_tapped: { type: "race" | "event" };
  ticket_opened: { event_key?: string; tab?: string };
  ticket_checkout_started: { event_key?: string; ticket_type?: string; is_free?: boolean };
  profile_menu_tapped: { item: string };
  invoice_tapped: { event_key?: string };
  inbox_item_tapped: { notification_id?: string; kind?: string; event_key?: string };
  inbox_item_dismissed: { notification_id?: string; kind?: string; event_key?: string };
  reward_previewed: { event_key?: string; type?: string };
  rating_prompt_shown: Record<string, never>;
  rating_prompt_dismissed: Record<string, never>;
  opinion_option_selected: { opinion_id?: string; option: string };
  explore_filter_changed: { category: string };
  explore_search_submitted: { query: string };
  explore_card_tapped: { event_key?: string; section?: string };
  location_picker_opened: Record<string, never>;
  featured_see_all_tapped: { section?: string };
  race_mode_toggled: { mode: string };
  feeling_lucky_tapped: Record<string, never>;
  rematch_tapped: Record<string, never>;
  tickets_tab_switched: { tab: string };
  tickets_filter_changed: { category: string };
  ticket_qr_expanded: { event_key?: string };
  special_offer_opened: { event_key?: string };
  special_offer_copied: { event_key?: string; code?: string };
  special_offer_redeemed: { event_key?: string; code?: string };
  organizer_contact_tapped: { channel: "whatsapp" | "tel" | "email" };
  event_detail_tab_switched: { tab: string; event_key?: string };
  create_format_selected: { format: string };
  ecertificate_viewed: { event_key?: string };
  ebib_viewed: { event_key?: string };
  connect_tab_switched: { tab?: string; mode?: string };
  deep_link_opened: { url?: string; route?: string };
  notification_opened: { route?: string };
  update_blocker_shown: Record<string, never>;
  maintenance_blocker_shown: Record<string, never>;
  offline_banner_shown: Record<string, never>;
};

export type AnalyticsEventMap = AuthEvents &
  PaymentEvents &
  OrganizerEvents &
  StepRaceEvents &
  EngagementEvents &
  ProfileEvents &
  UiEvents;

export type AnalyticsEventName = keyof AnalyticsEventMap;

/**
 * Fire-and-forget PostHog capture. Never throws, never blocks a user flow.
 * No-ops unless the API base URL includes `apiv2` and a PostHog key is set.
 */
export const captureEvent = <E extends AnalyticsEventName>(
  event: E,
  ...args: AnalyticsEventMap[E] extends Record<string, never>
    ? [properties?: AnalyticsEventMap[E]]
    : [properties: AnalyticsEventMap[E]]
): void => {
  if (!isPostHogEnabled) return;

  void (async () => {
    try {
      await posthog.ready();
      posthog.capture(event, args[0]);
      await posthog.flush();
    } catch (error) {
      if (__DEV__) {
        console.warn(`[PostHog] Failed to capture "${event}"`, error);
      }
    }
  })();
};

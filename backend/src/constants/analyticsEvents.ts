/** Stable snake_case event names — keep in sync with the app catalog (src/analytics/posthog/events.ts). */
export const ANALYTICS_EVENTS = {
  // Auth
  OTP_SENT: "otp_sent",
  OTP_RESENT: "otp_resent",
  OTP_VERIFIED: "otp_verified",
  LOGIN_COMPLETED: "login_completed",
  GUEST_LOGIN: "guest_login",
  PHONE_LINKED: "phone_linked",
  LOGGED_OUT: "logged_out",
  ACCOUNT_DELETED: "account_deleted",

  // Payments / participant
  TICKET_ORDER_CREATED: "ticket_order_created",
  COUPON_APPLIED: "coupon_applied",
  PAYMENT_SUCCEEDED: "payment_succeeded",
  PAYMENT_FAILED: "payment_failed",

  // Organizer / managed events
  EVENT_CREATED: "event_created",
  EVENT_PUBLISHED: "event_published",
  EVENT_UPDATED: "event_updated",
  EVENT_CANCELLED: "event_cancelled",
  EVENT_DELETED: "event_deleted",
  ORGANIZER_PROFILE_SAVED: "organizer_profile_saved",
  SETTLEMENT_REQUESTED: "settlement_requested",
  SETTLEMENT_RELEASED: "settlement_released",

  // Step race
  RACE_OPPONENT_SEARCHED: "race_opponent_searched",
  RACE_CREATED: "race_created",
  RACE_COMPLETED: "race_completed",

  // Engagement
  OPINION_VOTE_SUBMITTED: "opinion_vote_submitted",
  OPINION_LIKED: "opinion_liked",
  OPINION_UNLIKED: "opinion_unliked",
  QR_SCANNED: "qr_scanned",
  CONNECT_QR_VIEWED: "connect_qr_viewed",
  BOOKMARK_TOGGLED: "bookmark_toggled",

  // Profile
  PROFILE_UPDATED: "profile_updated",
  PROFILE_PHOTO_UPLOADED: "profile_photo_uploaded",
  FEEDBACK_SUBMITTED: "feedback_submitted",

  // Backend-only lifecycle (no matching client action)
  STRON_EVENT_LIVE: "stron_event_live",
  STRON_EVENT_COMPLETED: "stron_event_completed",
  NOTIFICATION_SENT: "notification_sent",
  NOTIFICATION_OPENED: "notification_opened",
  BECAME_INACTIVE: "became_inactive",
  BECAME_ACTIVE_AGAIN: "became_active_again",
  EVENT_JOINED: "event_joined",
  EVENT_COMPLETED: "event_completed",
  EVENT_ABANDONED: "event_abandoned",
  EVENT_VIEWED: "event_viewed",
  BADGE_RECEIVED: "badge_received",
  FOUNDER_BADGE_RECEIVED: "founder_badge_received",
  MYSTERY_BOX_OPENED: "mystery_box_opened",

  // Aliases so existing callers keep compiling; values match the catalog above
  STRON_EVENT_CREATED: "event_created",
  STRON_EVENT_PUBLISHED: "event_published",
  STRON_EVENT_CANCELLED: "event_cancelled",
  STRON_TICKET_PURCHASED: "payment_succeeded",
  STRON_SETTLEMENT_RELEASED: "settlement_released",
};

/** Firebase remote config defaults + app gate keys. */
export const REMOTE_CONFIG_DEFAULTS = {
  backend_url: "https://apiv2.stron.in",
  battle_time_minutes: 10,
  multiplier_3x_price: 300,
  multiplier_2x_price: 200,
  multiplier_1_5x_price: 100,
  ko_diff: 200,
  draw_diff: 50,
  step_save_debounce_minutes: 15,
  bronze_box_price: 1000,
  silver_box_price: 5000,
  gold_box_price: 10000,
  matchmaking_timeout_seconds: 15,
  is_maintenance_mode: false,
  maintenance_estimated_time: "~1 hour",
  min_version_android: "2.0",
  min_version_ios: "1.0",
} as const;

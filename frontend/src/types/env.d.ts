declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_EVENT_SHARE_BASE_URL?: string;
    EXPO_PUBLIC_EAS_PROJECT_ID?: string;
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_POSTHOG_API_KEY?: string;
    EXPO_PUBLIC_POSTHOG_HOST?: string;
    EXPO_PUBLIC_CLARITY_PROJECT_ID?: string;
    EXPO_PUBLIC_DEV_MOCK_LOCATION?: string;
    EXPO_PUBLIC_DEV_AUTH_BYPASS?: string;
    EXPO_PUBLIC_GNEWS_API_KEY?: string;
    EXPO_PUBLIC_GEMINI_API_KEY?: string;
  }
}

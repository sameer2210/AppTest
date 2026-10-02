export const openApiBase = {
  openapi: "3.0.3",
  info: {
    title: "STRON Backend API Documentation",
    version: "1.0.0",
    description: `
# Welcome to the STRON Backend API Explorer 🚀

STRON is a unified fitness ecosystem providing:
- **Gamified Fitness & Step Tracking**: Step Wars, 1v1 PvP Step Races, King of the Hill & Managed Marathons.
- **Gym Business SaaS**: Member management, membership subscriptions, attendance tracking, billing, and analytics.
- **Social Engagement & Community**: Opinion Hub daily polls, user profiles, notifications, and media uploads.
- **Monetization & Payments**: Razorpay integration, STRON PRO tiers, in-app purchases, and payout accounts.

---

### Docs access
This explorer is protected with HTTP Basic auth. Use the Swagger username/password from backend constants / \`SWAGGER_PASSWORD\`.

### Authentication Guide
This API uses **Bearer JWT Authentication** for protected endpoints.
1. Authenticate via \`/api/auth/send-otp\` + \`/api/auth/verify-otp\` or \`/api/auth/guest\`.
2. Copy the \`accessToken\` from the response.
3. Click the green **Authorize** button at the top right of this page.
4. Enter the token in the format \`Bearer <your_token>\` or just \`<your_token>\`.
5. Click **Authorize**. The authorization will persist across page refreshes for your convenience!
    `,
    contact: {
      name: "STRON Engineering Team",
      email: "support@stron.app",
    },
    license: {
      name: "Proprietary",
    },
  },
  servers: [
    {
      url: "/",
      description: "Current Host / Relative Server",
    },
    {
      url: `http://localhost:${process.env.PORT || 5000}`,
      description: "Local Development Server",
    },
  ],
  tags: [
    {
      name: "Authentication & Identity",
      description: "User authentication, OTP verification, guest sessions, and token exchange.",
    },
    {
      name: "User & Step Activity",
      description: "User profile management, live/past step syncing, lifetime fitness stats, and activity history.",
    },
    {
      name: "Gym Business - Profile & Plans",
      description: "Gym business profile onboarding, plan creation, and catalog management.",
    },
    {
      name: "Gym Business - Members & Memberships",
      description: "Member directory, membership assignments, lifecycle, and payment reminders.",
    },
    {
      name: "Gym Business - Operations & Billing",
      description: "Manual/online payments, payout accounts, discount coupons, and daily attendance.",
    },
    {
      name: "Gym Business - SaaS & PRO Subscriptions",
      description: "STRON PRO platform subscriptions, 14-day trials, Razorpay / RevenueCat billing, and entitlements.",
    },
    {
      name: "STRON Connect",
      description: "QR-based member identification, physical check-ins, and gym network catalog.",
    },
    {
      name: "Managed Events - Tournaments & Challenges",
      description: "Marathons, Step Challenges, King of the Hill, Face-Off battles, ticketing, and organizer dashboard.",
    },
    {
      name: "Step Race - 1v1 PvP Battles",
      description: "Real-time 1v1 step battle matchmaking, shadow opponents, rivalries, and leaderboards.",
    },
    {
      name: "Opinion Hub",
      description: "Daily fitness opinion questions, community voting, and sentiment aggregation.",
    },
    {
      name: "Push Notifications",
      description: "Firebase Cloud Messaging (FCM) device registration, notification inbox, and read tracking.",
    },
    {
      name: "Payments & Ticketing",
      description: "Razorpay order creation, payment signature verification, payment history, and refunds.",
    },
    {
      name: "Media & Cloud Storage",
      description: "Secure image uploads to Cloudflare R2 storage and public URL retrieval.",
    },
    {
      name: "System & Remote Config",
      description: "Health checks, mobile remote configurations, feedback submissions, and system maintenance.",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Standard JWT Bearer token. Format: `Bearer <token>` or `<token>`.",
      },
      InternalTokenAuth: {
        type: "apiKey",
        in: "header",
        name: "x-internal-token",
        description: "Secret token for server-to-server internal cron / background synchronization endpoints.",
      },
    },
    schemas: {
      StandardSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string", example: "Operation completed successfully." },
        },
      },
      StandardError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: {
            type: "string",
            example: "bad_request",
            description: "STRON standard error code (e.g. invalid_field, unauthorized, not_found, etc.)",
          },
          message: { type: "string", example: "The requested operation could not be completed." },
          retryAfterSeconds: { type: "number", example: 60, description: "Optional cooldown in seconds." },
          attemptsRemaining: { type: "number", example: 2, description: "Remaining attempts if applicable." },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          code: { type: "string", example: "validation_error" },
          message: { type: "string", example: "Invalid request parameters." },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                path: { type: "array", items: { type: "string" }, example: ["body", "phone"] },
                message: { type: "string", example: "Phone number is required." },
              },
            },
          },
        },
      },
      AuthTokensResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          refreshToken: { type: "string", example: "d9e84b8c-52cb-4567-9321-..." },
          user: {
            type: "object",
            properties: {
              uid: { type: "string", example: "usr_abc123" },
              phone: { type: "string", example: "+919876543210" },
              username: { type: "string", example: "iron_stepper" },
              email: { type: "string", example: "user@example.com" },
            },
          },
        },
      },
      UserProfile: {
        type: "object",
        properties: {
          uid: { type: "string", example: "usr_abc123" },
          username: { type: "string", example: "iron_stepper" },
          email: { type: "string", example: "user@example.com" },
          contactNo: { type: "string", example: "+919876543210" },
          profileImageUrl: { type: "string", example: "https://r2.stron.app/profiles/usr_abc123.jpg" },
          todaySteps: { type: "number", example: 8450 },
          lifetimeSteps: { type: "number", example: 342000 },
          longestStreak: { type: "number", example: 14 },
          currentStreak: { type: "number", example: 5 },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Authentication missing, invalid, or expired.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StandardError" },
            example: {
              success: false,
              code: "unauthorized",
              message: "Missing Bearer token or token expired.",
            },
          },
        },
      },
      Forbidden: {
        description: "Access forbidden (insufficient permissions, suspended business, or missing role).",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StandardError" },
            example: {
              success: false,
              code: "forbidden",
              message: "You do not have permission to access this resource.",
            },
          },
        },
      },
      NotFound: {
        description: "Requested resource not found.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StandardError" },
            example: {
              success: false,
              code: "not_found",
              message: "Resource not found.",
            },
          },
        },
      },
      ValidationError: {
        description: "Request body, query, or path parameter validation failed.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ValidationError" },
          },
        },
      },
      RateLimited: {
        description: "Too many requests. Cooldown active.",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/StandardError" },
            example: {
              success: false,
              code: "rate_limited",
              message: "Too many requests, please try again later.",
              retryAfterSeconds: 60,
            },
          },
        },
      },
    },
  },
};

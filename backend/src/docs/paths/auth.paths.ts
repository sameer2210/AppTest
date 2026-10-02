export const authPaths = {
  "/api/auth/send-otp": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Send mobile OTP",
      description: "Dispatches a 4-to-6 digit OTP SMS to the specified phone number for mobile login or registration.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["phone"],
              properties: {
                phone: { type: "string", example: "+919876543210", description: "E.164 formatted or standard phone number." },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "OTP sent successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: "OTP sent successfully" },
                },
              },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/auth/verify-otp": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Verify mobile OTP",
      description: "Validates the OTP code received via SMS. Returns full JWT access & refresh credentials.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["phone", "otp"],
              properties: {
                phone: { type: "string", example: "+919876543210" },
                otp: { type: "string", example: "1234" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "OTP verified. Session created.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthTokensResponse" },
            },
          },
        },
        400: {
          description: "Invalid OTP or phone.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardError" },
              example: { success: false, code: "invalid_otp", message: "Invalid or expired OTP code." },
            },
          },
        },
      },
    },
  },
  "/api/auth/resend-otp": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Resend mobile OTP",
      description: "Resends the OTP if the cooldown window has passed.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["phone"],
              properties: {
                phone: { type: "string", example: "+919876543210" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "OTP resent successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/auth/guest": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Device-bound guest login",
      description: "Allows users to explore the application anonymously bound to their hardware device ID without requiring phone verification.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["deviceId", "platform"],
              properties: {
                deviceId: { type: "string", example: "a9c78210-4f93-4b67-93e1-923058b73f84" },
                platform: { type: "string", enum: ["android", "ios"], example: "android" },
                username: { type: "string", example: "Guest_Walker_42" },
                location: { type: "string", example: "Bangalore, India" },
                onboardingRole: { type: "string", enum: ["individual", "business"], example: "individual" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Guest session initialized.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthTokensResponse" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
      },
    },
  },
  "/api/auth/sync-user": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Sync authenticated user profile",
      description: "Updates or binds user profile details (Firebase UID, email, username, avatar) with backend records.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                uid: { type: "string", example: "usr_abc123" },
                email: { type: "string", example: "user@example.com" },
                username: { type: "string", example: "iron_stepper" },
                profileImageUrl: { type: "string", example: "https://r2.stron.app/profiles/usr_abc123.jpg" },
                contactNo: { type: "string", example: "+919876543210" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "User synced successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  user: { $ref: "#/components/schemas/UserProfile" },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/auth/exchange-token": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Exchange Firebase token for STRON JWT",
      description: "Exchanges a client Firebase ID token (or OAuth token) in the Authorization header for an app-level JWT access token and refresh token.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                username: { type: "string", example: "iron_stepper" },
                profileImageUrl: { type: "string", example: "https://r2.stron.app/profiles/usr_abc123.jpg" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Tokens exchanged successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AuthTokensResponse" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/auth/refresh": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Refresh access token",
      description: "Exchanges an active refresh token for a new short-lived JWT access token.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["refreshToken"],
              properties: {
                refreshToken: { type: "string", example: "d9e84b8c-52cb-4567-9321-..." },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Token refreshed.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  refreshToken: { type: "string", example: "new-refresh-token..." },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/auth/logout": {
    post: {
      tags: ["Authentication & Identity"],
      summary: "Revoke session / logout",
      description: "Invalidates the active refresh token and terminates the current user session.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                refreshToken: { type: "string", example: "d9e84b8c-52cb-4567-9321-..." },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Logged out successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
      },
    },
  },
};

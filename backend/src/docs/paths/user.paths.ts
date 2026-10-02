export const userPaths = {
  "/api/user/me/roles": {
    get: {
      tags: ["User & Step Activity"],
      summary: "Get profile-switcher roles for the authenticated user",
      description:
        "Returns individual identity plus whether the user owns a gym business and/or is an ACTIVE trainer/moderator.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Role payload.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "object",
                    properties: {
                      individual: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          username: { type: "string" },
                          avatarUrl: { type: "string", nullable: true },
                        },
                      },
                      business: { type: "object" },
                      trainer: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/profile/{uid}": {
    get: {
      tags: ["User & Step Activity"],
      summary: "Get user profile",
      description: "Retrieves complete user profile, current streak, today steps, and lifetime stats.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "User unique ID",
        },
      ],
      responses: {
        200: {
          description: "User profile found.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: { $ref: "#/components/schemas/UserProfile" },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    put: {
      tags: ["User & Step Activity"],
      summary: "Update user profile",
      description: "Updates user display name, bio, profile photo, or emergency contact info.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
          description: "User unique ID",
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                username: { type: "string", example: "fitness_guru" },
                bio: { type: "string", example: "Walking 10k steps every day!" },
                profileImageUrl: { type: "string", example: "https://r2.stron.app/profiles/updated.jpg" },
                location: { type: "string", example: "Bangalore" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Profile updated successfully.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/sync-steps": {
    post: {
      tags: ["User & Step Activity"],
      summary: "Sync live daily steps",
      description: "Syncs step count recorded by Google Health Connect or Apple HealthKit for the current day.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["steps"],
              properties: {
                steps: { type: "number", example: 8520, description: "Total steps walked today." },
                calories: { type: "number", example: 340.5 },
                distanceMeters: { type: "number", example: 6200 },
                activeMinutes: { type: "number", example: 75 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Steps recorded.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  todaySteps: { type: "number", example: 8520 },
                  coinsEarned: { type: "number", example: 10 },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
        429: { $ref: "#/components/responses/RateLimited" },
      },
    },
  },
  "/api/user/sync-past-steps": {
    post: {
      tags: ["User & Step Activity"],
      summary: "Sync historical offline steps",
      description: "Allows syncing step counts for previous dates (up to 7 days) if the device was offline.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["records"],
              properties: {
                records: {
                  type: "array",
                  items: {
                    type: "object",
                    required: ["date", "steps"],
                    properties: {
                      date: { type: "string", example: "2026-09-04", description: "YYYY-MM-DD" },
                      steps: { type: "number", example: 10240 },
                    },
                  },
                },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Past steps recorded.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        400: { $ref: "#/components/responses/ValidationError" },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/activity/{uid}": {
    get: {
      tags: ["User & Step Activity"],
      summary: "Get activity history",
      description: "Fetches historical daily step logs and streaks for the specified user.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "number", default: 30 },
          description: "Number of historical days to retrieve",
        },
      ],
      responses: {
        200: {
          description: "Activity log retrieved.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  data: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        date: { type: "string", example: "2026-09-04" },
                        steps: { type: "number", example: 11020 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/activity/stats/{uid}": {
    get: {
      tags: ["User & Step Activity"],
      summary: "Get lifetime fitness stats",
      description: "Computes all-time total distance, steps, active days, and best streak.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Lifetime stats calculated.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  stats: {
                    type: "object",
                    properties: {
                      totalSteps: { type: "number", example: 1250000 },
                      totalDistanceKm: { type: "number", example: 980.5 },
                      bestStreak: { type: "number", example: 28 },
                      currentStreak: { type: "number", example: 7 },
                    },
                  },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/user/is-admin/{uid}": {
    get: {
      tags: ["User & Step Activity"],
      summary: "Check admin status",
      description: "Verifies whether the current user has superadmin rights in the STRON platform.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Admin verification response.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  isAdmin: { type: "boolean", example: false },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/user/account/{uid}": {
    delete: {
      tags: ["User & Step Activity"],
      summary: "Delete user account (GDPR)",
      description: "Permanently deletes user account and personal data in compliance with privacy guidelines.",
      security: [{ BearerAuth: [] }],
      parameters: [
        {
          name: "uid",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Account queued for deletion.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
};

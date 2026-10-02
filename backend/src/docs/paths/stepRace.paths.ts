export const stepRacePaths = {
  "/api/step-race/stats/{userId}": {
    get: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Get PvP step race statistics",
      description: "Returns win/loss record, current win streak, rating, and match counts.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "User PvP stats.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  stats: {
                    type: "object",
                    properties: {
                      wins: { type: "number", example: 14 },
                      losses: { type: "number", example: 3 },
                      winRate: { type: "number", example: 82.35 },
                      rating: { type: "number", example: 1450 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/step-race/shadows": {
    get: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Get random shadow opponents",
      description: "Fetches asynchronous ghost/shadow profiles calibrated to user's average step pace.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "List of shadow opponents.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  shadows: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/step-race/create": {
    post: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Challenge opponent to 1v1 step battle",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["opponentId", "targetSteps"],
              properties: {
                opponentId: { type: "string", example: "usr_opponent456" },
                targetSteps: { type: "number", example: 5000 },
                durationMinutes: { type: "number", example: 60 },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Match created.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  raceId: { type: "string", example: "race_77a9b12c" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/step-race/active/{userId}": {
    get: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Get user's ongoing race match",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Active match details.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  race: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/step-race/update": {
    post: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Update live step race progress",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["raceId", "currentSteps"],
              properties: {
                raceId: { type: "string", example: "race_77a9b12c" },
                currentSteps: { type: "number", example: 3450 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Progress synced." },
      },
    },
  },
  "/api/step-race/complete": {
    post: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "Finalize completed step race",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["raceId"],
              properties: {
                raceId: { type: "string", example: "race_77a9b12c" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Race completed and winner determined." },
      },
    },
  },
  "/api/step-race/leaderboard": {
    get: {
      tags: ["Step Race - 1v1 PvP Battles"],
      summary: "PvP global leaderboard",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Top ranked PvP gladiators.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  leaderboard: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
};

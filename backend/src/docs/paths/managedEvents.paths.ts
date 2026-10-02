export const managedEventsPaths = {
  "/api/stron/events/catalog": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Explore event catalog",
      description: "Lists all public active tournaments, marathons, and challenges.",
      parameters: [
        { name: "category", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string", enum: ["UPCOMING", "ACTIVE", "COMPLETED"] } },
      ],
      responses: {
        200: {
          description: "Catalog of events.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  events: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/stron/events/home-feed-official": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Get official home feed events",
      description: "Returns curated STRON official marathons, daily Face-Offs, and King of the Hill battle arenas.",
      responses: {
        200: { description: "Home feed events returned." },
      },
    },
  },
  "/api/stron/events/mine": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "List user enrolled / created events",
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "User's enrolled tournaments." },
      },
    },
  },
  "/api/stron/events/marathon": {
    post: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Create virtual step marathon",
      description: "Creates a multi-day step marathon tournament with registration fee, prize pool, and milestones.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "targetSteps", "startDate", "endDate"],
              properties: {
                title: { type: "string", example: "Great Monsoon 50K Marathon" },
                description: { type: "string", example: "Cover 50,000 steps across 5 days to win exclusive medals!" },
                targetSteps: { type: "number", example: 50000 },
                entryFee: { type: "number", example: 199 },
                startDate: { type: "string", example: "2026-09-10T00:00:00.000Z" },
                endDate: { type: "string", example: "2026-09-15T23:59:59.000Z" },
                maxParticipants: { type: "number", example: 500 },
              },
            },
          },
        },
      },
      responses: {
        201: { description: "Marathon event draft created." },
      },
    },
  },
  "/api/stron/events/{key}": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Get event details by key",
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Event full details." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
    patch: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Update event details",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                description: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Event updated." },
      },
    },
  },
  "/api/stron/events/{key}/order": {
    post: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Generate ticket purchase order",
      description: "Initializes a Razorpay order to enroll in a paid tournament or marathon.",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                couponCode: { type: "string", example: "EARLYBIRD" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Razorpay order initialized.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  orderId: { type: "string", example: "order_K8dJ12f9kL3" },
                  amount: { type: "number", example: 19900 },
                  currency: { type: "string", example: "INR" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/stron/events/{key}/leaderboard": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Get tournament live leaderboard",
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "Rankings list.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  rankings: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rank: { type: "number", example: 1 },
                        username: { type: "string", example: "speed_demon" },
                        steps: { type: "number", example: 42100 },
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
  },
  "/api/stron/events/{key}/progress": {
    get: {
      tags: ["Managed Events - Tournaments & Challenges"],
      summary: "Get user progress in event",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: {
          description: "User step progress.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  completedSteps: { type: "number", example: 28500 },
                  targetSteps: { type: "number", example: 50000 },
                  percentage: { type: "number", example: 57 },
                },
              },
            },
          },
        },
      },
    },
  },
};

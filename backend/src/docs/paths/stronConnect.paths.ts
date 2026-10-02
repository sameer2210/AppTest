export const stronConnectPaths = {
  "/api/v1/connect/me": {
    get: {
      tags: ["STRON Connect"],
      summary: "Get my STRON Connect QR payload",
      description: "Generates dynamic QR code token representing the user's universal STRON fitness identity.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "QR payload generated.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  qrPayload: { type: "string", example: "stron://connect/user/usr_abc123?sig=49f8a..." },
                  validUntil: { type: "string", example: "2026-09-05T16:00:00.000Z" },
                },
              },
            },
          },
        },
        401: { $ref: "#/components/responses/Unauthorized" },
      },
    },
  },
  "/api/v1/connect/scan": {
    post: {
      tags: ["STRON Connect"],
      summary: "Scan STRON QR code",
      description: "Scans another user's or gym's QR code to verify membership, exchange contacts, or initiate check-in.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["qrPayload"],
              properties: {
                qrPayload: { type: "string", example: "stron://connect/user/usr_xyz789" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "QR scanned and verified.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  targetType: { type: "string", example: "gym_member" },
                  targetDetails: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/connect/checkin": {
    post: {
      tags: ["STRON Connect"],
      summary: "Direct gym check-in via Connect",
      description: "Validates member QR at gym gate/turnstile and records instant check-in timestamp.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["businessId"],
              properties: {
                businessId: { type: "string", example: "66d8f1e8a93b4c12ef001a2b" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Check-in successful." },
        403: { description: "No active membership found for this gym." },
      },
    },
  },
  "/api/v1/connect/scans": {
    get: {
      tags: ["STRON Connect"],
      summary: "List recent Connect scans",
      description: "Lists historical QR scans made or received by the user.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Scan history.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  scans: { type: "array", items: { type: "object" } },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/v1/connect/catalog": {
    get: {
      tags: ["STRON Connect"],
      summary: "Explore connected gyms & centers",
      description: "Lists STRON-connected gyms and wellness centers in the nearby area.",
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "Connected gym catalog." },
      },
    },
  },
};

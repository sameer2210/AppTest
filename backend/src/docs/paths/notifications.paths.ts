export const notificationsPaths = {
  "/api/notifications": {
    get: {
      tags: ["Push Notifications"],
      summary: "List user notifications inbox",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "List of notifications.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  notifications: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        _id: { type: "string", example: "66d8f612a93b4c12ef001a35" },
                        title: { type: "string", example: "Daily Step Goal Reached! 🎉" },
                        body: { type: "string", example: "Congratulations! You hit 10,000 steps today." },
                        isRead: { type: "boolean", example: false },
                        createdAt: { type: "string", example: "2026-09-05T12:30:00.000Z" },
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
  "/api/notifications/unread-count": {
    get: {
      tags: ["Push Notifications"],
      summary: "Get unread notification count",
      security: [{ BearerAuth: [] }],
      responses: {
        200: {
          description: "Unread count.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  count: { type: "number", example: 3 },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/notifications/register-token": {
    post: {
      tags: ["Push Notifications"],
      summary: "Register FCM push notification device token",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["token"],
              properties: {
                token: { type: "string", example: "fcm_token_sample_abc123..." },
                platform: { type: "string", enum: ["android", "ios"], example: "android" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "FCM token registered." },
      },
    },
  },
  "/api/notifications/read-all": {
    post: {
      tags: ["Push Notifications"],
      summary: "Mark all notifications as read",
      security: [{ BearerAuth: [] }],
      responses: {
        200: { description: "All marked as read." },
      },
    },
  },
  "/api/notifications/{id}/read": {
    post: {
      tags: ["Push Notifications"],
      summary: "Mark single notification as read",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Notification marked read." },
      },
    },
  },
  "/api/notifications/{id}": {
    delete: {
      tags: ["Push Notifications"],
      summary: "Dismiss notification",
      security: [{ BearerAuth: [] }],
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Notification dismissed." },
      },
    },
  },
};

export const opinionPaths = {
  "/api/opinion/current": {
    get: {
      tags: ["Opinion Hub"],
      summary: "Get current daily fitness opinion poll",
      description: "Returns today's active opinion question, available options, vote percentages, and like count.",
      responses: {
        200: {
          description: "Active opinion poll.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  opinion: {
                    type: "object",
                    properties: {
                      _id: { type: "string", example: "66d8f501a93b4c12ef001a30" },
                      question: { type: "string", example: "What is your primary workout time?" },
                      options: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            text: { type: "string", example: "Early Morning (5am - 8am)" },
                            votesCount: { type: "number", example: 342 },
                            percentage: { type: "number", example: 64 },
                          },
                        },
                      },
                      likesCount: { type: "number", example: 128 },
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
  "/api/opinion/vote": {
    post: {
      tags: ["Opinion Hub"],
      summary: "Cast vote in daily opinion poll",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["opinionId", "optionIndex"],
              properties: {
                opinionId: { type: "string", example: "66d8f501a93b4c12ef001a30" },
                optionIndex: { type: "number", example: 0 },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Vote recorded.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
      },
    },
  },
  "/api/opinion/like": {
    post: {
      tags: ["Opinion Hub"],
      summary: "Toggle like on daily opinion",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["opinionId"],
              properties: {
                opinionId: { type: "string", example: "66d8f501a93b4c12ef001a30" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Like toggled.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  isLiked: { type: "boolean", example: true },
                },
              },
            },
          },
        },
      },
    },
  },
};

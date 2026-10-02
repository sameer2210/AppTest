export const systemPaths = {
  "/api/health": {
    get: {
      tags: ["System & Remote Config"],
      summary: "Server health check",
      description: "Returns health status of the STRON production backend service.",
      responses: {
        200: {
          description: "Server is healthy.",
          content: {
            "text/plain": {
              schema: { type: "string", example: "StepWars Backend Alive Final Production🚀" },
            },
          },
        },
      },
    },
  },
  "/api/config/mobile": {
    get: {
      tags: ["System & Remote Config"],
      summary: "Get mobile app remote configurations",
      description: "Provides feature flags, dynamic app versions, maintenance flags, and support links.",
      responses: {
        200: {
          description: "Remote config values.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  config: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/api/upload/image": {
    post: {
      tags: ["Media & Cloud Storage"],
      summary: "Upload image to Cloudflare R2",
      description: "Uploads an image (PNG, JPG, WebP up to 10MB) to secure Cloudflare R2 bucket and returns public CDN URL.",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: {
                file: { type: "string", format: "binary", description: "Image file to upload" },
                folder: { type: "string", example: "profiles", description: "Target folder (profiles, gyms, banners)" },
              },
            },
          },
        },
      },
      responses: {
        200: {
          description: "Image uploaded successfully.",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  url: { type: "string", example: "https://r2.stron.app/profiles/usr_123.jpg" },
                  key: { type: "string", example: "profiles/usr_123.jpg" },
                },
              },
            },
          },
        },
        400: { description: "Invalid image format or file size exceeded." },
      },
    },
  },
  "/api/upload/public/{key}": {
    get: {
      tags: ["Media & Cloud Storage"],
      summary: "Serve public uploaded asset",
      parameters: [{ name: "key", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        200: { description: "Binary file stream." },
        404: { $ref: "#/components/responses/NotFound" },
      },
    },
  },
  "/api/feedback": {
    post: {
      tags: ["System & Remote Config"],
      summary: "Submit user feedback or issue report",
      security: [{ BearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["message"],
              properties: {
                message: { type: "string", example: "Loving the new Step Race PvP feature!" },
                rating: { type: "number", example: 5 },
                category: { type: "string", example: "feature_request" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Feedback recorded.",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StandardSuccess" },
            },
          },
        },
      },
    },
  },
  "/api/daily-reset": {
    post: {
      tags: ["System & Remote Config"],
      summary: "Trigger daily reset maintenance job",
      description: "Manually triggers daily midnight reset for testing streaks, settlements, and stats.",
      security: [{ BearerAuth: [] }, { InternalTokenAuth: [] }],
      responses: {
        200: { description: "Daily reset completed." },
      },
    },
  },
};

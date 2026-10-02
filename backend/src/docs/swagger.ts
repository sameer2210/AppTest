import type { Express, Request, Response } from "express";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import { openApiBase } from "./openapi.js";
import { allOpenApiPaths } from "./paths/index.js";
import { logger } from "../utils/logger.util.js";
import { requireSwaggerBasicAuth } from "../middleware/requireSwaggerBasicAuth.js";
import { getSwaggerDocsUser } from "../constants/infra.constants.js";

const jsdocOptions: swaggerJsdoc.Options = {
  definition: {
    ...openApiBase,
    paths: allOpenApiPaths,
  },
  apis: [
    "./src/features/**/*.route.ts",
    "./src/routes/*.route.ts",
  ],
};

/**
 * The consolidated OpenAPI 3.0 specification for STRON Backend.
 */
export const openApiSpecification = swaggerJsdoc(jsdocOptions);

const swaggerUiOptions: swaggerUi.SwaggerOptions = {
  customSiteTitle: "STRON API Documentation & Explorer",
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; border-bottom: 2px solid #38bdf8; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; }
    .swagger-ui .btn.authorize { background-color: #059669; color: #fff; border-color: #059669; }
    .swagger-ui .btn.authorize svg { fill: #fff; }
    .swagger-ui .opblock.opblock-post { border-color: #10b981; }
    .swagger-ui .opblock.opblock-get { border-color: #3b82f6; }
    .swagger-ui .opblock.opblock-patch { border-color: #8b5cf6; }
    .swagger-ui .opblock.opblock-delete { border-color: #ef4444; }
  `,
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: "none",
    defaultModelExpandDepth: 3,
    tryItOutEnabled: true,
  },
};

/**
 * Registers Swagger UI and OpenAPI JSON endpoints on the Express application.
 *
 * Mounted routes:
 * - \`/api-docs\` (Interactive Swagger UI)
 * - \`/docs\` (Friendly alias redirecting to \`/api-docs\`)
 * - \`/api-docs.json\` (Raw OpenAPI 3.0 specification JSON)
 * - \`/api/docs/swagger.json\` (Postman / tooling standard spec path)
 */
export const setupSwagger = (app: Express): void => {
  // Raw OpenAPI specification JSON endpoints
  const serveSpecJson = (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.send(openApiSpecification);
  };

  app.get("/api-docs.json", requireSwaggerBasicAuth, serveSpecJson);
  app.get("/api/docs/swagger.json", requireSwaggerBasicAuth, serveSpecJson);

  // Friendly alias redirect to /api-docs
  app.get("/docs", requireSwaggerBasicAuth, (_req: Request, res: Response) => {
    res.redirect("/api-docs");
  });

  // Swagger UI Explorer
  app.use(
    "/api-docs",
    requireSwaggerBasicAuth,
    swaggerUi.serve,
    swaggerUi.setup(openApiSpecification, swaggerUiOptions),
  );

  logger.info(
    `Swagger UI initialized at /api-docs (HTTP Basic user "${getSwaggerDocsUser()}")`,
  );
};

export default setupSwagger;

import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "@/app.js";
import {
  getSwaggerDocsPassword,
  getSwaggerDocsUser,
} from "@/constants/infra.constants.js";

const docsAuth = { user: getSwaggerDocsUser(), pass: getSwaggerDocsPassword() };

describe("docs: swagger and openapi endpoints", () => {
  it("rejects Swagger UI and OpenAPI JSON without HTTP Basic auth", async () => {
    const spec = await request(app).get("/api-docs.json");
    expect(spec.status).toBe(401);
    expect(spec.headers["www-authenticate"]).toMatch(/basic/i);

    const ui = await request(app).get("/api-docs/");
    expect(ui.status).toBe(401);
  });

  it("GET /api-docs.json returns valid OpenAPI 3.0 specification", async () => {
    const res = await request(app)
      .get("/api-docs.json")
      .auth(docsAuth.user, docsAuth.pass);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toContain("STRON");
    expect(res.body.components.securitySchemes.BearerAuth).toBeDefined();
    expect(res.body.components.securitySchemes.BearerAuth.type).toBe("http");
    expect(res.body.components.securitySchemes.BearerAuth.scheme).toBe("bearer");
    expect(res.body.paths).toBeDefined();

    // Verify key paths exist
    expect(res.body.paths["/api/auth/send-otp"]).toBeDefined();
    expect(res.body.paths["/api/auth/verify-otp"]).toBeDefined();
    expect(res.body.paths["/api/user/sync-steps"]).toBeDefined();
    expect(res.body.paths["/api/v1/business"]).toBeDefined();
    expect(res.body.paths["/api/v1/members"]).toBeDefined();
    expect(res.body.paths["/api/v1/connect/me"]).toBeDefined();
    expect(res.body.paths["/api/stron/events/catalog"]).toBeDefined();
    expect(res.body.paths["/api/step-race/create"]).toBeDefined();
    expect(res.body.paths["/api/opinion/current"]).toBeDefined();
    expect(res.body.paths["/api/notifications"]).toBeDefined();
    expect(res.body.paths["/api/payment/order"]).toBeDefined();
    expect(res.body.paths["/api/health"]).toBeDefined();
  });

  it("GET /api/docs/swagger.json returns identical spec as /api-docs.json", async () => {
    const res = await request(app)
      .get("/api/docs/swagger.json")
      .auth(docsAuth.user, docsAuth.pass);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body.openapi).toBe("3.0.3");
    expect(res.body.info.title).toContain("STRON");
  });

  it("GET /docs redirects to /api-docs", async () => {
    const res = await request(app).get("/docs").auth(docsAuth.user, docsAuth.pass);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/api-docs");
  });

  it("GET /api-docs serves Swagger UI HTML", async () => {
    const res = await request(app).get("/api-docs/").auth(docsAuth.user, docsAuth.pass);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/html/);
    expect(res.text).toContain("swagger-ui");
  });
});

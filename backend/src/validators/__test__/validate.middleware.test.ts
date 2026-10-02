import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateRequest } from "../../middleware/validate.middleware.js";

describe("validateRequest middleware", () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  it("passes validation and calls next() when valid", async () => {
    const middleware = validateRequest({
      params: z.object({ id: z.string() }),
      query: z.object({ page: z.coerce.number() }),
      body: z.object({ name: z.string() }),
    });

    const req = {
      params: { id: "123", extraParam: "will-be-cleaned" },
      query: { page: "2" },
      body: { name: "John" },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.params.id).toBe("123");
    expect(req.params.extraParam).toBeUndefined();
    expect(req.query.page).toBe(2);
    expect(req.body.name).toBe("John");
  });

  it("defines property on req when req.params or req.query is not pre-existing object", async () => {
    const middleware = validateRequest({
      params: z.unknown().transform(() => ({ id: "param-1" })),
      query: z.unknown().transform(() => ({ q: "search" })),
    });

    const req = {
      params: "primitive-string-params",
      query: "primitive-string-query",
    } as unknown as Request;

    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.params).toEqual({ id: "param-1" });
    expect(req.query).toEqual({ q: "search" });
  });

  it("returns 400 validation_error on ZodError with issue details", async () => {
    const middleware = validateRequest({
      body: z.object({ email: z.string().email("Invalid email format") }),
    });

    const req = {
      body: { email: "not-an-email" },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: "validation_error",
        message: "Invalid email format",
      }),
    );
  });

  it("returns fallback message on ZodError without issue message", async () => {
    const customZodSchema = z.custom(() => false, { message: "" });
    const middleware = validateRequest({
      body: customZodSchema,
    });

    const req = { body: {} } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid request parameters.",
      }),
    );
  });

  it("returns 400 when a non-Zod Error is thrown during parsing", async () => {
    const badSchema = {
      parseAsync: vi.fn().mockRejectedValue(new Error("Database connection lost")),
    };

    const middleware = validateRequest({
      body: badSchema as unknown as z.ZodTypeAny,
    });

    const req = { body: {} } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: "validation_error",
      message: "Database connection lost",
    });
  });

  it("returns 400 with 'Invalid request.' when a non-Error is thrown", async () => {
    const badSchema = {
      parseAsync: vi.fn().mockRejectedValue("string exception"),
    };

    const middleware = validateRequest({
      body: badSchema as unknown as z.ZodTypeAny,
    });

    const req = { body: {} } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    await middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      code: "validation_error",
      message: "Invalid request.",
    });
  });
});

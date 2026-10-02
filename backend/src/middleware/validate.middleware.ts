import type { Request, RequestHandler } from "express";
import { ZodError, type ZodTypeAny } from "zod";

export type RequestValidationSchemas = {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
};

type ParsedRequestKey = "params" | "query" | "body";

/**
 * Minimal request validation middleware using Zod.
 * Express 5 exposes req.query / req.params as getter-only — mutate in place
 * (or redefine) instead of replacing the property.
 */
const applyParsed = (
  req: Request,
  key: ParsedRequestKey,
  parsed: Record<string, unknown>,
): void => {
  const current = req[key];
  if (current && typeof current === "object") {
    for (const existing of Object.keys(current)) {
      if (!Object.prototype.hasOwnProperty.call(parsed, existing)) {
        delete (current as Record<string, unknown>)[existing];
      }
    }
    Object.assign(current, parsed);
    return;
  }

  Object.defineProperty(req, key, {
    value: parsed,
    writable: true,
    enumerable: true,
    configurable: true,
  });
};

export const validateRequest = (
  schemas: RequestValidationSchemas,
): RequestHandler => {
  return async (req, res, next) => {
    try {
      if (schemas.params && req.params) {
        applyParsed(
          req,
          "params",
          (await schemas.params.parseAsync(req.params)) as Record<
            string,
            unknown
          >,
        );
      }
      if (schemas.query && req.query) {
        applyParsed(
          req,
          "query",
          (await schemas.query.parseAsync(req.query)) as Record<string, unknown>,
        );
      }
      if (schemas.body && req.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          success: false,
          code: "validation_error",
          message: err.issues[0]?.message || "Invalid request parameters.",
          details: err.issues,
        });
      }
      const message = err instanceof Error ? err.message : "Invalid request.";
      return res.status(400).json({
        success: false,
        code: "validation_error",
        message,
      });
    }
  };
};

export default validateRequest;

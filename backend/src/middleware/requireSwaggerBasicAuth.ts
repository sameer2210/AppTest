import type { RequestHandler } from "express";
import { getSwaggerDocsPassword, getSwaggerDocsUser } from "../constants/infra.constants.js";

const unauthorized: RequestHandler = (_req, res) => {
  res.setHeader("WWW-Authenticate", 'Basic realm="STRON API Docs"');
  return res.status(401).send("Authentication required.");
};

/** HTTP Basic auth for Swagger UI and OpenAPI JSON. */
export const requireSwaggerBasicAuth: RequestHandler = (req, res, next) => {
  const header = String(req.header("authorization") || "");
  const match = /^Basic\s+(.+)$/i.exec(header);
  if (!match) return unauthorized(req, res, next);

  let decoded = "";
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return unauthorized(req, res, next);
  }

  const separator = decoded.indexOf(":");
  const user = separator >= 0 ? decoded.slice(0, separator) : decoded;
  const password = separator >= 0 ? decoded.slice(separator + 1) : "";
  if (user !== getSwaggerDocsUser() || password !== getSwaggerDocsPassword()) {
    return unauthorized(req, res, next);
  }
  return next();
};

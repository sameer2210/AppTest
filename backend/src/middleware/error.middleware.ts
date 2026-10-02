import type { ErrorRequestHandler } from "express";
import { sendError } from "../utils/stronHttpError.util.js";

/** Standard centralized error middleware matching STRON project patterns. */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  return sendError(res, err);
};

export default errorHandler;

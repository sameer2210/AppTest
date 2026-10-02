import type { Request, RequestHandler, Response } from "express";
import type { Types } from "mongoose";

/** Gym business context attached by business.middleware. */
export type BusinessContext = {
  _id: Types.ObjectId;
  ownerId: string;
  status?: string;
  name?: string;
  [key: string]: unknown;
};

export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data?: T;
  message?: string;
  [key: string]: unknown;
};

export type ApiErrorResponse = {
  success: false;
  code?: string;
  message?: string;
  error?: string;
  details?: unknown;
  [key: string]: unknown;
};

export type TypedRequestHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> = RequestHandler<P, ResBody | ApiErrorResponse, ReqBody, ReqQuery>;

export type ControllerHandler = RequestHandler;

/** Coerce Express route param (string | string[]) to a single string. */
export const routeParam = (value: string | string[] | undefined): string =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

/** Coerce query string param to string. */
export const queryString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value[0] != null ? String(value[0]) : undefined;
  }
  return String(value);
};

/** Coerce query string param to number. */
export const queryNumber = (value: unknown, fallback?: number): number | undefined => {
  const s = queryString(value);
  if (s == null || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

/** Coerce request header to a single string. */
export const headerString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

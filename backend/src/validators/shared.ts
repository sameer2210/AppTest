import { z } from "zod";
import mongoose from "mongoose";

export const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const objectIdString = (label = "ID") =>
  z
    .string()
    .trim()
    .refine((val) => mongoose.Types.ObjectId.isValid(val) && objectIdRegex.test(val), {
      message: `Invalid ${label}. Must be a 24-character hexadecimal string.`,
    });

export const optionalObjectIdString = (label = "ID") =>
  z
    .string()
    .trim()
    .refine((val) => !val || (mongoose.Types.ObjectId.isValid(val) && objectIdRegex.test(val)), {
      message: `Invalid ${label}. Must be a 24-character hexadecimal string.`,
    })
    .optional();

export const nullableOptionalObjectIdString = (label = "ID") =>
  z
    .string()
    .trim()
    .refine((val) => !val || (mongoose.Types.ObjectId.isValid(val) && objectIdRegex.test(val)), {
      message: `Invalid ${label}. Must be a 24-character hexadecimal string.`,
    })
    .nullable()
    .optional();

export const paginationPageString = (defaultVal = 1) =>
  z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val || String(defaultVal), 10);
      return isNaN(parsed) || parsed < 1 ? defaultVal : parsed;
    });

export const paginationLimitString = (defaultVal = 20, maxVal = 100) =>
  z
    .string()
    .optional()
    .transform((val) => {
      const parsed = parseInt(val || String(defaultVal), 10);
      if (isNaN(parsed) || parsed < 1) return defaultVal;
      return Math.min(parsed, maxVal);
    });

export const ymdDateString = () =>
  z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const nullableDateOrYmdString = () =>
  z
    .union([
      z.string().datetime(),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      z.date(),
    ])
    .nullable()
    .optional();

export const sortOrderEnum = () =>
  z
    .enum(["asc", "desc", "1", "-1", "ASC", "DESC"])
    .optional()
    .default("desc");

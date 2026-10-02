import { z } from "zod";
import {
  objectIdString,
  optionalObjectIdString,
  paginationLimitString,
  paginationPageString,
  ymdDateString,
} from "../../../validators/shared.js";

export const recordAttendanceSchema = {
  body: z.object({
    memberId: objectIdString("member ID"),
    attendanceDate: ymdDateString(),
    source: z.enum(["MANUAL", "QR", "SYSTEM"]).optional().default("MANUAL"),
    checkedInAt: z.string().datetime().or(z.date()).optional(),
    checkedOutAt: z.string().datetime().or(z.date()).nullable().optional(),
    inTime: z.string().max(30).nullable().optional(),
    outTime: z.string().max(30).nullable().optional(),
  }),
};

export const attendanceQuerySchema = {
  query: z.object({
    page: paginationPageString(),
    limit: paginationLimitString(),
    memberId: optionalObjectIdString(),
    date: ymdDateString().optional(),
    from: ymdDateString().optional(),
    to: ymdDateString().optional(),
  }),
};

export const memberAttendanceParamSchema = {
  params: z.object({
    memberId: objectIdString("member ID"),
  }),
};

export type RecordAttendanceBody = z.infer<typeof recordAttendanceSchema.body>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema.query>;
export type MemberAttendanceParam = z.infer<typeof memberAttendanceParamSchema.params>;

export default {
  recordAttendanceSchema,
  attendanceQuerySchema,
  memberAttendanceParamSchema,
};

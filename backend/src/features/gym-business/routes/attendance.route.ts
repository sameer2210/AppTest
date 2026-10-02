import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  recordAttendanceSchema,
  attendanceQuerySchema,
  memberAttendanceParamSchema,
} from "../validators/attendance.validator.js";
import {
  recordAttendance,
  listAttendance,
  getMemberAttendanceHistory,
} from "../controllers/attendance.controller.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  validateRequest(recordAttendanceSchema),
  requireBusiness,
  recordAttendance,
);

router.get(
  "/",
  requireAuth,
  validateRequest(attendanceQuerySchema),
  requireBusiness,
  listAttendance,
);

router.get(
  "/member/:memberId",
  requireAuth,
  validateRequest(memberAttendanceParamSchema),
  requireBusiness,
  getMemberAttendanceHistory,
);

export default router;

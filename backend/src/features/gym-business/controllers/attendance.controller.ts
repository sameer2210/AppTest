import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams } from "../../../utils/pagination.js";
import attendanceService from "../services/attendance.service.js";

export const recordAttendance = async (req: Request, res: Response) => {
  try {
    const data = await attendanceService.recordAttendance({
      businessId: req.businessId,
      markedBy: req.user!.uid,
      attendanceData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listAttendance = async (req: Request, res: Response) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const result = await attendanceService.listAttendance({
      businessId: req.businessId,
      queryParams: {
        ...req.query,
        ...paginationParams,
      },
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const result = await attendanceService.getMemberAttendanceHistory({
      businessId: req.businessId,
      memberId: req.params.memberId,
      queryParams: {
        ...req.query,
        ...paginationParams,
      },
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  recordAttendance,
  listAttendance,
  getMemberAttendanceHistory,
};

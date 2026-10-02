import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams, buildPaginationMeta } from "../../../utils/pagination.js";
import memberService from "../services/member.service.js";

export const listMembers = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const { page, limit } = getPaginationParams(req.query);
      return res.status(200).json({
        success: true,
        members: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }
    const paginationParams = getPaginationParams(req.query);
    const result = await memberService.listMembers({
      businessId: req.businessId,
      paginationParams,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getJoinLink = async (req: Request, res: Response) => {
  try {
    const data = await memberService.getJoinLink({
      businessId: req.businessId,
      business: req.business,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listDirectoryUsers = async (req: Request, res: Response) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const result = await memberService.listDirectoryUsers({ paginationParams });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberById = async (req: Request, res: Response) => {
  try {
    const data = await memberService.getMemberById({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createMember = async (req: Request, res: Response) => {
  try {
    const data = await memberService.createMember({
      businessId: req.businessId,
      memberData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateMember = async (req: Request, res: Response) => {
  try {
    const data = await memberService.updateMember({
      businessId: req.businessId,
      memberId: req.params.memberId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteMember = async (req: Request, res: Response) => {
  try {
    const data = await memberService.deleteMember({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberValiditySummary = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      return res.status(200).json({
        success: true,
        data: {
          activeCount: 0,
          expiringSoonCount: 0,
          expiredCount: 0,
          pendingPaymentCount: 0,
        },
      });
    }
    const data = await memberService.getMemberValiditySummary({
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberMembership = async (req: Request, res: Response) => {
  try {
    const data = await memberService.getMemberMembership({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberPayments = async (req: Request, res: Response) => {
  try {
    const data = await memberService.getMemberPayments({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMemberAttendance = async (req: Request, res: Response) => {
  try {
    const data = await memberService.getMemberAttendance({
      businessId: req.businessId,
      memberId: req.params.memberId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const sendPaymentReminder = async (req: Request, res: Response) => {
  try {
    const result = await memberService.sendPaymentReminder({
      businessId: req.businessId,
      memberId: req.params.memberId,
      reminderData: req.body,
    });
    return res.status(200).json({
      success: true,
      message: result.message || "Payment reminder sent successfully.",
      data: "data" in result ? (result as { data: unknown }).data : result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const extendMemberValidity = async (req: Request, res: Response) => {
  try {
    const data = await memberService.extendMemberValidity({
      businessId: req.businessId,
      memberId: req.params.memberId,
      additionalDays: req.body?.additionalDays,
      reason: req.body?.reason,
      actorUid: req.user?.uid,
    });
    return res.status(200).json({
      success: true,
      message: `Validity extended by ${data.additionalDays} days.`,
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export const blacklistMember = async (req: Request, res: Response) => {
  try {
    const data = await memberService.blacklistMember({
      businessId: req.businessId,
      memberId: req.params.memberId,
      reason: req.body?.reason,
      actorUid: req.user?.uid,
    });
    return res.status(200).json({
      success: true,
      message: "Member blacklisted.",
      data,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listMembers,
  getJoinLink,
  listDirectoryUsers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberValiditySummary,
  getMemberMembership,
  getMemberPayments,
  getMemberAttendance,
  sendPaymentReminder,
  extendMemberValidity,
  blacklistMember,
};

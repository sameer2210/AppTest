import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams } from "../../../utils/pagination.js";
import membershipService from "../services/membership.service.js";

export const listMemberships = async (req: Request, res: Response) => {
  try {
    const paginationParams = {
      ...getPaginationParams(req.query),
      memberId: req.query.memberId || "",
      planId: req.query.planId || "",
    };
    const result = await membershipService.listMemberships({
      businessId: req.businessId,
      paginationParams,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMembershipById = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.getMembershipById({
      businessId: req.businessId,
      membershipId: req.params.membershipId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createMembershipForMember = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.createMembershipForMember({
      businessId: req.businessId,
      memberId: req.params.memberId,
      membershipData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateMembership = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.updateMembership({
      businessId: req.businessId,
      membershipId: req.params.membershipId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const cancelMembership = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.cancelMembership({
      businessId: req.businessId,
      userId: req.user?.uid,
      membershipId: req.params.membershipId,
      reason: req.body?.reason,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const renewMembership = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.renewMembership({
      businessId: req.businessId,
      membershipId: req.params.membershipId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const purchaseMembership = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.purchaseMembership({
      userId: req.user?.uid,
      userAuth: req.user,
      purchaseData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getMyPurchasedPlans = async (req: Request, res: Response) => {
  try {
    const result = await membershipService.getMyPurchasedPlans({
      userId: req.user?.uid,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const setMembershipAutoRenew = async (req: Request, res: Response) => {
  try {
    const data = await membershipService.setMembershipAutoRenew({
      businessId: req.businessId,
      userId: req.user?.uid,
      membershipId: req.params.membershipId,
      autoRenew: req.body?.autoRenew,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listMemberships,
  getMembershipById,
  createMembershipForMember,
  updateMembership,
  cancelMembership,
  renewMembership,
  purchaseMembership,
  getMyPurchasedPlans,
  setMembershipAutoRenew,
};

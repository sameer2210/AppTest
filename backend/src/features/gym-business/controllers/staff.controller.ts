import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import staffService from "../services/staff.service.js";

export const listStaff = async (req: Request, res: Response) => {
  try {
    const data = await staffService.listStaff({
      businessId: req.businessId,
      status: req.query.status,
      tab: req.query.tab,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const proposePartnership = async (req: Request, res: Response) => {
  try {
    const data = await staffService.proposePartnership({
      businessId: req.businessId,
      ...req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const applyAsTrainer = async (req: Request, res: Response) => {
  try {
    const data = await staffService.applyAsTrainer({
      userId: req.user!.uid,
      ...req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateProposal = async (req: Request, res: Response) => {
  try {
    const data = await staffService.updateProposal({
      businessId: req.businessId,
      staffId: req.params.staffId,
      splitPercent: req.body.splitPercent,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const respondToProposal = async (req: Request, res: Response) => {
  try {
    const data = await staffService.respondToProposal({
      staffId: req.params.staffId,
      userId: req.user!.uid,
      action: req.body.action,
      counterOfferPercent: req.body.counterOfferPercent,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const removeStaff = async (req: Request, res: Response) => {
  try {
    const data = await staffService.removeStaff({
      businessId: req.businessId,
      staffId: req.params.staffId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getInviteLink = async (req: Request, res: Response) => {
  try {
    const data = await staffService.getInviteLink({
      businessId: req.businessId,
      business: req.business,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const setPlanTrainers = async (req: Request, res: Response) => {
  try {
    const data = await staffService.setPlanTrainers({
      businessId: req.businessId,
      planId: req.params.planId,
      trainerIds: req.body.trainerIds,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listStaff,
  proposePartnership,
  applyAsTrainer,
  updateProposal,
  respondToProposal,
  removeStaff,
  getInviteLink,
  setPlanTrainers,
};

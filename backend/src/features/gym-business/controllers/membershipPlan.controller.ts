import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams, buildPaginationMeta } from "../../../utils/pagination.js";
import membershipPlanService from "../services/membershipPlan.service.js";

export const listPlans = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const { page, limit } = getPaginationParams(req.query);
      return res.status(200).json({
        success: true,
        plans: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }
    const paginationParams = getPaginationParams(req.query);
    const result = await membershipPlanService.listPlans({
      businessId: req.businessId,
      paginationParams,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getPlanById = async (req: Request, res: Response) => {
  try {
    const data = await membershipPlanService.getPlanById({
      businessId: req.businessId,
      planId: req.params.planId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createPlan = async (req: Request, res: Response) => {
  try {
    const data = await membershipPlanService.createPlan({
      businessId: req.businessId,
      planData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const data = await membershipPlanService.updatePlan({
      businessId: req.businessId,
      planId: req.params.planId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const data = await membershipPlanService.deletePlan({
      businessId: req.businessId,
      planId: req.params.planId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};

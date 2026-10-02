import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import businessService from "../services/business.service.js";
import businessHomeService from "../services/businessHome.service.js";

export const getBusinessProfile = async (req: Request, res: Response) => {
  try {
    if (req.business) {
      return res.status(200).json({ success: true, data: req.business });
    }

    if (!req.businessId) {
      const data = await businessService.getBusinessProfileOptional({
        ownerId: req.user!.uid,
      });
      return res.status(200).json({ success: true, data });
    }

    const data = await businessService.getBusinessProfile({
      ownerId: req.user!.uid,
      businessId: req.businessId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createBusinessProfile = async (req: Request, res: Response) => {
  try {
    const data = await businessService.createBusinessProfile({
      ownerId: req.user!.uid,
      businessData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateBusinessProfile = async (req: Request, res: Response) => {
  try {
    const data = await businessService.updateBusinessProfile({
      businessId: req.businessId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getOwnerPlanDashboard = async (req: Request, res: Response) => {
  try {
    const data = await businessHomeService.getOwnerPlanDashboard({
      ownerId: req.user!.uid,
      businessId: req.businessId,
      business: req.business,
      queryParams: req.query,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getBusinessHomeSummary = async (req: Request, res: Response) => {
  try {
    const data = await businessHomeService.getBusinessHomeSummary({
      businessId: req.businessId,
      ownerId: req.user!.uid,
      business: req.business,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getBusinessProfile,
  createBusinessProfile,
  updateBusinessProfile,
  getBusinessHomeSummary,
  getOwnerPlanDashboard,
};

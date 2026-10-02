import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import brandPageService from "../services/brandPage.service.js";

export const getPublicBrandPage = async (req: Request, res: Response) => {
  try {
    const data = await brandPageService.getPublicBrandPage({
      slug: req.params.slug,
      viewerUid: req.user?.uid,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const recordBrandPageVisit = async (req: Request, res: Response) => {
  try {
    const data = await brandPageService.recordVisit({
      slug: req.params.slug,
      visitorHash: req.body?.visitorHash,
      viewerUid: req.user?.uid,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getOwnerBrandPage = async (req: Request, res: Response) => {
  try {
    const data = await brandPageService.getOwnerBrandPage({
      businessId: req.businessId,
      business: req.business,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getPublicBrandPage,
  recordBrandPageVisit,
  getOwnerBrandPage,
};

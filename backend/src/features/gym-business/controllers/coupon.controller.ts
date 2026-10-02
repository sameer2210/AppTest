import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams, buildPaginationMeta } from "../../../utils/pagination.js";
import couponService from "../services/coupon.service.js";

export const listCoupons = async (req: Request, res: Response) => {
  try {
    if (!req.businessId) {
      const { page, limit } = getPaginationParams(req.query);
      return res.status(200).json({
        success: true,
        coupons: [],
        pagination: buildPaginationMeta(0, page, limit),
      });
    }
    const paginationParams = getPaginationParams(req.query);
    const result = await couponService.listCoupons({
      businessId: req.businessId,
      paginationParams,
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export const getCouponById = async (req: Request, res: Response) => {
  try {
    const data = await couponService.getCouponById({
      businessId: req.businessId,
      couponId: req.params.couponId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const createCoupon = async (req: Request, res: Response) => {
  try {
    const data = await couponService.createCoupon({
      businessId: req.businessId,
      couponData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateCoupon = async (req: Request, res: Response) => {
  try {
    const data = await couponService.updateCoupon({
      businessId: req.businessId,
      couponId: req.params.couponId,
      updateData: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const deleteCoupon = async (req: Request, res: Response) => {
  try {
    const data = await couponService.deleteCoupon({
      businessId: req.businessId,
      couponId: req.params.couponId,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, planId, orderAmount } = req.body;
    const data = await couponService.validateCoupon({
      businessId: req.businessId,
      code,
      planId,
      orderAmount,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
};

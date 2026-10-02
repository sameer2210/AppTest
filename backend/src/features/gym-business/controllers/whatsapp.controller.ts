import { sendError } from "../../../utils/stronHttpError.util.js";
import type { Request, Response } from "express";
import { getPaginationParams } from "../../../utils/pagination.js";
import whatsappService from "../services/whatsapp.service.js";

export const getWallet = async (req: Request, res: Response) => {
  try {
    const data = await whatsappService.getWallet({ businessId: req.businessId });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listReminders = async (req: Request, res: Response) => {
  try {
    const data = await whatsappService.listReminderConfigs({ businessId: req.businessId });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const updateReminder = async (req: Request, res: Response) => {
  try {
    const data = await whatsappService.updateReminderConfig({
      businessId: req.businessId,
      type: req.params.type,
      patch: req.body,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const previewReminderRecipients = async (req: Request, res: Response) => {
  try {
    const data = await whatsappService.previewRecipients({
      businessId: req.businessId,
      type: req.params.type,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const sendBroadcast = async (req: Request, res: Response) => {
  try {
    const data = await whatsappService.sendBroadcast({
      businessId: req.businessId,
      memberIds: req.body.memberIds,
      message: req.body.message,
    });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};

export const listMessages = async (req: Request, res: Response) => {
  try {
    const paginationParams = getPaginationParams(req.query);
    const result = await whatsappService.listMessages({
      businessId: req.businessId,
      paginationParams: { ...paginationParams, type: req.query.type },
    });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};

export default {
  getWallet,
  listReminders,
  updateReminder,
  previewReminderRecipients,
  sendBroadcast,
  listMessages,
};

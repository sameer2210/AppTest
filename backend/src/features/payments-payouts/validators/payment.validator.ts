import { z } from "zod";

export const createPaymentOrderSchema = {
  body: z.object({
    eventKey: z.string().optional(),
    eventId: z.string().optional(),
    planId: z.string().optional().nullable(),
    currentStepCount: z.coerce.number().optional().nullable(),
    couponCode: z.string().optional().nullable(),
  }),
};

export const verifyPaymentSchema = {
  body: z.object({
    razorpay_order_id: z.string().min(1, "razorpay_order_id is required"),
    razorpay_payment_id: z.string().min(1, "razorpay_payment_id is required"),
    razorpay_signature: z.string().min(1, "razorpay_signature is required"),
  }),
};

export const refundRazorpayPaymentSchema = {
  body: z.object({
    razorpayOrderId: z.string().min(1, "razorpayOrderId is required"),
    amount: z.coerce.number().positive().optional(),
  }),
};

export const listPaymentHistoryQuerySchema = {
  query: z.object({
    limit: z.coerce.number().positive().max(100).optional(),
  }),
};


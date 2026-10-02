import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  createPaymentOrder,
  verifyPayment,
  handleRazorpayWebhook,
  getPaymentHistory,
  refundRazorpayPayment,
} from "../controllers/razorpay.controller.js";
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
  refundRazorpayPaymentSchema,
  listPaymentHistoryQuerySchema,
} from "../validators/payment.validator.js";

const router = express.Router();

router.post("/order", requireAuth, validateRequest(createPaymentOrderSchema), createPaymentOrder);
router.post("/verify", requireAuth, validateRequest(verifyPaymentSchema), verifyPayment);
router.get(
  "/history",
  requireAuth,
  validateRequest(listPaymentHistoryQuerySchema),
  getPaymentHistory,
);
router.post("/refund", requireAuth, validateRequest(refundRazorpayPaymentSchema), refundRazorpayPayment);
// Webhook uses req.rawBody captured in app.js bodyParser verify callback.
router.post("/webhook", handleRazorpayWebhook);

export default router;

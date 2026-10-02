import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  paymentIdParamSchema,
  memberPaymentSummaryParamSchema,
  createManualPaymentSchema,
  createOnlinePaymentOrderSchema,
  verifyOnlinePaymentSchema,
  listPaymentsQuerySchema,
} from "../validators/gymPayment.validator.js";
import {
  listPayments,
  getPaymentById,
  getMemberPaymentSummaries,
  getMemberPaymentSummary,
  recordManualPayment,
  createOnlinePaymentOrder,
  verifyOnlinePayment,
  handleRazorpayWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/webhook/razorpay", handleRazorpayWebhook);

router.post(
  "/manual",
  requireAuth,
  validateRequest(createManualPaymentSchema),
  requireBusiness,
  recordManualPayment,
);

router.post(
  "/online/create",
  requireAuth,
  validateRequest(createOnlinePaymentOrderSchema),
  optionalBusiness,
  createOnlinePaymentOrder,
);
router.post(
  "/online/order",
  requireAuth,
  validateRequest(createOnlinePaymentOrderSchema),
  optionalBusiness,
  createOnlinePaymentOrder,
);
router.post(
  "/online/verify",
  requireAuth,
  validateRequest(verifyOnlinePaymentSchema),
  optionalBusiness,
  verifyOnlinePayment,
);

router.get(
  "/summaries",
  requireAuth,
  optionalBusiness,
  getMemberPaymentSummaries,
);

router.get(
  "/summaries/:memberId",
  requireAuth,
  validateRequest(memberPaymentSummaryParamSchema),
  requireBusiness,
  getMemberPaymentSummary,
);

router.get(
  "/",
  requireAuth,
  validateRequest(listPaymentsQuerySchema),
  optionalBusiness,
  listPayments,
);
router.get(
  "/:paymentId",
  requireAuth,
  validateRequest(paymentIdParamSchema),
  requireBusiness,
  getPaymentById,
);

export default router;

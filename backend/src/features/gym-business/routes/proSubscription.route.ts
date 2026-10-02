import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  subscribeProSchema,
  cancelProSchema,
  syncRevenueCatSchema,
  activateTrialSchema,
  createRazorpayOrderSchema,
  verifyRazorpayPaymentSchema,
  pauseProSchema,
  resumeProSchema,
} from "../validators/proSubscription.validator.js";
import {
  getSubscription,
  getEntitlementFeatures,
  subscribe,
  cancelSubscription,
  pauseSubscription,
  resumeSubscription,
  handleSubscriptionWebhook,
  handleRevenueCatWebhook,
  syncRevenueCat,
  checkTrialEligibility,
  activateFreeTrial,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from "../controllers/proSubscription.controller.js";

const router = Router();

// Platform subscription webhooks
router.post("/webhook/razorpay", handleSubscriptionWebhook);
router.post("/webhook/revenuecat", handleRevenueCatWebhook);

// Subscription details & entitlements
router.get("/", requireAuth, optionalBusiness, getSubscription);
router.get("/features", requireAuth, optionalBusiness, getEntitlementFeatures);

// 14-day Free Trial endpoints
router.get("/trial/eligibility", requireAuth, optionalBusiness, checkTrialEligibility);
router.post(
  "/trial/activate",
  requireAuth,
  validateRequest(activateTrialSchema),
  optionalBusiness,
  activateFreeTrial,
);

// Razorpay checkout endpoints
router.post(
  "/razorpay/order",
  requireAuth,
  validateRequest(createRazorpayOrderSchema),
  optionalBusiness,
  createRazorpayOrder,
);
router.post(
  "/razorpay/verify",
  requireAuth,
  validateRequest(verifyRazorpayPaymentSchema),
  optionalBusiness,
  verifyRazorpayPayment,
);

// Direct RevenueCat client receipt sync
router.post(
  "/sync-revenuecat",
  requireAuth,
  validateRequest(syncRevenueCatSchema),
  optionalBusiness,
  syncRevenueCat,
);

// Subscription lifecycle
router.post(
  "/subscribe",
  requireAuth,
  validateRequest(subscribeProSchema),
  optionalBusiness,
  subscribe,
);
router.post(
  "/pause",
  requireAuth,
  validateRequest(pauseProSchema),
  optionalBusiness,
  pauseSubscription,
);
router.post(
  "/resume",
  requireAuth,
  validateRequest(resumeProSchema),
  optionalBusiness,
  resumeSubscription,
);
router.post(
  "/cancel",
  requireAuth,
  validateRequest(cancelProSchema),
  optionalBusiness,
  cancelSubscription,
);

export default router;

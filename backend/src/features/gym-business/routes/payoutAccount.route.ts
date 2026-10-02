import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import {
  optionalBusiness,
  resolveOrCreateBusiness,
} from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  createPayoutAccountSchema,
  updatePayoutAccountSchema,
  verifyPayoutAccountSchema,
} from "../validators/payoutAccount.validator.js";
import {
  getPayoutAccount,
  createPayoutAccount,
  updatePayoutAccount,
  verifyPayoutAccount,
  handlePayoutWebhook,
  saveBankDetailsOnly,
} from "../controllers/payoutAccount.controller.js";

const router = Router();

// Webhook endpoint (verified via HMAC-SHA256 signature in service)
router.post("/webhook", handlePayoutWebhook);

router.get("/", requireAuth, optionalBusiness, getPayoutAccount);
router.post(
  "/",
  requireAuth,
  validateRequest(createPayoutAccountSchema),
  resolveOrCreateBusiness,
  createPayoutAccount,
);
router.patch(
  "/",
  requireAuth,
  validateRequest(updatePayoutAccountSchema),
  resolveOrCreateBusiness,
  updatePayoutAccount,
);
router.post(
  "/verify",
  requireAuth,
  validateRequest(verifyPayoutAccountSchema),
  resolveOrCreateBusiness,
  verifyPayoutAccount,
);

// Save bank details only — no KYC / Razorpay penny-drop
router.put(
  "/",
  requireAuth,
  validateRequest(createPayoutAccountSchema),
  resolveOrCreateBusiness,
  saveBankDetailsOnly,
);

export default router;

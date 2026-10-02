import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  membershipIdParamSchema,
  updateMembershipSchema,
  listMembershipsQuerySchema,
  purchaseMembershipSchema,
  myPurchasedPlansQuerySchema,
  cancelMembershipSchema,
  setAutoRenewSchema,
} from "../validators/membership.validator.js";
import {
  listMemberships,
  getMembershipById,
  updateMembership,
  cancelMembership,
  renewMembership,
  purchaseMembership,
  getMyPurchasedPlans,
  setMembershipAutoRenew,
} from "../controllers/membership.controller.js";

const router = Router();

// Customer my-plans list (buyer-scoped; identity from JWT only)
router.get(
  "/my-plans",
  requireAuth,
  validateRequest(myPurchasedPlansQuerySchema),
  getMyPurchasedPlans,
);

// Customer online purchase (authenticated customer, not requireBusiness)
router.post(
  "/purchase",
  requireAuth,
  validateRequest(purchaseMembershipSchema),
  purchaseMembership,
);

// List all memberships in gym
router.get("/", requireAuth, validateRequest(listMembershipsQuerySchema), requireBusiness, listMemberships);

// Single membership operations
router.get("/:membershipId", requireAuth, validateRequest(membershipIdParamSchema), requireBusiness, getMembershipById);
router.patch("/:membershipId", requireAuth, validateRequest(updateMembershipSchema), requireBusiness, updateMembership);

// Membership lifecycle actions (cancel supports business staff & customer owner)
router.post(
  "/:membershipId/cancel",
  requireAuth,
  validateRequest(cancelMembershipSchema),
  optionalBusiness,
  cancelMembership,
);
router.patch(
  "/:membershipId/auto-renew",
  requireAuth,
  validateRequest(setAutoRenewSchema),
  optionalBusiness,
  setMembershipAutoRenew,
);
router.post("/:membershipId/renew", requireAuth, validateRequest(membershipIdParamSchema), requireBusiness, renewMembership);

export default router;

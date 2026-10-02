import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  listStaffQuerySchema,
  proposePartnershipSchema,
  applyAsTrainerSchema,
  staffIdParamSchema,
  updateProposalSchema,
  respondToProposalSchema,
} from "../validators/staff.validator.js";
import {
  listStaff,
  proposePartnership,
  applyAsTrainer,
  updateProposal,
  respondToProposal,
  removeStaff,
  getInviteLink,
} from "../controllers/staff.controller.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validateRequest(listStaffQuerySchema),
  requireBusiness,
  listStaff,
);

router.get("/invite-link", requireAuth, requireBusiness, getInviteLink);

router.post(
  "/proposals",
  requireAuth,
  validateRequest(proposePartnershipSchema),
  requireBusiness,
  proposePartnership,
);

router.post(
  "/apply",
  requireAuth,
  validateRequest(applyAsTrainerSchema),
  applyAsTrainer,
);

router.patch(
  "/:staffId/proposal",
  requireAuth,
  validateRequest(updateProposalSchema),
  requireBusiness,
  updateProposal,
);

router.post(
  "/:staffId/respond",
  requireAuth,
  validateRequest(respondToProposalSchema),
  respondToProposal,
);

router.delete(
  "/:staffId",
  requireAuth,
  validateRequest(staffIdParamSchema),
  requireBusiness,
  removeStaff,
);

export default router;

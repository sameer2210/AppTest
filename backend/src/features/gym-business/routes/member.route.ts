import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  memberIdParamSchema,
  createMemberSchema,
  updateMemberSchema,
  listMembersQuerySchema,
  sendPaymentReminderSchema,
  extendValiditySchema,
  blacklistMemberSchema,
} from "../validators/member.validator.js";
import {
  createMembershipForMemberSchema,
} from "../validators/membership.validator.js";
import {
  listMembers,
  getJoinLink,
  listDirectoryUsers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberValiditySummary,
  getMemberMembership,
  getMemberPayments,
  getMemberAttendance,
  sendPaymentReminder,
  extendMemberValidity,
  blacklistMember,
} from "../controllers/member.controller.js";
import { createMembershipForMember } from "../controllers/membership.controller.js";

const router = Router();

// Member validity summary
router.get(
  "/validity/summary",
  requireAuth,
  optionalBusiness,
  getMemberValiditySummary,
);

router.get("/invite-link", requireAuth, requireBusiness, getJoinLink);

router.get(
  "/directory-users",
  requireAuth,
  validateRequest(listMembersQuerySchema),
  requireBusiness,
  listDirectoryUsers,
);

// Member list and creation
router.get(
  "/",
  requireAuth,
  validateRequest(listMembersQuerySchema),
  optionalBusiness,
  listMembers,
);

router.post(
  "/",
  requireAuth,
  validateRequest(createMemberSchema),
  requireBusiness,
  createMember,
);

// Single member operations
router.get(
  "/:memberId",
  requireAuth,
  validateRequest(memberIdParamSchema),
  requireBusiness,
  getMemberById,
);

router.patch(
  "/:memberId",
  requireAuth,
  validateRequest(updateMemberSchema),
  requireBusiness,
  updateMember,
);

router.delete(
  "/:memberId",
  requireAuth,
  validateRequest(memberIdParamSchema),
  requireBusiness,
  deleteMember,
);

// Nested member resources
router.get(
  "/:memberId/membership",
  requireAuth,
  validateRequest(memberIdParamSchema),
  requireBusiness,
  getMemberMembership,
);

router.get(
  "/:memberId/payments",
  requireAuth,
  validateRequest(memberIdParamSchema),
  requireBusiness,
  getMemberPayments,
);

router.get(
  "/:memberId/attendance",
  requireAuth,
  validateRequest(memberIdParamSchema),
  requireBusiness,
  getMemberAttendance,
);

// Assign membership to member
router.post(
  "/:memberId/memberships",
  requireAuth,
  validateRequest(createMembershipForMemberSchema),
  requireBusiness,
  createMembershipForMember,
);

// Send payment reminder (with 6-hour cooldown)
router.post(
  "/:memberId/remind-payment",
  requireAuth,
  validateRequest(sendPaymentReminderSchema),
  requireBusiness,
  sendPaymentReminder,
);

router.post(
  "/:memberId/validity/extend",
  requireAuth,
  validateRequest(extendValiditySchema),
  requireBusiness,
  extendMemberValidity,
);

router.post(
  "/:memberId/blacklist",
  requireAuth,
  validateRequest(blacklistMemberSchema),
  requireBusiness,
  blacklistMember,
);

export default router;

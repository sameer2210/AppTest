import { Router } from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { requireBusiness, optionalBusiness } from "../../../middleware/business.middleware.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  planIdParamSchema,
  createPlanSchema,
  updatePlanSchema,
  listPlansQuerySchema,
} from "../validators/membershipPlan.validator.js";
import {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
} from "../controllers/membershipPlan.controller.js";
import { setPlanTrainers } from "../controllers/staff.controller.js";
import { setPlanTrainersSchema } from "../validators/staff.validator.js";

const router = Router();

// List plans and create plan
router.get(
  "/",
  requireAuth,
  validateRequest(listPlansQuerySchema),
  optionalBusiness,
  listPlans,
);
router.post("/", requireAuth, validateRequest(createPlanSchema), requireBusiness, createPlan);

router.patch(
  "/:planId/trainers",
  requireAuth,
  validateRequest(setPlanTrainersSchema),
  requireBusiness,
  setPlanTrainers,
);

// Single plan operations
router.get("/:planId", requireAuth, validateRequest(planIdParamSchema), requireBusiness, getPlanById);
router.patch("/:planId", requireAuth, validateRequest(updatePlanSchema), requireBusiness, updatePlan);
router.delete("/:planId", requireAuth, validateRequest(planIdParamSchema), requireBusiness, deletePlan);

export default router;

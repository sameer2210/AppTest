// Settlement routes for STRON Managed Events. Mounted at /api/stron/settlements.

import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getSettlementHandler,
  initSettlementHandler,
  listSettlementsHandler,
  releaseSettlementHandler,
} from "../controllers/stronSettlement.controller.js";
import { settlementEventKeySchema } from "../validators/stronEvent.validator.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listSettlementsHandler);
router.post("/:eventKey", validateRequest(settlementEventKeySchema), initSettlementHandler);
router.get("/:eventKey", validateRequest(settlementEventKeySchema), getSettlementHandler);
router.post(
  "/:eventKey/release",
  validateRequest(settlementEventKeySchema),
  releaseSettlementHandler,
);

export default router;

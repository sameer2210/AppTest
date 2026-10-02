import { Router } from "express";
import { requireInternalToken } from "../../../middleware/requireInternalToken.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import { syncAllUsers } from "../controllers/userSync.controller.js";
import { syncAllUsersSchema } from "../validators/userSync.validator.js";

const router = Router();

router.get(
  "/",
  requireInternalToken,
  validateRequest(syncAllUsersSchema),
  syncAllUsers,
);

export default router;

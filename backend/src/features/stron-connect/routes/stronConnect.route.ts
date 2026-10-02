import express from "express";
import { requireAuth } from "../../../middleware/requireAuth.js";
import { validateRequest } from "../../../middleware/validate.middleware.js";
import {
  getMyConnectQuerySchema,
  listConnectScansQuerySchema,
  getConnectCatalogQuerySchema,
  scanConnectSchema,
  checkInDirectSchema,
} from "../validators/connect.validator.js";
import {
  getMyConnectQrHandler,
  listMyConnectScansHandler,
  scanConnectQrHandler,
  checkInDirectHandler,
  getConnectCatalogHandler,
} from "../controllers/stronConnect.controller.js";

/**
 * Connect QR + check-in router.
 *
 * Canonical V1 placement: `/api/v1/connect` (mounted via `v1.route.ts`).
 * Legacy `/api/stron/connect` parallel mount has been deprecated and removed.
 */
const router = express.Router();

router.use(requireAuth);

router.get("/me", validateRequest(getMyConnectQuerySchema), getMyConnectQrHandler);
router.post("/scan", validateRequest(scanConnectSchema), scanConnectQrHandler);
router.post("/checkin", validateRequest(checkInDirectSchema), checkInDirectHandler);
router.get(
  "/scans",
  validateRequest(listConnectScansQuerySchema),
  listMyConnectScansHandler,
);
router.get(
  "/catalog",
  validateRequest(getConnectCatalogQuerySchema),
  getConnectCatalogHandler,
);

export default router;

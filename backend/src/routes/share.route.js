import { Router } from "express";
import { openSharedPlanPage } from "../features/gym-business/controllers/planShare.controller.js";
import { openSharedListingPage } from "../features/gym-business/controllers/listingShare.controller.js";
import { openSharedConnectPage } from "../features/stron-connect/controllers/stronConnect.controller.js";

const router = Router();

// Membership plan public share links
router.get("/plan/:id", openSharedPlanPage);
router.get("/api/plan/:id", openSharedPlanPage);

// Business / Gym listing public share links
router.get("/listing/:id", openSharedListingPage);
router.get("/api/listing/:id", openSharedListingPage);
router.get("/business/:id", openSharedListingPage);
router.get("/api/business/:id", openSharedListingPage);

// Stron Connect user profile / QR public share links
router.get("/connect/:uid", openSharedConnectPage);
router.get("/api/connect/:uid", openSharedConnectPage);
router.get("/user/:uid", openSharedConnectPage);
router.get("/api/user/:uid", openSharedConnectPage);

export default router;

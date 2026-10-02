import { Router } from "express";
import { openSharedListingPage } from "../controllers/listingShare.controller.js";

const router = Router();

router.get("/listing/:id", openSharedListingPage);
router.get("/api/listing/:id", openSharedListingPage);
router.get("/business/:id", openSharedListingPage);
router.get("/api/business/:id", openSharedListingPage);

export default router;

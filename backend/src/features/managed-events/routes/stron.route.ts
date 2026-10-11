// Aggregate router for the STRON Managed Events feature.
// Mounted at /api/stron in app.js. Sub-routers are attached as controllers land.

import express from "express";
import organizerRoutes from "./stronOrganizer.route.js";
import eventRoutes from "./stronEvents.route.js";
import settlementRoutes from "./stronSettlement.route.js";
import rewardRoutes from "./stronReward.route.js";
import gymCatalogRoutes from "../../../routes/stronGymCatalog.route.js";

const router = express.Router();

router.use("/organizer", organizerRoutes);
router.use("/events", eventRoutes);
router.use("/gyms", gymCatalogRoutes);
router.use("/settlements", settlementRoutes);
router.use("/rewards", rewardRoutes);

export default router;

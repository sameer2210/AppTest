import { Router } from "express";
import { openSharedConnectPage } from "../controllers/stronConnect.controller.js";

const router = Router();

router.get("/connect/:uid", openSharedConnectPage);
router.get("/api/connect/:uid", openSharedConnectPage);
router.get("/user/:uid", openSharedConnectPage);
router.get("/api/user/:uid", openSharedConnectPage);

export default router;

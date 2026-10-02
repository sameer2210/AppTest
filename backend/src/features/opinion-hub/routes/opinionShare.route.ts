import { Router } from "express";
import { openSharedOpinionPage } from "../controllers/opinionShare.controller.js";

const router = Router();
router.get("/", openSharedOpinionPage);

export default router;

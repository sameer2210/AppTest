import express from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listInterestsHandler } from "../controllers/interest.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", listInterestsHandler);

export default router;

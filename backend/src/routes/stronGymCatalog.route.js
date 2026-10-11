import { Router } from "express";
import { getPublicGym, listPublicGyms } from "../services/stronGymCatalog.service.js";
import { sendError } from "../utils/stronHttpError.util.js";

const router = Router();

router.get("/catalog", async (_req, res) => {
  try {
    const gyms = await listPublicGyms();
    return res.json({ success: true, gyms });
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/:id", async (req, res) => {
  try {
    const gym = await getPublicGym(String(req.params.id));
    if (!gym) {
      return res.status(404).json({ success: false, message: "Gym not found." });
    }
    return res.json({ success: true, gym });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;

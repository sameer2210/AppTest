import type { Request, Response } from "express";
import { runDailyReset } from "../services/dailyReset.service.js";
import { sendError } from "../../../utils/stronHttpError.util.js";
import { logger } from "../../../utils/logger.util.js";

export const triggerDailyReset = async (_req: Request, res: Response) => {
  try {
    logger.info("--- [MANUAL TRIGGER] Starting Daily Reset ---");
    await runDailyReset();
    logger.info("--- [MANUAL TRIGGER] Daily Reset Finished ---");
    return res.status(200).json({
      success: true,
      data: { message: "Manual daily reset completed successfully." },
    });
  } catch (error) {
    logger.error("[MANUAL TRIGGER] An error occurred:", error);
    return sendError(res, error);
  }
};

export default {
  triggerDailyReset,
};

// MUST be first: loads dotenv and exits if required env vars are missing
// before app/firebase modules evaluate.
import "./config/validateEnv.js";

import app from "./app.js";
import connectDB from "./config/db.js";
import { validateOtpConfig } from "./services/otp/otp.service.js";
import "./config/firebase.js";
import {
  initAnalytics,
  shutdownAnalytics,
} from "./services/analytics.service.js";
import { authConfig, isProduction } from "./config/authConfig.js";
import { logger } from "./utils/logger.util.js";
import { shutdownWhatsappQueues, startWhatsappWorkers } from "./queues/index.js";
import {
  createOrSyncWhatsappTemplates,
  seedWhatsappAccountFromEnv,
  seedWhatsappTemplateCatalog,
} from "./services/whatsapp/index.js";

initAnalytics();

if (isProduction() && !authConfig.jwtSecret) {
  logger.error("JWT_SECRET must be set in production.");
  process.exit(1);
}

const shutdown = () => {
  Promise.allSettled([shutdownWhatsappQueues(), shutdownAnalytics()]).finally(() =>
    process.exit(0),
  );
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const parsePort = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 65_535
    ? Math.floor(parsed)
    : fallback;
};

const PORT = parsePort(process.env.PORT, 5000);

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  logger.warn(
    "RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing — ticket payments will fail until set in .env",
  );
} else {
  logger.info("Razorpay keys loaded");
}

connectDB()
  .then(async () => {
    validateOtpConfig();
    await seedWhatsappAccountFromEnv();
    await seedWhatsappTemplateCatalog();
    void createOrSyncWhatsappTemplates();
    await startWhatsappWorkers();
    app.listen(PORT, "0.0.0.0", () => {
      logger.info(`Server running on port ${PORT} [API routes active]`);
      logger.info(`Swagger API Explorer: http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error: unknown) => {
    logger.error("Failed to start server:", error);
    process.exit(1);
  });

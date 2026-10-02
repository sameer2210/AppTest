import "dotenv/config";
import connectDB from "./config/db.js";
import "./models/index.js";
import { logger } from "./utils/logger.util.js";
import { shutdownWhatsappQueues, startWhatsappWorkers } from "./queues/index.js";
import {
  createOrSyncWhatsappTemplates,
  createWhatsappProvider,
  seedWhatsappAccountFromEnv,
  seedWhatsappTemplateCatalog,
  setWhatsappProvider,
} from "./services/whatsapp/index.js";

setWhatsappProvider(createWhatsappProvider());

const shutdown = () => {
  shutdownWhatsappQueues().finally(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

connectDB()
  .then(async () => {
    await seedWhatsappAccountFromEnv();
    await seedWhatsappTemplateCatalog();
    void createOrSyncWhatsappTemplates();
    await startWhatsappWorkers();
    logger.info("[whatsapp] dedicated worker process ready");
  })
  .catch((error: unknown) => {
    logger.error("Failed to start WhatsApp worker:", error);
    process.exit(1);
  });

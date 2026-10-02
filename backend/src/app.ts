import express, { type Request, type RequestHandler, type Response } from "express";
import type { Buffer } from "node:buffer";
import cors from "cors";
import bodyParser from "body-parser";
import "./models/index.js";
import authRoutes from "./features/identity-auth/routes/auth.route.js";
import userRoutes from "./features/identity-auth/routes/user.route.js";
import userSyncRoutes from "./features/identity-auth/routes/userSync.route.js";
import notificationRoutes from "./features/notifications/routes/notification.route.js";
import dailyResetRoutes from "./features/daily-reset/routes/reset.route.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { initializeRemoteConfig } from "./config/remoteConfigService.js";
import configRoutes from "./features/config/routes/config.route.js";
import paymentRoutes from "./features/payments-payouts/routes/payment.route.js";
import uploadRoutes from "./features/upload/routes/upload.route.js";
import { isR2Configured } from "./services/r2Upload.service.js";
import stronManagedRoutes from "./features/managed-events/routes/stron.route.js";
import eventShareRoutes from "./features/managed-events/routes/eventShare.route.js";
import opinionRoutes from "./features/opinion-hub/routes/opinion.route.js";
import opinionShareRoutes from "./features/opinion-hub/routes/opinionShare.route.js";
import feedbackRoutes from "./features/user-engagement/routes/feedback.route.js";
import { openSharedPlanPage } from "./features/gym-business/controllers/planShare.controller.js";
import listingShareRoutes from "./features/gym-business/routes/listingShare.route.js";
import connectShareRoutes from "./features/stron-connect/routes/connectShare.route.js";
import { getAndroidAppLinksPayload } from "./utils/androidAppLinks.util.js";
import { getStronConfig, STRON_TZ } from "./config/stronConfig.js";
import { logger } from "./utils/logger.util.js";
import { scheduleCron } from "./services/stronScheduler.service.js";
import {
  sweepLifecycle,
  stronFaceOffService,
  stronKingOfHillService,
} from "./features/managed-events/index.js";
import {
  runHourlyOpinionStepSync,
  runOpinionCycleSettleJob,
} from "./features/opinion-hub/index.js";
import {
  convertExpiredGymTrials,
  reconcileGymSubscriptions,
  resumeDuePausedProSubscriptions,
  runScheduledReminders,
} from "./features/gym-business/index.js";
import { runDailyReset } from "./features/daily-reset/index.js";
import { createWhatsappProvider, setWhatsappProvider } from "./services/whatsapp/index.js";
import { ensureWhatsappProcessors } from "./queues/index.js";
import stepRaceRoutes from "./features/step-race/routes/stepRace.route.js";
import interestRoutes from "./routes/interest.route.js";
import v1Routes from "./routes/v1.route.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { setupSwagger } from "./docs/swagger.js";
import morgan from "morgan";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(morgan("dev"));
app.set("trust proxy", true);

const isProd = process.env.NODE_ENV === "production";
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return callback(null, true);

      if (!isProd) {
        return callback(null, true);
      }

      if (corsOrigins.length > 0 && corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(
  bodyParser.json({
    verify: (req, _res: Response, buf: Buffer) => {
      (req as Request).rawBody = buf;
    },
  }),
);

void initializeRemoteConfig();
setWhatsappProvider(createWhatsappProvider());
if (process.env.NODE_ENV === "test") {
  ensureWhatsappProcessors();
}

app.use("/public", express.static(path.join(__dirname, "../public")));

app.get("/api/health", (_req: Request, res: Response) =>
  res.send("StepWars Backend Alive Final Production🚀"),
);
app.get("/privacy-policy", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/privacy-policy.html"));
});

app.use("/event", eventShareRoutes);
app.use("/api/event", eventShareRoutes);

app.use("/opinion/share", opinionShareRoutes);
app.use("/api/opinion/share", opinionShareRoutes);

app.get("/plan/:id", openSharedPlanPage as unknown as RequestHandler);
app.get("/api/plan/:id", openSharedPlanPage as unknown as RequestHandler);
app.use(listingShareRoutes);
app.use(connectShareRoutes);

app.get("/.well-known/assetlinks.json", (_req: Request, res: Response) => {
  const payload = getAndroidAppLinksPayload();
  if (payload) {
    return res.type("application/json").json(payload);
  }
  return res
    .type("application/json")
    .sendFile(path.join(__dirname, "../public/.well-known/assetlinks.json"));
});

app.get("/.well-known/apple-app-site-association", (_req: Request, res: Response) => {
  res
    .type("application/json")
    .sendFile(
      path.join(__dirname, "../public/.well-known/apple-app-site-association"),
    );
});

setupSwagger(app);

app.use("/api/", globalLimiter);
app.use("/auth", authRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/daily-reset", dailyResetRoutes);
app.use("/api/config", configRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/stron", stronManagedRoutes);
app.use("/api/step-race", stepRaceRoutes);
app.use("/api/opinion", opinionRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/v1", v1Routes);
app.use("/sync-all-users", userSyncRoutes);

export const registerStronCrons = () => {
  if (process.env.NODE_ENV === "test") {
    return;
  }
  const { lifecycleIntervalMinutes, kothReconcileIntervalMinutes } = getStronConfig();

  // 1. Managed events lifecycle sweep
  scheduleCron({
    name: "stron-lifecycle-sweep",
    cronExpression: `*/${lifecycleIntervalMinutes} * * * *`,
    timezone: STRON_TZ,
    task: async () => {
      const { promoted, completed } = await sweepLifecycle();
      if (promoted || completed) {
        logger.info(
          `[stronManaged] lifecycle sweep: promoted=${promoted}, completed=${completed}`,
        );
      }
    },
  });

  // 2. Face-Off & King of the Hill daily generation
  scheduleCron({
    name: "stron-daily-generation",
    cronExpression: "5 0 * * *",
    timezone: STRON_TZ,
    task: async () => {
      await stronFaceOffService.generateForDay({});
      await stronKingOfHillService.generateForDay({});
      logger.info("[stronManaged] daily Face Off / King of the Hill generation done.");
    },
  });

  // 3. King of the Hill interval reconciliation
  scheduleCron({
    name: "stron-koth-reconcile",
    cronExpression: `*/${kothReconcileIntervalMinutes} * * * *`,
    timezone: STRON_TZ,
    task: async () => {
      await stronKingOfHillService.reconcile();
    },
  });

  // 4. Hourly opinion step sync
  scheduleCron({
    name: "opinion-hourly-step-sync",
    cronExpression: "0 * * * *",
    timezone: STRON_TZ,
    task: async () => {
      await runHourlyOpinionStepSync();
    },
  });

  // 5. Opinion cycle settle (UTC)
  scheduleCron({
    name: "opinion-cycle-settle",
    cronExpression: "5 0,12 * * *",
    timezone: "UTC",
    task: async () => {
      const result = await runOpinionCycleSettleJob();
      logger.info("[opinion] cycle settle:", result);
    },
  });

  // 6. Gym trials, subscriptions, and paused PRO resume
  scheduleCron({
    name: "gym-nightly-maintenance",
    cronExpression: "10 0 * * *",
    timezone: STRON_TZ,
    task: async () => {
      try {
        const trialResult = await convertExpiredGymTrials();
        logger.info("[gymTrial] nightly convert:", trialResult);
      } catch (error: unknown) {
        logger.error("[gymTrial] nightly convert failed:", error);
      }
      try {
        const result = await reconcileGymSubscriptions();
        logger.info("[gymSubscription] nightly reconciliation:", result);
      } catch (error: unknown) {
        logger.error("[gymSubscription] nightly reconciliation failed:", error);
      }
      try {
        const pauseResult = await resumeDuePausedProSubscriptions();
        if (pauseResult.resumedCount) {
          logger.info("[stronPro] nightly in-app pause resume:", pauseResult);
        }
      } catch (error: unknown) {
        logger.error("[stronPro] nightly in-app pause resume failed:", error);
      }
    },
  });

  // 7. Daily midnight IST reset
  scheduleCron({
    name: "daily-midnight-reset",
    cronExpression: "0 0 * * *",
    timezone: "Asia/Kolkata",
    task: async () => {
      logger.info("Triggering scheduled daily reset for 12:00 AM IST...");
      await runDailyReset();
    },
  });

  // 8. WhatsApp reminder scheduler (09:00 IST)
  scheduleCron({
    name: "gym-whatsapp-reminders",
    cronExpression: "0 9 * * *",
    timezone: STRON_TZ,
    task: async () => {
      const result = await runScheduledReminders();
      if (result.queued) {
        logger.info("[whatsapp] scheduled reminders queued:", result);
      }
    },
  });

  logger.info(
    `[stronManaged] crons scheduled (lifecycle=*/${lifecycleIntervalMinutes}m, daily generation, KotH reconcile=*/${kothReconcileIntervalMinutes}m, opinion hourly IST + cycle settle UTC, gym auto-renew 00:10 IST, daily reset 00:00 IST, whatsapp reminders 09:00 IST).`,
  );
};

registerStronCrons();

logger.info("Face-Off daily settle/matchmaking scheduled for 12:05 AM IST.");
logger.info("Daily reset job scheduled for 12:00 AM IST.");
logger.info("STRON managed event APIs mounted at /api/stron.");
if (isR2Configured()) {
  logger.info("Cloudflare R2 image uploads mounted at /api/upload.");
} else {
  logger.warn("Cloudflare R2 not configured — image uploads via /api/upload are disabled.");
}

app.use(errorHandler);

export default app;

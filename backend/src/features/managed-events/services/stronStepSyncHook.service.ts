// Real-time step-sync entry point for STRON Managed Events.
// Called from userController.syncUserSteps. Must be cheap and never throw.

import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { STRON_FORMATS } from "./stronFormats.service.js";
import * as marathonService from "./stronMarathon.service.js";
import * as stepChallengeService from "./stronStepChallenge.service.js";
import * as faceOffService from "./stronFaceOff.service.js";
import * as kingOfHillService from "./stronKingOfHill.service.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { logger } from "../../../utils/logger.util.js";

export const onUserStepsSynced = async ({ uid, todaysStepCount }: ServiceParams) => {
  if (!uid) return;

  let participations: ServiceParams[] = [];
  try {
    // Include registered so late-active events still accrue steps after go-live.
    participations = (await StronParticipation.find({
      uid,
      status: { $in: ["active", "registered"] },
    })) as unknown as ServiceParams[];
  } catch (error: unknown) {
    logger.warn("[stronManaged] sync load participations failed:", getErrorMessage(error));
    return;
  }
  if (!participations.length) return;

  const eventKeys = [...new Set(participations.map((p) => String(p.eventKey)))];
  let eventMap = new Map<string, ServiceParams>();
  try {
    const events = await StronEvent.find({ key: { $in: eventKeys } }).lean();
    eventMap = new Map(events.map((e) => [e.key, e as ServiceParams]));
  } catch (error: unknown) {
    logger.warn("[stronManaged] sync load events failed:", getErrorMessage(error));
    return;
  }

  for (const participation of participations) {
    const event = eventMap.get(String(participation.eventKey));
    if (!event || event.status !== "live") continue;

    // Prefer event.format when a legacy participation row is missing format.
    const format = participation.format || event.format;

    try {
      if (format === STRON_FORMATS.MARATHON) {
        await marathonService.applyLive({
          participation,
          event,
          todaysStepCount,
        });
      } else if (format === STRON_FORMATS.STEP_CHALLENGE) {
        await stepChallengeService.applyLive({
          participation,
          todaysStepCount,
          event,
        });
      } else if (format === STRON_FORMATS.KING_OF_THE_HILL) {
        await kingOfHillService.onStepsSynced({
          uid,
          todaysStepCount,
          eventKey: participation.eventKey,
        });
      } else if (format === STRON_FORMATS.FACE_OFF) {
        await faceOffService.onStepsSynced({
          uid,
          todaysStepCount,
          eventKey: participation.eventKey,
        });
      }
    } catch (error: unknown) {
      logger.warn(
        "[stronManaged] applyLive failed:",
        format,
        participation._id?.toString?.() ?? participation._id,
        getErrorMessage(error),
      );
    }
  }
};

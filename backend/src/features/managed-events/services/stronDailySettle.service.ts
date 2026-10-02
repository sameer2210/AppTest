// Daily settle orchestrator. Runs inside runDailyReset for the day just ended, using each
// user's archived step total before todaysStepCount is reset. Accrues marathon and step
// challenge progress; Face Off and King of the Hill finalize their own matches/groups.

import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { STRON_FORMATS } from "./stronFormats.service.js";
import * as marathonService from "./stronMarathon.service.js";
import * as stepChallengeService from "./stronStepChallenge.service.js";
import * as faceOffService from "./stronFaceOff.service.js";
import * as kingOfHillService from "./stronKingOfHill.service.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { dayKey } from "../../../utils/stronTime.util.js";
import { logger } from "../../../utils/logger.util.js";

// The active event days are [startDayKey, endDayKey); endDate is the morning after the
// final active day, matching how marathon deadlines are computed.
const withinEventDay = (event: ServiceParams, settleDayKey: string) => {
  const start = dayKey(event.startDate);
  const end = dayKey(event.endDate);
  return settleDayKey >= start && settleDayKey < end;
};

export const runStronDailySettle = async ({
  users = [],
  settleDayKey,
}: ServiceParams & { users?: Array<{ uid: string; todaysStepCount?: number }>; settleDayKey?: string } = {}) => {
  const key = settleDayKey || dayKey();
  const stepsByUid = new Map(
    users.map((u) => [u.uid, Number(u.todaysStepCount || 0)]),
  );

  // Marathon + Step Challenge: accrue per active participation for the settled day.
  const participations = await StronParticipation.find({ status: "active" });
  if (participations.length) {
    const eventKeys = [...new Set(participations.map((p) => p.eventKey))];
    const events = await StronEvent.find({ key: { $in: eventKeys } });
    const eventMap = new Map(events.map((e) => [e.key, e]));

    for (const participation of participations) {
      const event = eventMap.get(participation.eventKey);
      if (!event || !withinEventDay(event, key)) continue;
      const rawSteps = stepsByUid.get(participation.uid) || 0;

      try {
        if (event.format === STRON_FORMATS.MARATHON) {
          await marathonService.settleParticipationDay({
            participation,
            event,
            rawSteps,
            settleDayKey: key,
          });
        } else if (event.format === STRON_FORMATS.STEP_CHALLENGE) {
          await stepChallengeService.settleParticipationDay({
            participation,
            rawSteps,
            settleDayKey: key,
          });
        }
      } catch (error: unknown) {
        logger.warn(
          "[stronManaged] settle failed for",
          participation._id?.toString(),
          getErrorMessage(error),
        );
      }
    }
  }

  // Face Off and King of the Hill finalize the day's matches/groups and roll up results.
  try {
    await faceOffService.settleDay({ settleDayKey: key, stepsByUid });
  } catch (error: unknown) {
    logger.warn("[stronManaged] face off settle failed:", getErrorMessage(error));
  }
  try {
    await kingOfHillService.settleDay({ settleDayKey: key, stepsByUid });
  } catch (error: unknown) {
    logger.warn("[stronManaged] king of the hill settle failed:", getErrorMessage(error));
  }
};

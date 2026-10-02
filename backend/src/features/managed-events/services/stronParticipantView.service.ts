import { UserModel } from "../../identity-auth/index.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { getEventByKey } from "./stronEvent.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import BotService from "../../../utils/bot.service.js";
import { logger } from "../../../utils/logger.util.js";
import type { ServiceParams } from "../../../types/service.util.js";

import type { StronFormatKey } from "../types/index.js";
import { STRON_FORMATS } from "../../../constants/index.js";

const loadFormatService = (format: string | StronFormatKey) => {
  switch (format) {
    case STRON_FORMATS.MARATHON:
      return import("./stronMarathon.service.js");
    case STRON_FORMATS.STEP_CHALLENGE:
      return import("./stronStepChallenge.service.js");
    case STRON_FORMATS.KING_OF_THE_HILL:
      return import("./stronKingOfHill.service.js");
    case STRON_FORMATS.FACE_OFF:
      return import("./stronFaceOff.service.js");
    default:
      return import(`./stron${String(format)}.service.js`);
  }
};


const displayNameForMember = (m: ServiceParams, profile: ServiceParams | null | undefined) => {
  if (profile?.username) return profile.username;
  if (m?.isBot) return BotService.displayNameFromUid(m.uid);
  return null;
};

export const getProgressService = async ({
  uid,
  eventKey,
}: {
  uid: string;
  eventKey: string;
}) => {
  let participation = await StronParticipation.findOne({
    uid,
    eventKey,
  });

  if (!participation) {
    throw codedError("participation_not_found", "You have not joined this event.");
  }

  const event = await getEventByKey(eventKey);
  const user = await UserModel.findOne({ uid })
    .select("todaysStepCount")
    .lean();
  const rawToday = Math.max(0, Number(user?.todaysStepCount || 0));

  // Older enrollments may lack dailyStepTarget — fill from the matched ticket.
  if (
    event.format === "virtual_step_challenge" &&
    !Number(participation.dailyStepTarget || 0)
  ) {
    const tickets: ServiceParams[] = Array.isArray(event.ticketTypes)
      ? event.ticketTypes
      : [];
    const ticketTypeId = participation.ticketTypeId;
    const matched =
      tickets.find(
        (t) =>
          t &&
          ticketTypeId &&
          String(t.id) === String(ticketTypeId),
      ) || tickets[0];
    if (matched?.dailyStepTarget) {
      participation.dailyStepTarget = matched.dailyStepTarget;
    }
  }

  const service = await loadFormatService(event.format);

  if (
    event.format === "virtual_step_challenge" &&
    typeof service.applyLive === "function" &&
    (participation.status === "active" || participation.status === "registered")
  ) {
    try {
      await service.applyLive({
        participation,
        todaysStepCount: rawToday,
        event,
      });
      participation =
        (await StronParticipation.findOne({
          uid,
          eventKey,
        })) || participation;
    } catch (err) {
      logger.warn("[stronManaged] step-challenge applyLive on progress failed:", (err as Error).message);
    }
  }

  const progress = await service.getProgress(participation, rawToday, event);

  // Enrich today's group standings with usernames for KotH live cards.
  if (progress?.todayGroup?.standings?.length) {
    const uids = [
      ...new Set(progress.todayGroup.standings.map((m: ServiceParams) => m.uid).filter(Boolean)),
    ];
    const profiles = uids.length
      ? await UserModel.find({ uid: { $in: uids } })
          .select("uid username profileImageUrl")
          .lean()
      : [];
    const byUid = new Map(profiles.map((u) => [u.uid, u]));
    progress.todayGroup.standings = progress.todayGroup.standings.map((m: ServiceParams) => {
      const profile = byUid.get(m.uid);
      return {
        ...m,
        username: displayNameForMember(m, profile),
        profileImageUrl: profile?.profileImageUrl || null,
      };
    });
  }

  // Enrich Face Off today's opponent for the live VS card.
  if (progress?.todayMatch?.opponentUid) {
    const oppUid = progress.todayMatch.opponentUid;
    if (progress.todayMatch.opponentIsBot) {
      progress.todayMatch.opponentUsername = BotService.displayNameFromUid(oppUid);
      progress.todayMatch.opponentProfileImageUrl = null;
    } else {
      const oppProfile = await UserModel.findOne({ uid: oppUid })
        .select("uid username profileImageUrl")
        .lean();
      progress.todayMatch.opponentUsername = oppProfile?.username || null;
      progress.todayMatch.opponentProfileImageUrl =
        oppProfile?.profileImageUrl || null;
    }
  }

  return progress;
};

export const getLeaderboardService = async ({ eventKey }: { eventKey: string }) => {
  const event = await getEventByKey(eventKey);
  const service = await loadFormatService(event.format);
  const leaderboard = await service.buildLeaderboard(event);
  const uids = [...new Set(leaderboard.map((row: ServiceParams) => row.uid).filter(Boolean))];
  const users = uids.length
    ? await UserModel.find({ uid: { $in: uids } })
        .select("uid username receiverName name profileImageUrl")
        .lean()
    : [];
  const byUid = new Map(users.map((u) => [u.uid, u]));
  const enriched = leaderboard.map((row: ServiceParams) => {
    const user = byUid.get(row.uid);
    const displayName =
      user?.username ||
      user?.receiverName ||
      row.username ||
      row.name ||
      "Participant";
    return {
      ...row,
      name: displayName,
      username: displayName,
      profileImageUrl: user?.profileImageUrl || row.profileImageUrl || null,
    };
  });

  return {
    event: { key: event.key, title: event.title, format: event.format },
    leaderboard: enriched,
  };
};

export const getMatchesService = async ({
  uid,
  eventKey,
}: {
  uid: string;
  eventKey: string;
}) => {
  const event = await getEventByKey(eventKey);
  const service = await loadFormatService(event.format);
  if (typeof service.getMatches !== "function") {
    return [];
  }
  const matches = await service.getMatches({
    uid,
    eventKey: event.key,
  });

  const uids = new Set();
  for (const match of matches) {
    for (const member of match.members || []) {
      if (member?.uid) uids.add(member.uid);
    }
    if (match.playerA?.uid) uids.add(match.playerA.uid);
    if (match.playerB?.uid) uids.add(match.playerB.uid);
  }
  const users = uids.size
    ? await UserModel.find({ uid: { $in: [...uids] } })
        .select("uid username profileImageUrl")
        .lean()
    : [];
  const byUid = new Map(users.map((u) => [u.uid, u]));
  const enrichPlayer = (m: ServiceParams | null | undefined) => {
    if (!m) return m;
    const user = byUid.get(m.uid);
    return {
      ...m,
      username: displayNameForMember(m, user),
      profileImageUrl: user?.profileImageUrl || null,
    };
  };

  return matches.map((match: ServiceParams) => ({
    ...match,
    members: (match.members || []).map(enrichPlayer),
    playerA: enrichPlayer(match.playerA),
    playerB: enrichPlayer(match.playerB),
  }));
};

export default {
  getProgressService,
  getLeaderboardService,
  getMatchesService,
};

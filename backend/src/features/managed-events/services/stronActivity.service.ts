import StronParticipation from "../models/stronParticipation.model.js";
import StronEvent from "../models/stronEvent.model.js";
import StronReward from "../models/stronReward.model.js";
import StronOrganizer from "../models/stronOrganizer.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { dayKey } from "../../../utils/stronTime.util.js";
import { eventDayStepsMap, eventDayGain } from "../../../utils/stronSteps.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { FORMAT_ACTIVITY_TAG as FORMAT_TAG } from "../../../constants/index.js";


/** Visual badge for completed events: won medal, else certificate. */
const rewardBadgeFor = ({
  rewards,
  resultRank,
  format,
  eventStatus,
}: ServiceParams) => {
  if (eventStatus !== "completed" && eventStatus !== "settled") {
    return { rewardKind: null, medalTier: null };
  }
  const rewardList = (rewards || []) as ServiceParams[];
  const medal = rewardList.find((r) => r.type === "medal");
  if (medal) {
    return {
      rewardKind: "medal",
      medalTier: medal.medalTier || "gold",
      rewardFormat: medal.format || format || null,
    };
  }
  const cert = rewardList.find((r) => r.type === "certificate");
  if (cert) {
    return {
      rewardKind: "certificate",
      medalTier: null,
      rewardFormat: cert.format || format || null,
    };
  }
  // Fallback when rewards not issued yet — derive from result rank.
  if (resultRank === 1) {
    return { rewardKind: "medal", medalTier: "gold", rewardFormat: format || null };
  }
  if (resultRank === 2) {
    return { rewardKind: "medal", medalTier: "silver", rewardFormat: format || null };
  }
  if (resultRank === 3) {
    return { rewardKind: "medal", medalTier: "bronze", rewardFormat: format || null };
  }
  return { rewardKind: "certificate", medalTier: null, rewardFormat: format || null };
};

const actionLabelFor = ({
  role,
  eventStatus,
  participationStatus,
}: ServiceParams) => {
  // Terminal event states win — participants should not treat these as live/open.
  if (eventStatus === "completed" || eventStatus === "settled") return "Completed";
  if (eventStatus === "cancelled" || participationStatus === "cancelled") {
    return "Cancelled";
  }
  if (eventStatus === "live" || participationStatus === "active") return "Live";
  if (eventStatus === "published" || participationStatus === "registered") {
    return "Check Now";
  }
  if (participationStatus === "completed" || participationStatus === "expired") {
    return "Completed";
  }
  return "View";
};

const formatDateLabel = (value: unknown) => {
  if (!value) return "TBD";
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return "TBD";
  const day = d.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return `${day}${suffix} ${month}, ${d.getFullYear()}`;
};

const formatKingClock = (totalSeconds: unknown) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
};

const formatCleanKmBackend = (steps: unknown, isTarget = false) => {
  const stepCount = Number(steps) || 0;
  if (!stepCount || stepCount <= 0) return isTarget ? null : "0";
  const rawKm = stepCount / 1312.3356;
  if (isTarget) {
    const roundedInt = Math.round(rawKm);
    if (Math.abs(rawKm - roundedInt) < 0.25) return String(roundedInt);
    if (Math.abs(rawKm - 21.1) < 0.3) return "21.1";
    if (Math.abs(rawKm - 42.2) < 0.3) return "42.2";
    return rawKm.toFixed(1);
  }
  const roundedInt = Math.round(rawKm);
  if (Math.abs(rawKm - roundedInt) < 0.05) return String(roundedInt);
  return rawKm.toFixed(1);
};

const progressForParticipation = (
  p: ServiceParams,
  format: string,
  rawTodaySteps = 0,
) => {
  if (format === "marathon") {
    const covered = Number(p.leaderboardSteps || p.accumulatedSteps || 0);
    const target = Number(p.targetSteps || 0);
    const distanceKm = p.distanceKm ? String(p.distanceKm) : null;
    const targetKm = distanceKm || formatCleanKmBackend(target, true);
    const coveredKm =
      covered >= target && targetKm
        ? targetKm
        : formatCleanKmBackend(covered, false);
    const percent =
      target > 0 ? Math.min(100, Math.round((covered / target) * 100)) : 0;
    return {
      progressPercent: percent,
      progressLabel:
        targetKm
          ? `${coveredKm} / ${targetKm} km`
          : `${coveredKm} km`,
      coveredSteps: covered,
      targetSteps: target || null,
    };
  }
  if (format === "virtual_step_challenge") {
    const days = Number(p.successfulDays || 0);
    const required = Number(p.requiredDays || 0);
    const ticket = p.ticket as ServiceParams | undefined;
    const dailyTarget = Number(
      p.dailyStepTarget ||
        (ticket && ticket.dailyStepTarget) ||
        0
    );
    const today = dayKey();
    const map = eventDayStepsMap(p);
    // Event ledger only — never dump phone total when no row yet (first-sight = 0).
    let todayGained = map.has(today)
      ? Math.max(0, Number(map.get(today)) || 0)
      : eventDayGain(p, rawTodaySteps, today);
    // Provisional successful day for the card.
    const keys = Array.isArray(p.successfulDayKeys) ? p.successfulDayKeys : [];
    const daysShown =
      dailyTarget > 0 && todayGained >= dailyTarget && !keys.includes(today)
        ? Math.max(days, days + 1)
        : days;
    const percent =
      dailyTarget > 0
        ? Math.min(100, Math.round((todayGained / dailyTarget) * 100))
        : 0;
    const parts = [];
    if (required > 0) parts.push(`${daysShown}/${required} days`);
    if (todayGained > 0) {
      parts.push(`${todayGained.toLocaleString("en-IN")} steps today`);
    }
    return {
      progressPercent: percent,
      progressLabel: parts.length
        ? parts.join(" · ")
        : dailyTarget > 0
          ? `0 / ${dailyTarget.toLocaleString("en-IN")} steps`
          : "0 steps",
      coveredSteps: todayGained,
      currentSteps: todayGained,
      todaySteps: todayGained,
      targetSteps: dailyTarget || null,
      dailyStepTarget: dailyTarget || null,
      successfulDays: daysShown,
      requiredDays: required || null,
    };
  }
  if (format === "king_of_the_hill") {
    const secs = Number(p.totalKingSeconds || 0);
    const days = Math.floor(secs / (24 * 3600));
    return {
      progressPercent: null,
      progressLabel: `${days} day${days === 1 ? "" : "s"} as King`,
      coveredSteps: null,
      targetSteps: null,
      totalKingSeconds: secs,
      kingDays: days,
    };
  }
  if (format === "face_off") {
    const covered = Number(p.leaderboardSteps || p.accumulatedSteps || 0);
    const target = Number(p.targetSteps || 0);
    const distanceKm = p.distanceKm ? String(p.distanceKm) : null;
    const targetKm = distanceKm || formatCleanKmBackend(target, true);
    const coveredKm =
      covered >= target && targetKm
        ? targetKm
        : formatCleanKmBackend(covered, false);
    return {
      progressPercent: null,
      progressLabel: targetKm ? `${coveredKm} / ${targetKm} km` : `${coveredKm} km`,
      coveredSteps: covered,
      targetSteps: target || null,
    };
  }
  return {
    progressPercent: null,
    progressLabel: null,
    coveredSteps: null,
    targetSteps: null,
  };
};

/** Combined participant + organizer recent activity for the Activity tab. */
export const listMyRecentActivity = async (uid: string) => {
  const [participations, organized, activityUser] = await Promise.all([
    StronParticipation.find({ uid }).sort({ enrolledAt: -1 }).lean(),
    StronEvent.find({
      organizerUid: uid,
      status: { $in: ["published", "live", "completed", "settled"] },
    })
      .sort({ updatedAt: -1 })
      .lean(),
    UserModel.findOne({ uid }).select("todaysStepCount").lean(),
  ]);
  const rawTodaySteps = Math.max(0, Number(activityUser?.todaysStepCount || 0));

  const keys = [
    ...new Set([
      ...participations.map((p) => p.eventKey),
      ...organized.map((e) => e.key),
    ]),
  ];
  const events = keys.length
    ? await StronEvent.find({ key: { $in: keys } }).lean()
    : [];
  const byKey: Record<string, ServiceParams> = Object.fromEntries(
    events.map((e) => [e.key, e as ServiceParams]),
  );

  const orgUids = [...new Set(events.map((e) => e.organizerUid).filter(Boolean))];
  const [organizers, users] = await Promise.all([
    orgUids.length ? StronOrganizer.find({ uid: { $in: orgUids } }).lean() : [],
    orgUids.length ? UserModel.find({ uid: { $in: orgUids } }).lean() : [],
  ]);
  const orgMap: Record<string, ServiceParams> = Object.fromEntries(
    organizers.map((o) => [o.uid, o as ServiceParams]),
  );
  const userMap: Record<string, ServiceParams> = Object.fromEntries(
    users.map((u) => [u.uid, u as ServiceParams]),
  );

  const rewards = keys.length
    ? await StronReward.find({ uid, eventKey: { $in: keys } }).lean()
    : [];
  const rewardsByEvent: Record<string, ServiceParams[]> = {};
  for (const r of rewards) {
    const eventKey = String(r.eventKey);
    if (!rewardsByEvent[eventKey]) rewardsByEvent[eventKey] = [];
    rewardsByEvent[eventKey].push(r as ServiceParams);
  }

  const items: ServiceParams[] = [];
  const seen = new Set<string>();

  for (const raw of participations) {
    const p = raw as ServiceParams;
    const event = byKey[String(p.eventKey)];
    if (!event) continue;
    seen.add(String(p.eventKey));

    const tickets = Array.isArray(event.ticketTypes) ? (event.ticketTypes as ServiceParams[]) : [];
    const matchedTicket =
      tickets.find((t) => t && p.ticketTypeId && String(t.id) === String(p.ticketTypeId)) ||
      tickets[0] ||
      null;

    if (matchedTicket) {
      p.ticket = matchedTicket;
    }
    if (!p.dailyStepTarget && matchedTicket?.dailyStepTarget) {
      p.dailyStepTarget = matchedTicket.dailyStepTarget;
    }
    // Marathon-only ticket fields — never copy onto step-challenge rows.
    if (event.format !== "virtual_step_challenge") {
      if (!p.targetSteps && matchedTicket?.targetSteps) {
        p.targetSteps = matchedTicket.targetSteps;
      }
      if (!p.distanceKm && matchedTicket?.distanceKm) {
        p.distanceKm = matchedTicket.distanceKm;
      }
    }
    if (!p.requiredDays && event.successfulDaysRequired) {
      p.requiredDays = event.successfulDaysRequired;
    }

    const progress = progressForParticipation(p, String(event.format || ""), rawTodaySteps);
    const rewardBadge = rewardBadgeFor({
      rewards: rewardsByEvent[String(p.eventKey)],
      resultRank: p.resultRank,
      format: event.format,
      eventStatus: event.status,
    });

    const orgRecord = orgMap[String(event.organizerUid)];
    const usrRecord = userMap[String(event.organizerUid)];
    const resolvedOrganizerName =
      orgRecord?.organizationName ||
      orgRecord?.fullName ||
      usrRecord?.receiverName ||
      usrRecord?.username ||
      event.organizerName ||
      "Stron Organizer";

    const resolvedOrganizerPhone =
      orgRecord?.mobileNumber || usrRecord?.contactNo || null;
    const resolvedOrganizerEmail =
      orgRecord?.email || usrRecord?.email || null;
    const resolvedOrganizerAvatar = usrRecord?.profileImageUrl || null;

    items.push({
      id: `p_${String(p._id)}`,
      role: "participant",
      eventKey: p.eventKey || event.key,
      title: event.title,
      tag: FORMAT_TAG[String(event.format)] || "Event",
      format: event.format,
      eventStatus: event.status,
      participationStatus: p.status,
      date: formatDateLabel(p.enrolledAt || event.startDate),
      dateIso: p.enrolledAt || event.startDate || null,
      completedAt: event.completedAt || null,
      endDate: event.endDate || null,
      bannerName: event.bannerName || null,
      listingType: event.listingType || null,
      destination: event.destination || null,
      startDate: event.startDate || null,
      registrationCount: event.registrationCount ?? 0,
      ticketTypes: event.ticketTypes || [],
      ticketTypeId: p.ticketTypeId || null,
      rank: p.resultRank || null,
      totalWins: Number(p.totalWins || 0),
      totalKingSeconds: Number(p.totalKingSeconds || 0),
      organizerUid: event.organizerUid,
      organizerName: resolvedOrganizerName,
      organizerAvatar: resolvedOrganizerAvatar,
      organizerLogoUrl: resolvedOrganizerAvatar,
      organizerPhone: resolvedOrganizerPhone,
      organizerEmail: resolvedOrganizerEmail,
      actionLabel: actionLabelFor({
        role: "participant",
        eventStatus: event.status,
        participationStatus: p.status,
      }),
      iconCount:
        event.format === "king_of_the_hill"
          ? 3
          : event.format === "face_off"
            ? 1
            : 0,
      ...progress,
      ...rewardBadge,
    });
  }

  const orgEventKeys = organized.map((e) => e.key);
  const revenueAgg = orgEventKeys.length
    ? await StronParticipation.aggregate([
        {
          $match: {
            eventKey: { $in: orgEventKeys },
            status: { $nin: ["cancelled", "refunded"] },
          },
        },
        {
          $group: {
            _id: "$eventKey",
            totalRevenue: { $sum: { $ifNull: ["$totalCharged", "$ticketPrice"] } },
            count: { $sum: 1 },
          },
        },
      ])
    : [];
  const eventRevenueMap: Record<string, { totalRevenue: number; count: number }> =
    Object.fromEntries(
      revenueAgg.map((r: ServiceParams) => [
        String(r._id),
        { totalRevenue: Number(r.totalRevenue || 0), count: Number(r.count || 0) },
      ]),
    );

  for (const rawEvent of organized) {
    const event = rawEvent as ServiceParams;
    if (seen.has(String(event.key))) continue;
    const rewardBadge = rewardBadgeFor({
      rewards: rewardsByEvent[String(event.key)],
      resultRank: null,
      format: event.format,
      eventStatus: event.status,
    });

    const orgRecord = orgMap[String(event.organizerUid)];
    const usrRecord = userMap[String(event.organizerUid)];
    const resolvedOrganizerName =
      orgRecord?.organizationName ||
      orgRecord?.fullName ||
      usrRecord?.receiverName ||
      usrRecord?.username ||
      event.organizerName ||
      "Stron Organizer";

    const resolvedOrganizerPhone =
      orgRecord?.mobileNumber || usrRecord?.contactNo || null;
    const resolvedOrganizerEmail =
      orgRecord?.email || usrRecord?.email || null;
    const resolvedOrganizerAvatar = usrRecord?.profileImageUrl || null;

    const revInfo = eventRevenueMap[String(event.key)] || { totalRevenue: 0, count: 0 };
    const dynamicRevenue = revInfo.totalRevenue;
    const dynamicRegCount = event.registrationCount ?? revInfo.count ?? 0;

    items.push({
      id: `o_${event.key}`,
      role: "organizer",
      eventKey: event.key,
      title: event.title,
      tag: FORMAT_TAG[String(event.format)] || "Event",
      format: event.format,
      eventStatus: event.status,
      participationStatus: null,
      date: formatDateLabel(event.publishedAt || event.startDate || event.createdAt),
      dateIso: event.publishedAt || event.startDate || event.createdAt || null,
      completedAt: event.completedAt || null,
      endDate: event.endDate || null,
      bannerName: event.bannerName || null,
      listingType: event.listingType || null,
      destination: event.destination || null,
      startDate: event.startDate || null,
      registrationCount: dynamicRegCount,
      totalEarnings: dynamicRevenue,
      ticketTypes: event.ticketTypes || [],
      rank: null,
      totalWins: null,
      totalKingSeconds: null,
      organizerUid: event.organizerUid,
      organizerName: resolvedOrganizerName,
      organizerAvatar: resolvedOrganizerAvatar,
      organizerLogoUrl: resolvedOrganizerAvatar,
      organizerPhone: resolvedOrganizerPhone,
      organizerEmail: resolvedOrganizerEmail,
      actionLabel: actionLabelFor({
        role: "organizer",
        eventStatus: event.status,
        participationStatus: null,
      }),
      iconCount:
        event.format === "king_of_the_hill"
          ? 3
          : event.format === "face_off"
            ? 1
            : 0,
      progressPercent: null,
      progressLabel: null,
      coveredSteps: null,
      targetSteps: null,
      ...rewardBadge,
    });
  }

  items.sort((a, b) => {
    const ta = a.dateIso ? new Date(a.dateIso as string | Date).getTime() : 0;
    const tb = b.dateIso ? new Date(b.dateIso as string | Date).getTime() : 0;
    return tb - ta;
  });

  return items;
};

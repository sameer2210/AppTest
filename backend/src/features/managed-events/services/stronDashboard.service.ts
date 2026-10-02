// Organizer dashboard aggregates: registrations, revenue, commission, net, and status,
// both across all of an organizer's events and for a single event.

import StronEvent from "../models/stronEvent.model.js";
import StronParticipation from "../models/stronParticipation.model.js";
import { UserModel as User } from "../../identity-auth/index.js";
import { asUserDisplay, type ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { computeTotals } from "./stronSettlement.service.js";

export const getOrganizerDashboard = async (uid: string) => {
  const events = await StronEvent.find({ organizerUid: uid }).lean();

  const summary = {
    totalEvents: events.length,
    totalRegistrations: 0,
    grossRevenue: 0,
    platformCommission: 0,
    netEarnings: 0,
    byStatus: {} as Record<string, number>,
  };
  const perEvent = [];

  for (const event of events) {
    const totals = await computeTotals(event.key);
    summary.totalRegistrations += totals.participantCount;
    summary.grossRevenue += totals.grossTicketSales;
    summary.platformCommission += totals.totalPlatformCommission;
    summary.netEarnings += totals.netPayable;
    summary.byStatus[event.status] = (summary.byStatus[event.status] || 0) + 1;

    perEvent.push({
      key: event.key,
      title: event.title,
      format: event.format,
      status: event.status,
      capacity: event.capacity,
      registrationCount: event.registrationCount,
      soldOut: event.soldOut,
      ...totals,
    });
  }

  return { summary, events: perEvent };
};

export const getEventDashboard = async ({
  uid,
  eventKey,
}: ServiceParams & { uid: string; eventKey: string }) => {
  const event = await StronEvent.findOne({ key: eventKey }).lean();
  if (!event) {
    throw codedError("event_not_found", "Event not found.");
  }
  if (event.organizerUid !== uid) {
    throw codedError("not_owner", "You do not manage this event.");
  }

  const totals = await computeTotals(eventKey);
  const ticketSales = (event.ticketTypes || []).map((t) => ({
    id: t.id,
    label: t.label,
    price: t.price,
    soldCount: t.soldCount || 0,
  }));

  const recentRows = await StronParticipation.find({
    eventKey,
    status: { $nin: ["cancelled", "refunded"] },
  })
    .sort({ enrolledAt: -1 })
    .limit(50)
    .lean();

  const uids = [...new Set(recentRows.map((r) => r.uid).filter(Boolean))];
  const users = uids.length
    ? await User.find({ uid: { $in: uids } })
        .select("uid username receiverName name email contactNo profileImageUrl")
        .lean()
    : [];
  const userByUid = new Map(users.map((u) => [u.uid, u]));

  const recentRegistrations = recentRows.map((row) => {
    const user = asUserDisplay(userByUid.get(row.uid));
    const displayName =
      user?.username ||
      user?.receiverName ||
      user?.name ||
      row.ticketLabel ||
      "Participant";
    return {
      id: String(row._id),
      uid: row.uid,
      name: displayName,
      email: user?.email || null,
      contactNo: user?.contactNo || null,
      avatarUri: user?.profileImageUrl || null,
      ticketLabel: row.ticketLabel || null,
      ticketNumber: row.ticketNumber || null,
      ticketPrice: row.ticketPrice || 0,
      qrCode: row.qrCode || null,
      enrolledAt: row.enrolledAt || null,
      status: row.status,
      participantInfo: (Array.isArray(row.participantInfo)
        ? row.participantInfo
        : []) as { field: string; value: string }[],
      couponCode: row.couponCode || null,
    };
  });

  return {
    event: {
      key: event.key,
      title: event.title,
      format: event.format,
      status: event.status,
      capacity: event.capacity,
      registrationCount: event.registrationCount,
      soldOut: event.soldOut,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationEndDate: event.registrationEndDate,
    },
    ticketSales,
    totals,
    recentRegistrations,
  };
};

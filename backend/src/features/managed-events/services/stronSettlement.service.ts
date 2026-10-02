// Settlement: compute an organizer's payout for a completed event from the money split
// stored on captured transactions, gate on KYC, and provide a manual finance release.

import { Transaction } from "../../payments-payouts/index.js";
import StronEvent from "../models/stronEvent.model.js";
import StronOrganizer from "../models/stronOrganizer.model.js";
import StronSettlement from "../models/stronSettlement.model.js";
import type { IStronSettlement } from "../types/index.js";
import { UserModel } from "../../identity-auth/index.js";
import { isUserAdmin } from "../../../config/remoteConfigService.js";
import type { MongoFilter, ServiceParams } from "../../../types/service.util.js";
import { getStronConfig } from "../../../config/stronConfig.js";
import { addBusinessDays } from "../../../utils/stronTime.util.js";
import { assertKycComplete } from "../../../utils/stronOrganizerVerification.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

const round2 = (value: unknown) => Math.round((Number(value) || 0) * 100) / 100;

// Aggregate captured (non-refunded) sales and refunds for an event.
export const computeTotals = async (eventKey: string) => {
  const rows = await Transaction.find({
    eventKey,
    listingType: "stron_managed",
    status: { $in: ["captured", "refunded"] },
  })
    .select("status ticketPrice gatewayFee platformCommission organizerNet")
    .lean();

  const totals = {
    participantCount: 0,
    grossTicketSales: 0,
    totalGatewayFees: 0,
    totalPlatformCommission: 0,
    totalRefunds: 0,
    netPayable: 0,
  };

  for (const row of rows) {
    if (row.status === "captured") {
      totals.participantCount += 1;
      totals.grossTicketSales += Number(row.ticketPrice || 0);
      totals.totalGatewayFees += Number(row.gatewayFee || 0);
      totals.totalPlatformCommission += Number(row.platformCommission || 0);
      totals.netPayable += Number(row.organizerNet || 0);
    } else {
      totals.totalRefunds += Number(row.ticketPrice || 0);
    }
  }

  return {
    participantCount: totals.participantCount,
    grossTicketSales: round2(totals.grossTicketSales),
    totalGatewayFees: round2(totals.totalGatewayFees),
    totalPlatformCommission: round2(totals.totalPlatformCommission),
    totalRefunds: round2(totals.totalRefunds),
    netPayable: round2(totals.netPayable),
  };
};

// Create (or refresh) the settlement record for a completed event. Owner-only.
export const initSettlement = async ({ uid, eventKey }: ServiceParams) => {
  const event = await StronEvent.findOne({ key: eventKey });
  if (!event) {
    throw codedError("event_not_found", "Event not found.");
  }
  if (event.organizerUid !== uid) {
    throw codedError("not_owner", "You do not manage this event.");
  }
  if (!["completed", "settled"].includes(event.status)) {
    throw codedError("invalid_state", "Settlement is available after the event completes.");
  }

  const organizer = await StronOrganizer.findOne({ uid });
  assertKycComplete(organizer as Parameters<typeof assertKycComplete>[0]);
  if (!organizer?.kyc) {
    throw codedError("kyc_incomplete", "Complete KYC before requesting settlement.");
  }

  const totals = await computeTotals(eventKey);
  const { settlementMinBusinessDays, settlementMaxBusinessDays } = getStronConfig();

  const existing = await StronSettlement.findOne({ eventKey });
  if (existing && existing.status === "released") {
    return existing;
  }

  const update: MongoFilter = {
    organizerUid: uid,
    ...totals,
    status: totals.netPayable > 0 ? "ready" : "released",
    bankSnapshot: {
      pan: organizer.kyc.pan,
      bankAccountHolderName: organizer.kyc.bankAccountHolderName,
      bankAccountNumber: organizer.kyc.bankAccountNumber,
      ifsc: organizer.kyc.ifsc,
    },
    expectedReleaseBy: addBusinessDays(new Date(), settlementMaxBusinessDays),
  };

  // A zero-payout settlement (no sales) is closed immediately with nothing to pay.
  if (totals.netPayable <= 0) {
    update.releasedAt = new Date();
    update.releaseReference = "no_payout";
    await StronEvent.updateOne(
      { key: eventKey, status: "completed" },
      { $set: { status: "settled", settledAt: new Date() } },
    );
  }

  const settlement = await StronSettlement.findOneAndUpdate(
    { eventKey },
    { $set: update, $setOnInsert: { eventKey } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return settlement;
};

// Finance/admin action OR event owner (temporary until a real admin console exists):
// mark a ready settlement as released and settle the event.
export const releaseSettlement = async ({
  eventKey,
  reference = null,
  uid = null,
  isAdmin = false,
}: {
  eventKey: string;
  reference?: unknown;
  uid?: string | null;
  isAdmin?: boolean;
}) => {
  const settlement = await StronSettlement.findOne({ eventKey });
  if (!settlement) {
    throw codedError("settlement_not_found", "Settlement not found. Initialize it first.");
  }
  if (settlement.status === "released") {
    return settlement;
  }
  if (settlement.status !== "ready") {
    throw codedError("invalid_state", "Only a ready settlement can be released.");
  }

  let effectiveIsAdmin = isAdmin;
  if (!effectiveIsAdmin && uid) {
    const user = await UserModel.findOne({ uid }).select("email").lean();
    effectiveIsAdmin = isUserAdmin(user?.email);
  }

  const isOwner = Boolean(uid && settlement.organizerUid === uid);
  if (!effectiveIsAdmin && !isOwner) {
    throw codedError(
      "not_owner",
      "Only the event organizer or finance/admin can release this settlement.",
    );
  }

  settlement.status = "released";
  settlement.releasedAt = new Date();
  settlement.releaseReference = reference
    ? String(reference).trim()
    : isAdmin
      ? `admin_${Date.now()}`
      : `organizer_${Date.now()}`;
  await settlement.save();

  await StronEvent.updateOne(
    { key: eventKey },
    { $set: { status: "settled", settledAt: new Date() } },
  );
  return settlement;
};

export const getSettlement = async ({ uid, eventKey }: ServiceParams) => {
  const settlement = await StronSettlement.findOne({ eventKey });
  if (!settlement) {
    // Fall back to a live preview so organizers can see projected totals pre-init.
    const event = await StronEvent.findOne({ key: eventKey });
    if (!event) {
      throw codedError("event_not_found", "Event not found.");
    }
    if (event.organizerUid !== uid) {
      throw codedError("not_owner", "You do not manage this event.");
    }
    const totals = await computeTotals(eventKey);
    return { eventKey, organizerUid: uid, status: "preview", ...totals };
  }
  if (settlement.organizerUid !== uid) {
    throw codedError("not_owner", "You do not manage this settlement.");
  }
  return settlement;
};

export const listOrganizerSettlements = async (uid: string) =>
  StronSettlement.find({ organizerUid: uid }).sort({ createdAt: -1 });

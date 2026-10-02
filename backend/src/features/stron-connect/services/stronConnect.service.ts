// Connect QR orchestration: user connect, station/ticket scan, gym/event check-in.

import mongoose from "mongoose";
import { UserModel } from "../../identity-auth/index.js";
import StronConnectScan from "../models/stronConnectScan.model.js";
import { Business } from "../../gym-business/index.js";
import { StronEvent } from "../../managed-events/index.js";
import { getErrorCode } from "../../../types/errors.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import { asPopulatedPlan, type ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import {
  parseStationQrPayload,
  parseTicketQrPayload,
  parseUserConnectPayload,
} from "../../../utils/stronConnectQr.util.js";
import { checkInGymForScanner } from "./stronConnectGym.service.js";
import {
  loadConnectCatalog,
  resolveSmartQrPair,
  resolveBusinessPartyCatalog,
} from "./stronConnectCatalog.service.js";
import { checkInWithStationQr as checkInWithStationQrImpl } from "./stronConnectStation.service.js";
import {
  loadEventAndParticipation,
  assertEventOpenForCheckIn,
  applyEventCheckIn,
  checkInWithTicketQr,
} from "./stronConnectEvent.service.js";
import {
  findLiveUser,
  rotateConnectCode,
  publicUserCard,
  getMyConnectQr,
  listMyConnectScans,
} from "./stronConnectProfile.service.js";
import {
  CHECKIN_PROOF_TTL_MS,
  CONNECT_CODE_TTL_MS,
  SCANNER_SELECT,
  LIVE_USER,
} from "../../../constants/index.js";

export {
  CHECKIN_PROOF_TTL_MS,
  CONNECT_CODE_TTL_MS,
  getMyConnectQr,
  listMyConnectScans,
  rotateConnectCode,
  publicUserCard,
};
export {
  parseStationQrPayload,
  parseTicketQrPayload,
  parseUserConnectPayload,
};


const assertObjectId = (value: unknown, fieldName: string) => {
  if (!mongoose.isValidObjectId(value)) {
    throw codedError("invalid_field", `Invalid ${fieldName} format.`);
  }
  return value;
};

const recordConnectScan = (fields: unknown) =>
  StronConnectScan.create({
    ...(fields as ServiceParams),
    rawPayload: (fields as ServiceParams).rawPayload
      ? String((fields as ServiceParams).rawPayload).slice(0, 500)
      : undefined,
  });

const loadRecentUserConnectProof = async ({ scannerUid, scanId }: ServiceParams) => {
  assertObjectId(scanId, "scanId");
  const scan = await StronConnectScan.findById(scanId).lean();
  if (!scan || scan.scannerUid !== scannerUid || scan.kind !== "user_connect") {
    throw codedError("forbidden", "Invalid check-in proof. Scan the partner QR again.");
  }
  if (!scan.targetUid) {
    throw codedError("forbidden", "Invalid check-in proof.");
  }
  if (Date.now() - new Date(scan.createdAt).getTime() > CHECKIN_PROOF_TTL_MS) {
    throw codedError("invalid_qr", "Check-in session expired. Scan the QR again.");
  }
  return scan;
};

export const checkInWithStationQr = (args: ServiceParams) =>
  checkInWithStationQrImpl({
    ...args,
    findLiveUser,
    rotateConnectCode,
    recordConnectScan,
  });

const resolveConnectTarget = async (raw: string) => {
  const userPayload = parseUserConnectPayload(raw);
  let targetUid = userPayload?.uid || null;
  let codeFromPayload = userPayload?.code || null;
  let preResolvedBusiness = null;
  let targetUser = null;

  if (userPayload?.businessId) {
    assertObjectId(userPayload.businessId, "businessId");
    preResolvedBusiness = await Business.findById(userPayload.businessId)
      .select("ownerId businessName location logo status")
      .lean();
    if (preResolvedBusiness) targetUid = preResolvedBusiness.ownerId;
  }

  if (targetUid) {
    targetUser = await findLiveUser(targetUid);
  } else if (/^[A-Za-z0-9]{5}$/.test(raw)) {
    const codeUpper = raw.toUpperCase();
    targetUser = await UserModel.findOne({ connectCode: codeUpper, ...LIVE_USER });
    if (targetUser) {
      targetUid = targetUser.uid ?? null;
      codeFromPayload = codeUpper;
    }
  }

  return { targetUid, targetUser, codeFromPayload, preResolvedBusiness };
};

export const scanConnectQr = async ({ scannerUid, payload }: ServiceParams) => {
  const raw = String(payload || "").trim();
  if (!raw) throw codedError("invalid_field", "QR payload is required.");

  const station = parseStationQrPayload(raw);
  if (station) {
    if (station.entityType === "gym" && mongoose.isValidObjectId(station.entityId)) {
      const scanner = await findLiveUser(scannerUid, { lean: true, select: SCANNER_SELECT });
      if (!scanner) throw codedError("user_not_found", "User not found.");
      const gymResult = await checkInGymForScanner({
        scannerUid,
        scanner,
        businessId: station.entityId,
      });
      await recordConnectScan({ scannerUid, kind: "gym_check_in", rawPayload: raw });
      return gymResult;
    }

    return checkInWithStationQr({
      scannerUid,
      entityType: station.entityType,
      entityId: station.entityId,
      entityName: station.entityName,
      rawPayload: raw,
    });
  }

  const ticket = parseTicketQrPayload(raw);
  if (ticket) {
    return checkInWithTicketQr({
      scannerUid,
      ticket,
      rawPayload: raw,
      findLiveUser,
      publicUserCard,
      recordConnectScan,
    });
  }

  const scannerPromise = findLiveUser(scannerUid, { lean: true, select: SCANNER_SELECT });
  const { targetUid, targetUser, codeFromPayload, preResolvedBusiness } =
    await resolveConnectTarget(raw);

  if (!targetUser) {
    throw codedError("invalid_qr", "This QR code or 5-digit code is invalid.");
  }
  if (targetUid === scannerUid) {
    const scanner = await scannerPromise;
    if (!scanner) throw codedError("user_not_found", "Scanner user not found.");
    const catalog = await loadConnectCatalog({
      targetUser,
      scannerUid,
      scanner,
      preResolvedBusiness,
    });
    const { businessDoc, formattedPlans, formattedEvents } = catalog;
    const biz = businessDoc as ServiceParams | null;
    // Self share / own code: show own business listings when present.
    if (biz || formattedPlans.length > 0 || formattedEvents.length > 0) {
      const me = publicUserCard(scanner);
      return {
        kind: "user_connect",
        scanId: "self",
        me,
        user: me,
        isSelfListing: true,
        message: "Viewing your business listing",
        hasMultiple: true,
        entityName: biz?.businessName || me.username || "My Business",
        business: biz
          ? {
              id: String(biz._id),
              businessName: biz.businessName,
              location: biz.location,
              logo: biz.logo,
              services: Array.isArray(biz.services) ? biz.services : [],
            }
          : null,
        plans: formattedPlans,
        events: formattedEvents,
        plansJson: JSON.stringify(formattedPlans),
        eventsJson: JSON.stringify(formattedEvents),
        organizerEvents: formattedEvents,
      };
    }
    throw codedError("invalid_state", "You cannot connect with your own QR.");
  }

  // Manual 5-char entry must match the live rotating code.
  // Stable QR / stron://user/{uid} payloads identify by uid only (no live code required).
  const isManualFiveCharEntry = /^[A-Za-z0-9]{5}$/.test(raw);
  if (isManualFiveCharEntry) {
    if (!targetUser.connectCode || targetUser.connectCode !== codeFromPayload) {
      throw codedError(
        "invalid_qr",
        "This code has expired or already been used. Ask for a new code.",
      );
    }
  }

  const scanner = await scannerPromise;
  if (!scanner) throw codedError("user_not_found", "Scanner user not found.");

  const [scan, pair] = await Promise.all([
    recordConnectScan({
      scannerUid,
      targetUid: targetUser.uid,
      kind: "user_connect",
      rawPayload: raw,
    }),
    resolveSmartQrPair({
      scanner,
      targetUser,
      preResolvedBusiness,
    }),
  ]);

  // Rotate display/manual code on the scanned QR owner only.
  await rotateConnectCode(targetUser);

  const {
    catalogForScanner,
    catalogForTarget,
    viewModeForScanner,
    viewModeForTarget,
  } = pair;

  // Smart QR PDF: scanner sees TARGET's offerings (or Explore).
  const {
    businessDoc,
    formattedPlans,
    formattedEvents,
  } = catalogForScanner;

  // Gym auto-attendance when scanner owns a gym and target is an active member.
  const scannerGym = catalogForTarget;
  const scannerBiz = scannerGym.businessDoc as ServiceParams | null;
  const isScannerGymOwner = Boolean(
    scannerBiz && String(scannerBiz.ownerId) === String(scannerUid),
  );
  let { alreadyCheckedInToday } = scannerGym;
  const memberDoc = scannerGym.memberDoc;
  const activeMembership = scannerGym.activeMembership;
  const pendingMembership = scannerGym.pendingMembership;
  const me = publicUserCard(scanner);
  const other = publicUserCard(targetUser);

  let checkedInNow = false;
  let newlyActivated = false;
  let attendanceError = null;
  if (
    isScannerGymOwner &&
    scannerBiz &&
    memberDoc &&
    (activeMembership || pendingMembership) &&
    !alreadyCheckedInToday
  ) {
    try {
      const { recordAttendance, getISTDateString } = await import("../../gym-business/services/attendance.service.js");
      const attendance = await recordAttendance({
        businessId: scannerBiz._id,
        markedBy: scannerUid,
        requireActiveMembership: true,
        attendanceData: {
          memberId: String(memberDoc._id),
          attendanceDate: getISTDateString(),
          source: "QR",
        },
      });
      checkedInNow = true;
      newlyActivated = Boolean(attendance?.accessGate?.isNewlyActivated);
    } catch (err: unknown) {
      if (
        getErrorCode(err) === "attendance_already_marked" ||
        getErrorMessage(err).includes("already marked")
      ) {
        alreadyCheckedInToday = true;
      } else {
        attendanceError = err;
      }
    }
  }

  const openCatalogForScanner = viewModeForScanner !== "explore";
  const openExploreForScanner = viewModeForScanner === "explore";
  const plansJson = JSON.stringify(formattedPlans);
  const eventsJson = JSON.stringify(formattedEvents);
  const isCheckedInSuccess = checkedInNow || alreadyCheckedInToday;

  let message = `${me.username || "You"} and ${other.username || "runner"} are connected`;
  if (isScannerGymOwner) {
    if (alreadyCheckedInToday) {
      message = `${other.username || "Member"} is already checked in today`;
    } else if (checkedInNow && newlyActivated) {
      const planName =
        asPopulatedPlan(activeMembership?.planId)?.name ||
        asPopulatedPlan(pendingMembership?.planId)?.name ||
        "Membership";
      message = `Checked in ${other.username || "Member"} — ${planName} activated on first check-in`;
    } else if (checkedInNow) {
      const planName =
        asPopulatedPlan(activeMembership?.planId)?.name ||
        asPopulatedPlan(pendingMembership?.planId)?.name ||
        "Membership";
      message = `Checked in ${other.username || "Member"} (${planName})`;
    } else if ((activeMembership || pendingMembership) && attendanceError) {
      message =
        getErrorMessage(attendanceError) ||
        `Could not record attendance for ${other.username || "Member"}`;
    } else if (openCatalogForScanner) {
      message = `Connected. Showing ${other.username || "partner"}'s plans & listings.`;
    } else {
      message = `${other.username || "User"} connected — open Explore to discover more.`;
    }
  } else if (openExploreForScanner) {
    message = `Connected with ${other.username || "runner"}. Explore STRON for plans & events.`;
  } else {
    message = `Connected with ${other.username || "runner"}. Here are their plans & listings.`;
  }

  const catalogBiz = businessDoc as ServiceParams | null;
  const entityName =
    catalogBiz?.businessName ||
    other.username ||
    (openExploreForScanner ? "Explore STRON" : "STRON Partner");

  return {
    kind: "user_connect",
    scanId: String(scan._id),
    targetUid: targetUser.uid,
    providerUid: catalogBiz?.ownerId || targetUser.uid,
    customerUid: scannerUid,
    // Smart QR matrix (PDF)
    viewMode: viewModeForScanner,
    counterpartViewMode: viewModeForTarget,
    openCatalogForScanner,
    openExploreForScanner,
    me,
    user: other,
    provider: publicUserCard(targetUser),
    isProviderScan: Boolean(isScannerGymOwner),
    alreadyCheckedIn: Boolean(alreadyCheckedInToday),
    checkedIn: Boolean(isCheckedInSuccess),
    isNewlyActivated: Boolean(newlyActivated),
    message,
    hasMultiple: openCatalogForScanner,
    entityName,
    business: catalogBiz
      ? {
          id: String(catalogBiz._id),
          businessName: catalogBiz.businessName,
          location: catalogBiz.location,
          logo: catalogBiz.logo,
          services: Array.isArray(catalogBiz.services) ? catalogBiz.services : [],
        }
      : null,
    member: memberDoc
      ? {
          id: String(memberDoc._id),
          name: memberDoc.name,
          status: memberDoc.status,
          hasActiveMembership: Boolean(activeMembership),
          activePlanName: asPopulatedPlan(activeMembership?.planId)?.name || null,
          activeMembershipEndDate: activeMembership?.endDate || null,
          alreadyCheckedInToday: alreadyCheckedInToday || checkedInNow,
        }
      : null,
    plans: openCatalogForScanner ? formattedPlans : [],
    events: openCatalogForScanner ? formattedEvents : [],
    plansJson: openCatalogForScanner ? plansJson : "[]",
    eventsJson: openCatalogForScanner ? eventsJson : "[]",
    organizerEvents: openCatalogForScanner ? formattedEvents : [],
  };
};

export const checkInDirect = async ({
  scannerUid,
  type,
  eventKey,
  businessId,
  memberId,
  scanId,
}: ServiceParams) => {
  const proof = await loadRecentUserConnectProof({ scannerUid, scanId });

  if (type === "event") {
    if (!eventKey) throw codedError("invalid_field", "eventKey is required for event check-in.");
    const isScannerOrganizer = await StronEvent.exists({
      key: eventKey,
      organizerUid: scannerUid,
      isDeleted: { $ne: true },
    });

    const targetParticipantUid = isScannerOrganizer ? proof.targetUid : scannerUid;
    const [event, participation] = await loadEventAndParticipation(String(eventKey), targetParticipantUid);
    if (!event) throw codedError("event_not_found", "Event not found.");
    assertEventOpenForCheckIn(event);

    if (event.organizerUid !== proof.targetUid && event.organizerUid !== scannerUid) {
      throw codedError(
        "forbidden",
        "That event does not belong to the partner QR session.",
      );
    }
    if (!participation) {
      throw codedError(
        "not_enrolled",
        `Participant is not enrolled in "${event.title}". Please register first.`,
      );
    }

    let result;
    let isAlreadyCheckedIn = false;
    try {
      result = await applyEventCheckIn({
        scannerUid,
        participation,
        participantUid: targetParticipantUid,
        eventKey,
        ticketNumber: participation.ticketNumber,
        rawPayload: undefined,
        eventTitle: event.title,
        recordConnectScan,
      });
    } catch (err: unknown) {
      if (
        getErrorCode(err) === "already_checked_in" ||
        getErrorMessage(err).includes("Already checked in")
      ) {
        isAlreadyCheckedIn = true;
        result = {
          alreadyCheckedIn: true,
          checkedInAt: participation.checkedInAt,
        };
      } else {
        throw err;
      }
    }

    return {
      kind: "event_check_in",
      alreadyCheckedIn: isAlreadyCheckedIn,
      title: event.title,
      checkedInAt: result.checkedInAt,
      message: isAlreadyCheckedIn
        ? `Already checked into ${event.title}.`
        : `Checked into ${event.title} successfully!`,
    };
  }

  if (type === "gym") {
    assertObjectId(businessId, "businessId");
    let business = await Business.findById(businessId)
      .select("ownerId businessName status")
      .lean();

    if (!business) {
      const MembershipPlan = (await import("../../gym-business/models/membershipPlan.model.js")).default;
      const plan = await MembershipPlan.findById(businessId).select("businessId").lean();
      if (plan?.businessId) {
        business = await Business.findById(plan.businessId).select("ownerId businessName status").lean();
        businessId = plan.businessId;
      }
    }

    if (!business || business.status === "SUSPENDED") {
      throw codedError("business_not_found", "Gym business not found.");
    }

    const isScannerOwner = business.ownerId === scannerUid;
    const isTargetOwner = business.ownerId === proof.targetUid;

    if (!isScannerOwner && !isTargetOwner) {
      throw codedError(
        "forbidden",
        "That gym does not belong to the partner QR session.",
      );
    }

    const scanner = await findLiveUser(scannerUid, { lean: true, select: SCANNER_SELECT });
    if (!scanner) throw codedError("user_not_found", "Scanner user not found.");

    const memberUser = isScannerOwner
      ? await findLiveUser(proof.targetUid, { lean: true, select: SCANNER_SELECT })
      : scanner;

    return checkInGymForScanner({
      scannerUid,
      scanner,
      memberUser,
      businessId,
      memberId,
    });
  }

  throw codedError("invalid_type", 'Invalid check-in type. Supported types: "event", "gym".');
};

/** Load partner plans/events by scan proof and/or targetUid / businessId. */
export const getConnectCatalogForScan = async ({
  scannerUid,
  scanId,
  targetUid: targetUidArg,
  businessId,
}: ServiceParams) => {
  const scanner = await findLiveUser(scannerUid, { lean: true, select: SCANNER_SELECT });
  if (!scanner) throw codedError("user_not_found", "User not found.");

  let explicitProviderUid = targetUidArg ? String(targetUidArg) : null;
  let preResolvedBusiness = null;
  let peerUser = null;

  if (businessId) {
    assertObjectId(businessId, "businessId");
    preResolvedBusiness = await Business.findById(businessId)
      .select("ownerId businessName location logo status services")
      .lean();
    if (!preResolvedBusiness) throw codedError("business_not_found", "Business not found.");
    explicitProviderUid = preResolvedBusiness.ownerId;
  } else if (scanId && scanId !== "self") {
    const proof = await loadRecentUserConnectProof({ scannerUid, scanId });
    // Two-way: resolve business party between the two people in the scan.
    const otherUid =
      proof.scannerUid === scannerUid ? proof.targetUid : proof.scannerUid;
    peerUser = await findLiveUser(otherUid);
    if (!peerUser) throw codedError("user_not_found", "Partner not found.");

    const resolved = await resolveBusinessPartyCatalog({
      scanner,
      targetUser: peerUser as ServiceParams,
      preResolvedBusiness: null,
    });
    const { catalog, providerUser, customerUid } = resolved;
    const { businessDoc, formattedPlans, formattedEvents } = catalog;
    const provider = providerUser as ServiceParams;
    const providerCard = publicUserCard(provider);
    const catalogBiz = businessDoc as ServiceParams | null;

    return {
      scanId,
      targetUid: provider.uid,
      providerUid: provider.uid,
      customerUid,
      entityName: catalogBiz?.businessName || providerCard.username || "STRON Partner",
      hasMultiple:
        formattedPlans.length > 0 || formattedEvents.length > 0 || Boolean(catalogBiz),
      business: catalogBiz
        ? {
            id: String(catalogBiz._id),
            businessName: catalogBiz.businessName,
            location: catalogBiz.location,
            logo: catalogBiz.logo,
            services: Array.isArray(catalogBiz.services) ? catalogBiz.services : [],
          }
        : null,
      plans: formattedPlans,
      events: formattedEvents,
      plansJson: JSON.stringify(formattedPlans),
      eventsJson: JSON.stringify(formattedEvents),
    };
  } else if (scanId === "self") {
    explicitProviderUid = String(scannerUid);
  }

  if (!explicitProviderUid) {
    throw codedError("invalid_field", "targetUid or scanId is required.");
  }

  const providerUser = await findLiveUser(explicitProviderUid);
  if (!providerUser) throw codedError("user_not_found", "Partner not found.");

  // When fetching by provider uid directly, customer is the requester
  // (unless requester IS the provider — still fine for self listing).
  const catalog = await loadConnectCatalog({
    targetUser: providerUser,
    scannerUid,
    scanner,
    preResolvedBusiness,
  });
  const { businessDoc, formattedPlans, formattedEvents } = catalog;
  const providerCard = publicUserCard(providerUser);
  const catalogBiz = businessDoc as ServiceParams | null;

  return {
    scanId: scanId || null,
    targetUid: providerUser.uid,
    providerUid: providerUser.uid,
    customerUid: scannerUid,
    entityName: catalogBiz?.businessName || providerCard.username || "STRON Partner",
    hasMultiple:
      formattedPlans.length > 0 || formattedEvents.length > 0 || Boolean(catalogBiz),
    business: catalogBiz
      ? {
          id: String(catalogBiz._id),
          businessName: catalogBiz.businessName,
          location: catalogBiz.location,
          logo: catalogBiz.logo,
          services: Array.isArray(catalogBiz.services) ? catalogBiz.services : [],
        }
      : null,
    plans: formattedPlans,
    events: formattedEvents,
    plansJson: JSON.stringify(formattedPlans),
    eventsJson: JSON.stringify(formattedEvents),
  };
};

export default {
  getMyConnectQr,
  listMyConnectScans,
  scanConnectQr,
  checkInDirect,
  checkInWithStationQr,
  getConnectCatalogForScan,
  rotateConnectCode,
  publicUserCard,
};

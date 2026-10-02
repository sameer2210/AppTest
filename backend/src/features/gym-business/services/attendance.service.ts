import Attendance from "../models/attendance.model.js";
import type { IAttendance } from "../types/index.js";
import { getErrorMessage, isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import {
  asPopulatedPlan,
  MongoFilter,
  PaginationQuery,
  ServiceParams,
} from "../../../types/service.util.js";
import Member from "../models/member.model.js";
import Membership from "../models/membership.model.js";
import { calculateEndDate, activateMembershipOnCheckIn } from "./membership.service.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

/**
 * Returns YYYY-MM-DD string in Asia/Kolkata timezone
 */
export const getISTDateString = (date = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
};

/**
 * Record member check-in (supports both MANUAL and QR-based attendance)
 */
export const recordAttendance = async ({
  businessId,
  markedBy,
  attendanceData,
  requireActiveMembership = false,
}: ServiceParams) => {
  let memberId = attendanceData.memberId;

  // Support smart QR payload decoding if raw QR token provided
  if (!memberId && attendanceData.qrPayload) {
    const raw = String(attendanceData.qrPayload).trim();
    try {
      const parsed = JSON.parse(raw);
      memberId = parsed.memberId || parsed.id;
    } catch {
      const match = raw.match(/^(?:stron:\/\/(?:member|user|station|gym)\/)?([0-9a-fA-F]{24})/);
      memberId = match?.[1] || raw;
    }
  }

  if (!memberId) {
    throw codedError("invalid_field", "Member ID or valid QR payload is required.");
  }

  const member = await Member.findOne({ _id: memberId, businessId, isDeleted: false }).lean();
  if (!member) {
    throw codedError("member_not_found", "Member not found in this gym.");
  }

  if (member.status === "BLOCKED") {
    throw codedError("forbidden", `Member "${member.name}" is blocked by gym administration.`);
  }

  const attendanceDate = attendanceData.attendanceDate || getISTDateString();
  const now = new Date();

  let [existing, activeMembership] = await Promise.all([
    Attendance.findOne({
      businessId,
      memberId: member._id,
      attendanceDate,
    })
      .select("checkedInAt")
      .lean(),
    Membership.findOne({
      businessId,
      memberId: member._id,
      status: "ACTIVE",
      endDate: { $gte: now },
    })
      .populate("planId", "name duration durationUnit billingCycle isFreeTrial trialDuration")
      .sort({ endDate: -1 }),
  ]);

  if (existing) {
    throw codedError(
      "attendance_already_marked",
      `Member "${member.name}" is already checked in for today (${attendanceDate}) at ${new Date(existing.checkedInAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    );
  }

  let newlyActivated = false;
  let activationMessage = null;

  // If no ACTIVE membership, auto-activate oldest PENDING membership on first check-in
  if (!activeMembership) {
    const activationResult = await activateMembershipOnCheckIn(member._id, businessId);
    if (activationResult.activated && activationResult.membership) {
      activeMembership = activationResult.membership;
      newlyActivated = activationResult.isNewlyActivated;
      activationMessage = activationResult.message;
    }
  }

  let accessStatus = "ALLOWED";
  let accessWarning = null;
  let daysLeft = 0;

  if (!activeMembership) {
    const lastMembership = await Membership.findOne({
      businessId,
      memberId: member._id,
    })
      .sort({ endDate: -1 })
      .lean();

    if (requireActiveMembership) {
      if (lastMembership) {
        throw codedError(
          "membership_expired",
          `Membership for "${member.name}" has expired. Renewal required.`,
        );
      }
      throw codedError(
        "no_membership",
        `No active membership found for "${member.name}".`,
      );
    }

    if (lastMembership) {
      accessStatus = "EXPIRED";
      accessWarning = "Membership has expired. Renewal required.";
    } else {
      accessStatus = "NO_MEMBERSHIP";
      accessWarning = "No active membership found for this member.";
    }
  } else if (activeMembership.endDate) {
    const diffMs = new Date(activeMembership.endDate).getTime() - now.getTime();
    daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (daysLeft <= 3 && !newlyActivated) {
      accessWarning = `Membership expiring soon (${daysLeft} day${daysLeft === 1 ? "" : "s"} left).`;
    }
  }

  const checkedInDate = attendanceData.checkedInAt ? new Date(attendanceData.checkedInAt) : new Date();
  const checkedOutDate = attendanceData.checkedOutAt ? new Date(attendanceData.checkedOutAt) : null;

  const inTime = attendanceData.inTime || checkedInDate.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const outTime = attendanceData.outTime || (checkedOutDate ? checkedOutDate.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }) : null);

  let attendance;
  try {
    attendance = await Attendance.create({
      businessId,
      memberId: member._id,
      attendanceDate,
      checkedInAt: checkedInDate,
      checkedOutAt: checkedOutDate,
      inTime,
      outTime,
      source: attendanceData.source || (attendanceData.qrPayload ? "QR" : "MANUAL"),
      markedBy: markedBy || null,
    });
  } catch (err: unknown) {
    if (isMongoDuplicateKeyError(err)) {
      throw codedError(
        "attendance_already_marked",
        `Member "${member.name}" is already checked in for today (${attendanceDate}).`,
      );
    }
    throw err;
  }

  return {
    ...attendance.toObject(),
    member: {
      _id: member._id,
      name: member.name,
      phone: member.phone,
      profileImage: member.profileImage,
      status: member.status,
    },
    accessGate: {
      status: accessStatus,
      warning: accessWarning,
      daysLeft,
      planName: asPopulatedPlan(activeMembership?.planId)?.name || null,
      expiryDate: activeMembership?.endDate || null,
      isNewlyActivated: newlyActivated,
      activationMessage: newlyActivated ? (activationMessage || "Plan activated on check-in.") : null,
    },
    message: newlyActivated
      ? `Welcome to ${member.name}! Your plan "${asPopulatedPlan(activeMembership?.planId)?.name || "Membership"}" has been activated.`
      : `Check-in successful for ${member.name}.`,
  };
};

/**
 * List attendance records for gym
 */
export const listAttendance = async ({
  businessId,
  queryParams = {},
}: {
  businessId: unknown;
  queryParams?: PaginationQuery;
}) => {
  const { page = 1, limit = 20, skip = 0, date, from, to, memberId } = queryParams;

  const query: MongoFilter = { businessId };
  if (memberId) query.memberId = memberId;

  if (date) {
    query.attendanceDate = date;
  } else if (from || to) {
    const dateRange: MongoFilter = {};
    if (from) dateRange.$gte = from;
    if (to) dateRange.$lte = to;
    query.attendanceDate = dateRange;
  }

  const [total, records] = await Promise.all([
    Attendance.countDocuments(query),
    Attendance.find(query)
      .populate("memberId", "name phone email profileImage gender status")
      .sort({ checkedInAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    attendance: records,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

/**
 * Get attendance history for a single member
 */
export const getMemberAttendanceHistory = async ({
  businessId,
  memberId,
  queryParams = {},
}: {
  businessId: unknown;
  memberId: unknown;
  queryParams?: PaginationQuery;
}) => {
  const { page = 1, limit = 20, skip = 0 } = queryParams;

  const query = { businessId, memberId };

  const [total, records] = await Promise.all([
    Attendance.countDocuments(query),
    Attendance.find(query).sort({ attendanceDate: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    attendance: records,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

export default {
  recordAttendance,
  listAttendance,
  getMemberAttendanceHistory,
  getISTDateString,
};

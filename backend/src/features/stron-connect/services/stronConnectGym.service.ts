import mongoose from "mongoose";
import { Business, Member, getISTDateString, recordAttendance } from "../../gym-business/index.js";
import { getErrorCode } from "../../../types/errors.js";
import { getErrorMessage } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

export const digitsOnly = (value: unknown) => String(value || "").replace(/\D/g, "");

const assertObjectId = (value: unknown, fieldName: string) => {
  if (!mongoose.isValidObjectId(value)) {
    throw codedError("invalid_field", `Invalid ${fieldName} format.`);
  }
  return value;
};

/**
 * Build phone match candidates from a verified scanner phone only.
 */
const scannerPhoneCandidates = (scanner: ServiceParams) => {
  const phones = new Set();
  const rawPhone = String(scanner?.contactNo || scanner?.phone || "").trim();
  const phoneDigits = digitsOnly(rawPhone);
  if (!scanner?.phoneVerified || !phoneDigits) return phones;

  phones.add(rawPhone);
  phones.add(phoneDigits);
  phones.add(`+${phoneDigits}`);

  if (phoneDigits.length === 10) {
    phones.add(`+91${phoneDigits}`);
    phones.add(`91${phoneDigits}`);
  } else if (phoneDigits.length > 10) {
    const last10 = phoneDigits.slice(-10);
    phones.add(`+91${last10}`);
    phones.add(`91${last10}`);
  }

  return phones;
};

/**
 * Resolve the gym Member row for the authenticated scanner.
 */
export const findGymMemberForScanner = async ({
  scanner,
  businessId,
  requireIdentity = false,
}: ServiceParams) => {
  assertObjectId(businessId, "businessId");

  const phones = scannerPhoneCandidates(scanner);
  if (!phones.size) {
    if (requireIdentity) {
      throw codedError(
        "forbidden",
        "Verify your phone before checking in at a gym.",
      );
    }
    return null;
  }

  const matches = await Member.find({
    businessId,
    isDeleted: false,
    phone: { $in: [...phones] },
  }).lean();

  if (matches.length > 1) {
    throw codedError(
      "conflict",
      "Multiple gym members match your verified phone. Ask the gym to update your profile.",
    );
  }

  return matches[0] || null;
};

export const checkInGymForScanner = async ({
  scannerUid,
  scanner,
  businessId,
  memberId = undefined,
  memberUser = undefined,
}: {
  scannerUid: unknown;
  scanner: unknown;
  businessId: unknown;
  memberId?: unknown;
  memberUser?: unknown;
}) => {
  if (!businessId) {
    throw codedError("invalid_field", "businessId is required for gym check-in.");
  }
  assertObjectId(businessId, "businessId");

  let targetBusiness = await Business.findById(businessId).select("businessName status ownerId").lean();
  if (!targetBusiness) {
    const MembershipPlan = (await import("../../gym-business/models/membershipPlan.model.js")).default;
    const plan = await MembershipPlan.findById(businessId).select("businessId").lean();
    if (plan?.businessId) {
      targetBusiness = await Business.findById(plan.businessId).select("businessName status ownerId").lean();
      businessId = plan.businessId;
    }
  }

  const effectiveScanner = memberUser || scanner;
  const member = await findGymMemberForScanner({
    scanner: effectiveScanner,
    businessId,
    requireIdentity: true,
  });

  if (!targetBusiness || targetBusiness.status === "SUSPENDED") {
    throw codedError("business_not_found", "Gym business not found.");
  }

  if (!member) {
    throw codedError(
      "member_not_found",
      "No gym membership is linked to your verified phone.",
    );
  }

  if (memberId) {
    assertObjectId(memberId, "memberId");
    if (String(member._id) !== String(memberId)) {
      throw codedError("forbidden", "You can only check in as yourself.");
    }
  }

  let attendance;
  try {
    attendance = await recordAttendance({
      businessId: targetBusiness._id,
      markedBy: scannerUid,
      requireActiveMembership: true,
      attendanceData: {
        memberId: String(member._id),
        attendanceDate: getISTDateString(),
        source: "QR",
      },
    });
  } catch (err: unknown) {
    if (
      getErrorCode(err) === "attendance_already_marked" ||
      getErrorMessage(err).includes("already marked") ||
      getErrorMessage(err).includes("already checked in")
    ) {
      return {
        kind: "gym_check_in",
        alreadyCheckedIn: true,
        gymId: String(targetBusiness._id),
        gymName: targetBusiness.businessName,
        message: getErrorMessage(err) || `Already checked into ${targetBusiness.businessName} today.`,
      };
    }
    throw err;
  }

  const isNewlyActivated = attendance.accessGate?.isNewlyActivated;
  const message = isNewlyActivated
    ? `Checked into ${targetBusiness.businessName}! Your plan "${attendance.accessGate?.planName || "Membership"}" has been activated.`
    : `Checked into ${targetBusiness.businessName} successfully!`;

  return {
    kind: "gym_check_in",
    alreadyCheckedIn: false,
    gymId: String(targetBusiness._id),
    gymName: targetBusiness.businessName,
    checkedInAt: attendance.checkedInAt,
    accessGate: attendance.accessGate,
    isNewlyActivated: Boolean(isNewlyActivated),
    message,
  };
};

export default {
  findGymMemberForScanner,
  checkInGymForScanner,
};

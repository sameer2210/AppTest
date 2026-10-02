import mongoose from "mongoose";
import StaffMember from "../models/staffMember.model.js";
import Member from "../models/member.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Business from "../models/business.model.js";
import { UserModel } from "../../identity-auth/index.js";
import { notifyUser } from "../../managed-events/index.js";
import { resolveCustomerUidForMember } from "./gymLifecycleNotify.service.js";
import { normalizeIndianPhone } from "../../../utils/phone.util.js";
import { buildPublicJoinUrl, GYM_NOTIFY_TAGS } from "../../../constants/index.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import { logger } from "../../../utils/logger.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import type { IStaffMember, StaffListItem } from "../types/index.js";

const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const ACTIVE_STAFF_STATUSES = ["IN_PROGRESS", "ACTIVE", "REJECTED"] as const;

const assertSplit = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
    throw codedError("invalid_split", "splitPercent must be an integer between 0 and 100.");
  }
  return parsed;
};

const mapListStatus = (status?: string): string | { $in: string[] } | null => {
  if (!status || status === "ALL") return { $in: [...ACTIVE_STAFF_STATUSES] };
  if (status === "PENDING") return "IN_PROGRESS";
  if (status === "REMOVED") return "REMOVED";
  return status;
};

const loadPlansCountByStaff = async (
  businessId: mongoose.Types.ObjectId,
  staffIds: mongoose.Types.ObjectId[],
): Promise<Map<string, number>> => {
  if (staffIds.length === 0) return new Map();
  const rows = await MembershipPlan.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
    {
      $match: {
        businessId,
        isDeleted: false,
        status: "ACTIVE",
        trainerIds: { $in: staffIds },
      },
    },
    { $unwind: "$trainerIds" },
    { $match: { trainerIds: { $in: staffIds } } },
    { $group: { _id: "$trainerIds", count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.count]));
};

const toStaffItem = (staff: IStaffMember, plansCount = 0): StaffListItem => ({
  id: String(staff._id),
  memberId: staff.memberId ? String(staff.memberId) : null,
  userId: staff.userId ?? null,
  name: staff.name,
  phone: staff.phone,
  profileImage: staff.profileImage ?? null,
  role: staff.role,
  status: staff.status,
  initiatedBy: staff.initiatedBy === "TRAINER" ? "TRAINER" : "GYM",
  splitPercent: staff.splitPercent,
  counterOfferPercent: staff.counterOfferPercent ?? null,
  plansCount,
  proposedAt: staff.proposedAt ?? null,
  respondedAt: staff.respondedAt ?? null,
  createdAt: staff.createdAt ?? null,
});

const findOwnedStaff = async (businessId: unknown, staffId: unknown) => {
  const staff = await StaffMember.findOne({
    _id: toObjectId(String(staffId)),
    businessId: toObjectId(String(businessId)),
    status: { $ne: "REMOVED" },
  });
  if (!staff) {
    throw codedError("staff_not_found", "Staff member not found.");
  }
  return staff;
};

const phoneCandidates = (phone: string) => {
  const digits = String(phone || "").replace(/\D/g, "");
  const set = new Set<string>();
  if (phone) set.add(phone);
  if (digits) {
    set.add(digits);
    set.add(`+${digits}`);
    const last10 = digits.slice(-10);
    if (last10.length === 10) {
      set.add(`+91${last10}`);
      set.add(`91${last10}`);
    }
  }
  return [...set];
};

const userOwnsProposal = async (staff: IStaffMember, userId: string) => {
  if (staff.userId && staff.userId === userId) return true;
  const user = await UserModel.findOne({ uid: userId }).select("uid contactNo").lean();
  if (!user) return false;
  const candidates = phoneCandidates(staff.phone);
  const contact = String(user.contactNo || "").replace(/\D/g, "");
  return candidates.some((value) => {
    const digits = value.replace(/\D/g, "");
    return value === user.contactNo || (contact && digits && (digits === contact || digits.slice(-10) === contact.slice(-10)));
  });
};

const isGymOwner = async (staff: IStaffMember, userId: string) => {
  const business = await Business.findById(staff.businessId).select("ownerId").lean();
  return Boolean(business?.ownerId && String(business.ownerId) === userId);
};

const applyTabFilter = (query: Record<string, unknown>, tab?: string) => {
  if (tab === "ACTIVE") {
    query.status = "ACTIVE";
    return;
  }
  if (tab === "REQUESTS") {
    query.status = "IN_PROGRESS";
    query.initiatedBy = "TRAINER";
    return;
  }
  if (tab === "SENT") {
    query.status = { $in: ["IN_PROGRESS", "REJECTED"] };
    query.$or = [{ initiatedBy: "GYM" }, { initiatedBy: { $exists: false } }, { initiatedBy: null }];
  }
};

export const countStaffNeedingAttention = async ({ businessId }: ServiceParams): Promise<number> =>
  StaffMember.countDocuments({
    businessId,
    status: { $in: ["IN_PROGRESS", "REJECTED"] },
  });

export const listStaff = async ({ businessId, status, tab }: ServiceParams): Promise<StaffListItem[]> => {
  const id = toObjectId(String(businessId));
  const query: Record<string, unknown> = { businessId: id };
  if (tab) {
    applyTabFilter(query, String(tab));
  } else {
    const statusFilter = mapListStatus(status);
    if (statusFilter) query.status = statusFilter;
  }

  const rows = (await StaffMember.find(query).sort({ createdAt: -1 }).lean()) as IStaffMember[];
  const counts = await loadPlansCountByStaff(
    id,
    rows.map((row) => toObjectId(String(row._id))),
  );
  return rows.map((row) => toStaffItem(row, counts.get(String(row._id)) || 0));
};

export const proposePartnership = async ({
  businessId,
  memberId,
  phone,
  name,
  role = "TRAINER",
  splitPercent,
  profileImage,
}: ServiceParams): Promise<StaffListItem> => {
  const id = toObjectId(String(businessId));
  const split = assertSplit(splitPercent);

  let member: {
    _id?: unknown;
    name?: string;
    phone?: string;
    profileImage?: string | null;
  } | null = null;

  if (memberId) {
    member = await Member.findOne({
      _id: toObjectId(String(memberId)),
      businessId: id,
      isDeleted: false,
    }).lean();
    if (!member) {
      throw codedError("member_not_found", "Member not found.");
    }
  }

  const rawPhone = member?.phone || phone;
  const normalizedPhone = normalizeIndianPhone(rawPhone);
  if (!normalizedPhone) {
    throw codedError("invalid_field", "A valid phone number is required.");
  }

  const staffName = String(member?.name || name || "").trim();
  if (staffName.length < 2) {
    throw codedError("invalid_field", "Staff name is required.");
  }

  const existing = await StaffMember.findOne({
    businessId: id,
    phone: normalizedPhone,
    status: { $in: [...ACTIVE_STAFF_STATUSES] },
  }).lean();
  if (existing) {
    throw codedError("staff_already_exists", "This person is already on the staff list.");
  }

  try {
    const created = await StaffMember.create({
      businessId: id,
      memberId: member?._id || (memberId ? toObjectId(String(memberId)) : null),
      name: staffName,
      phone: normalizedPhone,
      profileImage: profileImage || member?.profileImage || null,
      role: role === "MODERATOR" ? "MODERATOR" : "TRAINER",
      status: "IN_PROGRESS",
      initiatedBy: "GYM",
      splitPercent: split,
      proposedAt: new Date(),
    });

    const business = await Business.findById(id).select("businessName").lean();
    const uid = await resolveCustomerUidForMember(member || { phone: normalizedPhone });
    if (uid) {
      try {
        await notifyUser(
          uid,
          "Partnership proposal",
          `${business?.businessName || "A gym"} invited you to join as ${created.role === "MODERATOR" ? "a moderator" : "a trainer"}.`,
          {
            tag: GYM_NOTIFY_TAGS.STAFF_PROPOSAL,
            data: { kind: "staff_proposal", staffId: String(created._id), businessId: String(id) },
          },
        );
      } catch (error) {
        logger.warn("[staff] proposal notification failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return toStaffItem(created.toObject() as IStaffMember, 0);
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw codedError("staff_already_exists", "This person is already on the staff list.");
    }
    throw error;
  }
};

export const updateProposal = async ({
  businessId,
  staffId,
  splitPercent,
}: ServiceParams): Promise<StaffListItem> => {
  const split = assertSplit(splitPercent);
  const staff = await findOwnedStaff(businessId, staffId);
  if (staff.status === "ACTIVE") {
    throw codedError("proposal_not_pending", "This partnership is already active.");
  }

  staff.splitPercent = split;
  staff.status = "IN_PROGRESS";
  staff.initiatedBy = "GYM";
  staff.counterOfferPercent = null;
  staff.proposedAt = new Date();
  staff.respondedAt = null;
  await staff.save();
  return toStaffItem(staff.toObject() as IStaffMember);
};

export const respondToProposal = async ({
  staffId,
  userId,
  action,
  counterOfferPercent,
}: ServiceParams): Promise<StaffListItem> => {
  const staff = await StaffMember.findOne({
    _id: toObjectId(String(staffId)),
    status: { $ne: "REMOVED" },
  });
  if (!staff) {
    throw codedError("staff_not_found", "Staff proposal not found.");
  }
  if (staff.status !== "IN_PROGRESS") {
    throw codedError("proposal_not_pending", "This proposal is not waiting for a response.");
  }

  const initiatedBy = staff.initiatedBy === "TRAINER" ? "TRAINER" : "GYM";
  if (initiatedBy === "TRAINER") {
    if (!(await isGymOwner(staff.toObject() as IStaffMember, String(userId)))) {
      throw codedError("forbidden", "Only the gym can respond to this trainer request.");
    }
  } else if (!(await userOwnsProposal(staff.toObject() as IStaffMember, String(userId)))) {
    throw codedError("forbidden", "You cannot respond to this proposal.");
  }

  if (initiatedBy === "GYM") {
    staff.userId = String(userId);
  }
  staff.respondedAt = new Date();

  if (action === "ACCEPT") {
    staff.status = "ACTIVE";
  } else if (action === "REJECT") {
    staff.status = "REJECTED";
  } else if (action === "COUNTER") {
    staff.counterOfferPercent = assertSplit(counterOfferPercent);
  } else {
    throw codedError("invalid_field", "action must be ACCEPT, REJECT, or COUNTER.");
  }

  await staff.save();
  return toStaffItem(staff.toObject() as IStaffMember);
};

export const applyAsTrainer = async ({
  userId,
  businessId,
  slug,
  splitPercent,
  role = "TRAINER",
}: ServiceParams): Promise<StaffListItem> => {
  const split = assertSplit(splitPercent);
  const user = await UserModel.findOne({ uid: String(userId) })
    .select("uid username contactNo profileImageUrl")
    .lean();
  if (!user) {
    throw codedError("user_not_found", "User profile not found.");
  }

  const normalizedPhone = normalizeIndianPhone(user.contactNo);
  if (!normalizedPhone) {
    throw codedError("invalid_field", "A valid phone number is required on your profile.");
  }

  const staffName = String(user.username || "").trim();
  if (staffName.length < 2) {
    throw codedError("invalid_field", "Set a name on your profile before applying.");
  }

  const business = businessId
    ? await Business.findById(businessId).select("_id ownerId businessName status slug").lean()
    : await Business.findOne({ slug: String(slug).trim().toLowerCase() })
        .select("_id ownerId businessName status slug")
        .lean();
  if (!business) {
    throw codedError("business_not_found", "Gym not found.");
  }
  if (business.status === "SUSPENDED") {
    throw codedError("business_suspended", "This gym business account is suspended.");
  }
  if (String(business.ownerId) === String(userId)) {
    throw codedError("invalid_field", "You cannot apply to your own gym.");
  }

  const id = toObjectId(String(business._id));
  const existing = await StaffMember.findOne({
    businessId: id,
    phone: normalizedPhone,
    status: { $in: [...ACTIVE_STAFF_STATUSES] },
  }).lean();
  if (existing) {
    throw codedError("staff_already_exists", "You already have a staff request with this gym.");
  }

  const profileImage =
    typeof user.profileImageUrl === "string" && /^https?:\/\//i.test(user.profileImageUrl)
      ? user.profileImageUrl
      : null;

  try {
    const created = await StaffMember.create({
      businessId: id,
      memberId: null,
      userId: String(userId),
      name: staffName,
      phone: normalizedPhone,
      profileImage,
      role: role === "MODERATOR" ? "MODERATOR" : "TRAINER",
      status: "IN_PROGRESS",
      initiatedBy: "TRAINER",
      splitPercent: split,
      proposedAt: new Date(),
    });
    return toStaffItem(created.toObject() as IStaffMember, 0);
  } catch (error) {
    if (isMongoDuplicateKeyError(error)) {
      throw codedError("staff_already_exists", "You already have a staff request with this gym.");
    }
    throw error;
  }
};

export const removeStaff = async ({ businessId, staffId }: ServiceParams): Promise<StaffListItem> => {
  const id = toObjectId(String(businessId));
  const staff = await findOwnedStaff(id, staffId);
  staff.status = "REMOVED";
  staff.removedAt = new Date();
  await staff.save();

  await MembershipPlan.updateMany(
    { businessId: id, trainerIds: staff._id },
    { $pull: { trainerIds: staff._id } },
  );

  return toStaffItem(staff.toObject() as IStaffMember, 0);
};

export const setPlanTrainers = async ({
  businessId,
  planId,
  trainerIds,
}: ServiceParams) => {
  const id = toObjectId(String(businessId));
  const ids = (Array.isArray(trainerIds) ? trainerIds : []).map((value) => toObjectId(String(value)));

  const plan = await MembershipPlan.findOne({
    _id: toObjectId(String(planId)),
    businessId: id,
    isDeleted: false,
  });
  if (!plan) {
    throw codedError("plan_not_found", "Membership plan not found.");
  }

  if (ids.length > 0) {
    const active = await StaffMember.countDocuments({
      _id: { $in: ids },
      businessId: id,
      status: "ACTIVE",
    });
    if (active !== ids.length) {
      throw codedError("staff_not_found", "Every trainer must be active staff of this gym.");
    }
  }

  plan.trainerIds = ids;
  await plan.save();
  return plan.toObject();
};

export const getInviteLink = async ({ businessId, business }: ServiceParams) => {
  const profile =
    business ||
    (await Business.findById(businessId).select("slug").lean());
  const slug = profile?.slug ? String(profile.slug) : null;
  if (!slug) {
    throw codedError("invalid_field", "Set a business slug before sharing an invite link.");
  }
  const inviteUrl = buildPublicJoinUrl(slug, "role=trainer");
  return { inviteUrl, slug };
};

export default {
  listStaff,
  proposePartnership,
  applyAsTrainer,
  updateProposal,
  respondToProposal,
  removeStaff,
  setPlanTrainers,
  getInviteLink,
  countStaffNeedingAttention,
};

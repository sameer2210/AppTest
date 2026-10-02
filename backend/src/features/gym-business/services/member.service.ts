import mongoose from "mongoose";
import type { PipelineStage } from "mongoose";
import Member from "../models/member.model.js";
import Membership from "../models/membership.model.js";
import MembershipPlan from "../models/membershipPlan.model.js";
import Payment from "../models/payment.model.js";
import Attendance from "../models/attendance.model.js";
import Business from "../models/business.model.js";
import { UserModel } from "../../identity-auth/index.js";
import type { IMember } from "../types/index.js";
import { buildPaginationMeta } from "../../../utils/pagination.js";
import { buildContactNoMemberPhoneMatchExpr } from "../../../utils/phoneMatch.util.js";
import { ANALYTICS_EVENTS, trackEvent } from "../../../services/analytics.service.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import { buildPublicJoinUrl, buildPublicPayUrl, LIVE_USER } from "../../../constants/index.js";
import { canonicalMemberPhone, phoneMatchCandidates } from "../../../utils/phone.util.js";
import {
  MongoFilter,
  PaginationQuery,
  ServiceParams,
} from "../../../types/service.util.js";

const toObjectId = (id: string | mongoose.Types.ObjectId) => {
  if (id instanceof mongoose.Types.ObjectId) return id;
  return new mongoose.Types.ObjectId(id);
};

const publicImageUrl = (value: unknown): string | null => {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : null;
};

/**
 * List members with DB-level pagination, lookup aggregation, validity calculation, and category filters
 */
export const listMembers = async ({ businessId, paginationParams }: ServiceParams) => {
  const {
    page = 1,
    limit = 20,
    skip = 0,
    sort = { createdAt: -1 },
    search = "",
    status = "",
    category = "",
  } = (paginationParams || {}) as PaginationQuery;

  const bId = toObjectId(businessId);
  const matchQuery: MongoFilter = { businessId: bId, isDeleted: false };

  if (status === "BLOCKED") {
    matchQuery.status = "BLOCKED";
  } else if (status && status !== "ALL") {
    matchQuery.status = status;
  } else if (status !== "ALL") {
    matchQuery.status = { $ne: "BLOCKED" };
  }

  if (search) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const digits = String(search).trim().replace(/\D/g, "");
    const last10 = digits.slice(-10);
    matchQuery.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { phone: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      ...(last10.length >= 7 ? [{ phone: { $regex: last10 } }] : []),
    ];
  }

  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const pipeline: PipelineStage[] = [
    { $match: matchQuery },
    // Lookup matching user to resolve profileImageUrl if profileImage is not set on member
    {
      $lookup: {
        from: "users",
        let: { mPhone: "$phone", mEmail: "$email" },
        pipeline: [
          {
            $match: {
              $expr: {
                $or: [
                  buildContactNoMemberPhoneMatchExpr(),
                  {
                    $and: [
                      { $ne: ["$$mEmail", null] },
                      { $ne: ["$$mEmail", ""] },
                      { $eq: ["$email", "$$mEmail"] },
                    ],
                  },
                ],
              },
            },
          },
          { $project: { profileImageUrl: 1, uid: 1, username: 1 } },
          { $limit: 1 },
        ],
        as: "matchedUser",
      },
    },
    {
      $addFields: {
        profileImage: {
          $ifNull: [
            "$profileImage",
            { $arrayElemAt: ["$matchedUser.profileImageUrl", 0] },
          ],
        },
      },
    },
    {
      $project: {
        matchedUser: 0,
      },
    },
    // Lookup latest active / any membership for each member
    {
      $lookup: {
        from: "memberships",
        let: { mId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$memberId", "$$mId"] },
                  { $eq: ["$businessId", bId] },
                ],
              },
            },
          },
          // Prefer ACTIVE, then PENDING (not activated), then everything else
          {
            $addFields: {
              _statusRank: {
                $switch: {
                  branches: [
                    { case: { $eq: ["$status", "ACTIVE"] }, then: 0 },
                    { case: { $eq: ["$status", "PENDING"] }, then: 1 },
                    { case: { $eq: ["$status", "PAUSED"] }, then: 2 },
                  ],
                  default: 9,
                },
              },
            },
          },
          { $sort: { _statusRank: 1, endDate: -1, startDate: -1, createdAt: -1 } },
          { $limit: 1 },
          { $project: { _statusRank: 0 } },
          {
            $lookup: {
              from: "membershipplans",
              localField: "planId",
              foreignField: "_id",
              as: "planDetails",
            },
          },
          {
            $unwind: {
              path: "$planDetails",
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
        as: "membershipArray",
      },
    },
    {
      $addFields: {
        rawMembership: { $arrayElemAt: ["$membershipArray", 0] },
      },
    },
    {
      $project: {
        membershipArray: 0,
      },
    },
    // Compute validity daysLeft and status flags
    {
      $addFields: {
        activeMembership: {
          $cond: [
            { $not: ["$rawMembership"] },
            null,
            {
              _id: "$rawMembership._id",
              businessId: "$rawMembership.businessId",
              memberId: "$rawMembership.memberId",
              planId: "$rawMembership.planDetails",
              priceAtPurchase: "$rawMembership.priceAtPurchase",
              discountAmount: "$rawMembership.discountAmount",
              finalAmount: "$rawMembership.finalAmount",
              startDate: "$rawMembership.startDate",
              endDate: "$rawMembership.endDate",
              status: "$rawMembership.status",
              autoRenew: "$rawMembership.autoRenew",
              renewalStatus: "$rawMembership.renewalStatus",
              createdAt: "$rawMembership.createdAt",
              updatedAt: "$rawMembership.updatedAt",
            },
          ],
        },
        validity: {
          status: {
            $cond: [
              { $not: ["$rawMembership"] },
              "NO_MEMBERSHIP",
              "$rawMembership.status",
            ],
          },
          daysLeft: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              0,
              {
                $cond: [
                  { $ifNull: ["$rawMembership.endDate", false] },
                  {
                    $max: [
                      0,
                      {
                        $ceil: {
                          $divide: [
                            { $subtract: ["$rawMembership.endDate", now] },
                            1000 * 60 * 60 * 24,
                          ],
                        },
                      },
                    ],
                  },
                  0,
                ],
              },
            ],
          },
          isExpired: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              false,
              {
                $cond: [
                  { $ifNull: ["$rawMembership.endDate", false] },
                  {
                    $or: [
                      { $lt: ["$rawMembership.endDate", now] },
                      { $eq: ["$rawMembership.status", "EXPIRED"] },
                    ],
                  },
                  false,
                ],
              },
            ],
          },
          isAboutToExpire: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              false,
              {
                $cond: [
                  { $ifNull: ["$rawMembership.endDate", false] },
                  {
                    $and: [
                      { $gte: ["$rawMembership.endDate", now] },
                      { $lte: ["$rawMembership.endDate", in7Days] },
                      { $eq: ["$rawMembership.status", "ACTIVE"] },
                    ],
                  },
                  false,
                ],
              },
            ],
          },
          statusText: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              "Paid — awaiting first check-in.",
              {
                $cond: [
                  { $not: ["$rawMembership"] },
                  "No Active Plan",
                  {
                    $cond: [
                      { $lt: ["$rawMembership.endDate", now] },
                      "Expired",
                      "Active",
                    ],
                  },
                ],
              },
            ],
          },
          customerStatusText: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              "Plan purchased. Check in at the gym to activate.",
              {
                $cond: [
                  { $not: ["$rawMembership"] },
                  "No Active Plan",
                  {
                    $cond: [
                      { $lt: ["$rawMembership.endDate", now] },
                      "Expired",
                      "Active",
                    ],
                  },
                ],
              },
            ],
          },
          businessStatusText: {
            $cond: [
              { $eq: ["$rawMembership.status", "PENDING"] },
              "Paid — awaiting first check-in.",
              {
                $cond: [
                  { $not: ["$rawMembership"] },
                  "No Active Plan",
                  {
                    $cond: [
                      { $lt: ["$rawMembership.endDate", now] },
                      "Expired",
                      "Active",
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
    },
    {
      $addFields: {
        category: {
          $cond: [
            {
              $or: [
                { $not: ["$rawMembership"] },
                { $eq: ["$rawMembership.status", "PENDING"] },
                {
                  $and: [
                    { $eq: ["$rawMembership.status", "ACTIVE"] },
                    { $eq: ["$rawMembership.planDetails.isFreeTrial", true] },
                  ],
                },
              ],
            },
            "NEW_LEADS",
            {
              $cond: [
                "$validity.isExpired",
                "EXPIRED",
                {
                  $cond: [
                    "$validity.isAboutToExpire",
                    "ABOUT_TO_EXPIRE",
                    "MORE_THAN_WEEK",
                  ],
                },
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        rawMembership: 0,
      },
    },
  ];

  // Category filter
  const categoryUpper = String(category || "").toUpperCase();
  if (categoryUpper && categoryUpper !== "ALL") {
    if (categoryUpper === "ACTIVE") {
      pipeline.push({
        $match: {
          "activeMembership.status": "ACTIVE",
          "validity.isExpired": false,
          "activeMembership.planId.isFreeTrial": { $ne: true },
        },
      });
    } else if (categoryUpper === "EXPIRING_SOON" || categoryUpper === "ABOUT_TO_EXPIRE") {
      pipeline.push({
        $match: { "validity.isAboutToExpire": true },
      });
    } else if (categoryUpper === "EXPIRED") {
      pipeline.push({
        $match: { "validity.isExpired": true },
      });
    } else if (categoryUpper === "NEW_LEADS") {
      pipeline.push({
        $match: { category: "NEW_LEADS" },
      });
    } else if (categoryUpper === "WEEK_PLUS" || categoryUpper === "MORE_THAN_WEEK") {
      pipeline.push({
        $match: { category: "MORE_THAN_WEEK" },
      });
    } else if (categoryUpper === "AUTO_RENEW") {
      pipeline.push({
        $match: {
          "activeMembership.autoRenew": true,
          "activeMembership.status": "ACTIVE",
          "validity.isExpired": false,
        },
      });
    } else {
      pipeline.push({
        $match: { category: categoryUpper },
      });
    }
  }

  // Database-level pagination with $facet
  pipeline.push({
    $facet: {
      totalCount: [{ $count: "count" }],
      paginatedData: [
        { $sort: sort as Record<string, 1 | -1> },
        { $skip: Number(skip) || 0 },
        { $limit: Number(limit) || 20 },
      ],
    },
  });

  const [aggResult] = await Member.aggregate(pipeline);
  const total = aggResult?.totalCount?.[0]?.count || 0;
  const members = aggResult?.paginatedData || [];

  return {
    members,
    pagination: buildPaginationMeta(total, Number(page) || 1, Number(limit) || 20),
  };
};

/**
 * Gym join link: `{PUBLIC_WEB_BASE_URL}/join/{slug}`
 */
export const getJoinLink = async ({ businessId, business }: ServiceParams) => {
  const profile =
    business ||
    (await Business.findById(businessId).select("slug").lean());
  const slug = profile?.slug ? String(profile.slug) : null;
  if (!slug) {
    throw codedError("invalid_field", "Set a business slug before sharing an invite link.");
  }
  return { inviteUrl: buildPublicJoinUrl(slug), slug };
};

/**
 * All live STRON users (not guests) for gym "Search your Member" screens.
 */
export const listDirectoryUsers = async ({ paginationParams }: ServiceParams) => {
  const {
    page = 1,
    limit = 20,
    skip = 0,
    search = "",
  } = (paginationParams || {}) as PaginationQuery;

  const matchQuery: MongoFilter = {
    ...LIVE_USER,
    isGuest: { $ne: true },
  };

  if (search) {
    const escaped = String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    matchQuery.$or = [
      { username: { $regex: escaped, $options: "i" } },
      { contactNo: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }

  const [total, rows] = await Promise.all([
    UserModel.countDocuments(matchQuery),
    UserModel.find(matchQuery)
      .select("uid username email contactNo profileImageUrl createdAt")
      .sort({ createdAt: -1 })
      .skip(Number(skip) || 0)
      .limit(Number(limit) || 20)
      .lean(),
  ]);

  const users = rows.map((row) => ({
    uid: String(row.uid || ""),
    name: String(row.username || row.email || "User"),
    phone: String(row.contactNo || ""),
    email: String(row.email || ""),
    profileImage: row.profileImageUrl ? String(row.profileImageUrl) : null,
    createdAt: row.createdAt || null,
  }));

  return {
    users,
    pagination: buildPaginationMeta(total, Number(page) || 1, Number(limit) || 20),
  };
};

/**
 * Get member details along with active membership and computed validity
 */
export const getMemberById = async ({ businessId, memberId }: ServiceParams) => {
  const [member, activeMembership] = await Promise.all([
    Member.findOne({
      _id: memberId,
      businessId,
      isDeleted: false,
    }).lean(),
    Membership.findOne({
      businessId,
      memberId,
      status: { $in: ["ACTIVE", "PENDING"] },
    })
      .populate("planId", "name price billingCycle duration durationUnit")
      // ACTIVE before PENDING alphabetically; then newest endDate
      .sort({ status: 1, endDate: -1, createdAt: -1 })
      .lean(),
  ]);

  if (!member) {
    throw codedError("member_not_found", "Member not found in this gym.");
  }

  const isPending = activeMembership?.status === "PENDING";
  let daysLeft = 0;
  let isExpired = !activeMembership;
  let isAboutToExpire = false;

  if (isPending) {
    daysLeft = 0;
    isExpired = false;
    isAboutToExpire = false;
  } else if (activeMembership && activeMembership.endDate) {
    const now = new Date();
    const end = new Date(activeMembership.endDate);
    const diffMs = end.getTime() - now.getTime();
    daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    isExpired = daysLeft < 0;
    isAboutToExpire = daysLeft >= 0 && daysLeft <= 7;
  }

  return {
    member,
    activeMembership: activeMembership || null,
    validity: {
      daysLeft: isPending ? 0 : Math.max(0, daysLeft),
      isExpired,
      isAboutToExpire,
      status: isPending ? "PENDING" : isExpired ? "EXPIRED" : "ACTIVE",
      statusText: isPending
        ? "Paid — awaiting first check-in."
        : isExpired
          ? "Expired"
          : `${Math.max(0, daysLeft)} days left`,
      customerStatusText: isPending
        ? "Plan purchased. Check in at the gym to activate."
        : isExpired
          ? "Expired"
          : `${Math.max(0, daysLeft)} days left`,
      businessStatusText: isPending
        ? "Paid — awaiting first check-in."
        : isExpired
          ? "Expired"
          : `${Math.max(0, daysLeft)} days left`,
    },
  };
};

/**
 * Create a new member or reactivate a previously deactivated member.
 * Phone is stored in canonical form and must be unique per gym.
 */
export const createMember = async ({
  businessId,
  memberData,
}: ServiceParams): Promise<IMember> => {
  const data = (memberData || {}) as ServiceParams;
  const phone = canonicalMemberPhone(data.phone);
  if (!phone) {
    throw codedError("invalid_field", "Please enter a valid mobile number.");
  }

  const profileImage = publicImageUrl(data.profileImage);
  const existingMember = await Member.findOne({
    businessId,
    phone: { $in: phoneMatchCandidates(phone) },
  });

  if (existingMember) {
    if (!existingMember.isDeleted) {
      throw codedError("conflict", "A member with this phone number already exists in your gym.");
    }

    existingMember.name = String(data.name || "").trim();
    existingMember.phone = phone;
    existingMember.email = data.email ? String(data.email).trim().toLowerCase() : existingMember.email;
    existingMember.gender = data.gender || existingMember.gender;
    existingMember.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : existingMember.dateOfBirth;
    existingMember.profileImage = profileImage || existingMember.profileImage;
    existingMember.notes = data.notes || existingMember.notes;
    existingMember.status = data.status || "ACTIVE";
    existingMember.isDeleted = false;
    existingMember.deletedAt = null;

    try {
      await existingMember.save();
      return existingMember.toObject() as unknown as IMember;
    } catch (err: unknown) {
      if (isMongoDuplicateKeyError(err)) {
        throw codedError("conflict", "A member with this phone number already exists in your gym.");
      }
      throw err;
    }
  }

  try {
    const member = await Member.create({
      businessId,
      name: String(data.name || "").trim(),
      phone,
      email: data.email ? String(data.email).trim().toLowerCase() : null,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      profileImage,
      joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
      status: data.status || "ACTIVE",
      notes: data.notes || null,
    });

    return member.toObject() as unknown as IMember;
  } catch (err: unknown) {
    if (isMongoDuplicateKeyError(err)) {
      throw codedError("conflict", "A member with this phone number already exists in your gym.");
    }
    throw err;
  }
};

/**
 * Update member profile
 */
export const updateMember = async ({ businessId, memberId, updateData }: ServiceParams) => {
  const updates = (updateData || {}) as ServiceParams;
  const member = await Member.findOne({
    _id: memberId,
    businessId,
    isDeleted: false,
  });

  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }

  if (updates.phone && String(updates.phone).trim() !== member.phone) {
    const phone = canonicalMemberPhone(updates.phone);
    if (!phone) {
      throw codedError("invalid_field", "Please enter a valid mobile number.");
    }
    const existing = await Member.findOne({
      businessId,
      phone: { $in: phoneMatchCandidates(phone) },
      _id: { $ne: memberId },
      isDeleted: false,
    }).select("_id").lean();

    if (existing) {
      throw codedError("conflict", "Another member in this gym is already registered with this phone.");
    }
    member.phone = phone;
  }

  if (updates.name !== undefined) member.name = updates.name;
  if (updates.email !== undefined) member.email = updates.email;
  if (updates.gender !== undefined) member.gender = updates.gender;
  if (updates.dateOfBirth !== undefined) member.dateOfBirth = updates.dateOfBirth;
  if (updates.profileImage !== undefined) {
    member.profileImage = publicImageUrl(updates.profileImage) || member.profileImage;
  }
  if (updates.status !== undefined) member.status = updates.status;
  if (updates.notes !== undefined) member.notes = updates.notes;

  try {
    await member.save();
    return member.toObject();
  } catch (err: unknown) {
    if (isMongoDuplicateKeyError(err)) {
      throw codedError("conflict", "Another member in this gym is already registered with this phone.");
    }
    throw err;
  }
};

/**
 * Soft delete a member
 */
export const deleteMember = async ({ businessId, memberId }: ServiceParams) => {
  const member = await Member.findOneAndUpdate(
    { _id: memberId, businessId, isDeleted: false },
    { $set: { isDeleted: true, deletedAt: new Date(), status: "INACTIVE" } },
    { new: true },
  ).lean();

  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }

  return { message: "Member deactivated successfully." };
};

/**
 * Real-time member validity breakdown
 */
export const getMemberValiditySummary = async ({ businessId }: ServiceParams) => {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const bId = toObjectId(businessId);

  const [plansCount, breakdown] = await Promise.all([
    MembershipPlan.countDocuments({ businessId: bId, isDeleted: { $ne: true } }),
    Member.aggregate([
      { $match: { businessId: bId, isDeleted: false, status: { $ne: "BLOCKED" } } },
      {
        $lookup: {
          from: "memberships",
          let: { mId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$memberId", "$$mId"] },
                    { $eq: ["$businessId", bId] },
                  ],
                },
              },
            },
            {
              $addFields: {
                _statusRank: {
                  $switch: {
                    branches: [
                      { case: { $eq: ["$status", "ACTIVE"] }, then: 0 },
                      { case: { $eq: ["$status", "PENDING"] }, then: 1 },
                      { case: { $eq: ["$status", "PAUSED"] }, then: 2 },
                    ],
                    default: 9,
                  },
                },
              },
            },
            { $sort: { _statusRank: 1, endDate: -1, startDate: -1, createdAt: -1 } },
            { $limit: 1 },
            {
              $lookup: {
                from: "membershipplans",
                localField: "planId",
                foreignField: "_id",
                as: "planDetails",
              },
            },
            {
              $unwind: {
                path: "$planDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
          as: "membershipArray",
        },
      },
      { $addFields: { current: { $arrayElemAt: ["$membershipArray", 0] } } },
      {
        $addFields: {
          isNewLead: {
            $or: [
              { $not: ["$current"] },
              { $eq: ["$current.status", "PENDING"] },
              {
                $and: [
                  { $eq: ["$current.status", "ACTIVE"] },
                  { $eq: ["$current.planDetails.isFreeTrial", true] },
                ],
              },
            ],
          },
          isExpired: {
            $cond: [
              { $or: [{ $not: ["$current"] }, { $eq: ["$current.status", "PENDING"] }] },
              false,
              {
                $or: [
                  { $eq: ["$current.status", "EXPIRED"] },
                  {
                    $and: [
                      { $ifNull: ["$current.endDate", false] },
                      { $lt: ["$current.endDate", now] },
                    ],
                  },
                ],
              },
            ],
          },
          isAboutToExpire: {
            $and: [
              { $eq: ["$current.status", "ACTIVE"] },
              { $ifNull: ["$current.endDate", false] },
              { $gte: ["$current.endDate", now] },
              { $lte: ["$current.endDate", in7Days] },
            ],
          },
          isAutoRenew: {
            $and: [
              { $eq: ["$current.autoRenew", true] },
              { $eq: ["$current.status", "ACTIVE"] },
              { $ifNull: ["$current.endDate", false] },
              { $gte: ["$current.endDate", now] },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalMembers: { $sum: 1 },
          newLeads: { $sum: { $cond: ["$isNewLead", 1, 0] } },
          expired: { $sum: { $cond: ["$isExpired", 1, 0] } },
          aboutToExpire: { $sum: { $cond: ["$isAboutToExpire", 1, 0] } },
          autoRenewActive: { $sum: { $cond: ["$isAutoRenew", 1, 0] } },
          activeMembers: {
            $sum: {
              $cond: [
                {
                  $and: [{ $not: ["$isNewLead"] }, { $not: ["$isExpired"] }],
                },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const row = breakdown[0] || {
    totalMembers: 0,
    newLeads: 0,
    expired: 0,
    aboutToExpire: 0,
    autoRenewActive: 0,
    activeMembers: 0,
  };
  const moreThanWeekLeft = Math.max(0, Number(row.activeMembers || 0) - Number(row.aboutToExpire || 0));

  return {
    totalMembers: Number(row.totalMembers || 0),
    activeMembers: Number(row.activeMembers || 0),
    autoRenewActive: Number(row.autoRenewActive || 0),
    aboutToExpire: Number(row.aboutToExpire || 0),
    expired: Number(row.expired || 0),
    newLeads: Number(row.newLeads || 0),
    moreThanWeekLeft,
    hasPlans: plansCount > 0,
    activePlansCount: plansCount,
  };
};

/**
 * Get all historical and active memberships for a member
 */
export const getMemberMembership = async ({ businessId, memberId }: ServiceParams) => {
  const memberships = await Membership.find({ businessId, memberId })
    .populate("planId", "name price billingCycle duration durationUnit perks")
    .sort({ startDate: -1 })
    .lean();

  return memberships;
};

/**
 * Get all payments made by a member
 */
export const getMemberPayments = async ({ businessId, memberId }: ServiceParams) => {
  const payments = await Payment.find({ businessId, memberId })
    .sort({ createdAt: -1 })
    .lean();

  return payments;
};

/**
 * Get attendance check-in history for a member
 */
export const getMemberAttendance = async ({ businessId, memberId }: ServiceParams) => {
  const attendance = await Attendance.find({ businessId, memberId })
    .sort({ attendanceDate: -1 })
    .limit(30)
    .lean();

  return attendance;
};

/**
 * Send payment reminder to a member (enforces 6-hour rate limit with 409 conflict error)
 */
export const sendPaymentReminder = async ({
  businessId,
  memberId,
  reminderData = {},
}: ServiceParams) => {
  const reminder = (reminderData || {}) as ServiceParams;
  const [member, profile] = await Promise.all([
    Member.findOne({ _id: memberId, businessId, isDeleted: false }),
    Business.findById(businessId).select("slug").lean(),
  ]);
  if (!member) {
    throw codedError("member_not_found", "Member not found in this gym.");
  }

  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const now = new Date();

  if (member.lastReminderSentAt) {
    const timeSinceLastReminder = now.getTime() - new Date(member.lastReminderSentAt).getTime();
    if (timeSinceLastReminder < SIX_HOURS_MS) {
      const remainingMs = SIX_HOURS_MS - timeSinceLastReminder;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMinutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const waitText = remainingHours > 0
        ? `${remainingHours} hr ${remainingMinutes} min`
        : `${remainingMinutes} minutes`;

      throw codedError(
        "reminder_cooldown",
        `Reminder was already sent recently. You can remind again in ${waitText}.`,
      );
    }
  }

  // Update last reminder timestamp
  member.lastReminderSentAt = now;
  await member.save();

  // Log reminder event for audit & analytics (never log phone numbers in analytics)
  trackEvent(ANALYTICS_EVENTS.NOTIFICATION_SENT || "payment_reminder_sent", {
    businessId: String(businessId),
    memberId: String(member._id),
    channel: reminder.channel || "WHATSAPP",
    sentAt: now.toISOString(),
  });

  const paymentUrl = buildPublicPayUrl(profile?.slug, String(member._id));

  return {
    success: true,
    message: "Payment reminder sent successfully.",
    paymentUrl,
    lastReminderSentAt: now.toISOString(),
    nextAllowedAt: new Date(now.getTime() + SIX_HOURS_MS).toISOString(),
  };
};

const ALLOWED_EXTENSION_DAYS = [7, 15, 30] as const;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Complimentary validity extension on the member's current (or most recent) membership.
 * Extends from remaining endDate when still active; from now when already expired.
 */
export const extendMemberValidity = async ({
  businessId,
  memberId,
  additionalDays,
  reason,
  actorUid,
}: ServiceParams) => {
  const days = Number(additionalDays);
  if (!ALLOWED_EXTENSION_DAYS.includes(days as (typeof ALLOWED_EXTENSION_DAYS)[number])) {
    throw codedError("invalid_field", "Validity can only be extended by 7, 15, or 30 days.");
  }

  const member = await Member.findOne({ _id: memberId, businessId, isDeleted: false });
  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }
  if (member.status === "BLOCKED") {
    throw codedError("forbidden", "Cannot extend validity for a blacklisted member.");
  }

  const now = new Date();
  const membership = await Membership.findOne({
    businessId,
    memberId,
    status: { $in: ["ACTIVE", "EXPIRED", "PAUSED"] },
  }).sort({ endDate: -1, createdAt: -1 });

  if (!membership) {
    throw codedError("no_membership", "This member has no membership to extend.");
  }

  const previousEndDate = membership.endDate ? new Date(membership.endDate) : now;
  const base = previousEndDate.getTime() > now.getTime() ? previousEndDate : now;
  const newEndDate = new Date(base.getTime() + days * MS_PER_DAY);

  membership.endDate = newEndDate;
  if (membership.status !== "ACTIVE") {
    membership.status = "ACTIVE";
    if (!membership.startDate) membership.startDate = now;
    if (!membership.activatedAt) membership.activatedAt = now;
  }

  const stamp = `[validity-extend ${now.toISOString()} +${days}d${reason ? `: ${String(reason).slice(0, 120)}` : ""}]`;
  membership.notes = membership.notes ? `${membership.notes}\n${stamp}` : stamp;
  await membership.save();

  trackEvent("member_validity_extended", {
    businessId: String(businessId),
    memberId: String(memberId),
    membershipId: String(membership._id),
    additionalDays: days,
    previousEndDate: previousEndDate.toISOString(),
    newEndDate: newEndDate.toISOString(),
    actorUid: actorUid ? String(actorUid) : null,
  });

  const daysLeft = Math.max(0, Math.ceil((newEndDate.getTime() - now.getTime()) / MS_PER_DAY));

  return {
    memberId: String(member._id),
    membershipId: String(membership._id),
    additionalDays: days,
    previousEndDate,
    newEndDate,
    membership: membership.toObject(),
    validity: {
      daysLeft,
      isExpired: false,
      isAboutToExpire: daysLeft <= 7,
      status: "ACTIVE" as const,
      statusText: daysLeft === 0 ? "Expires today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`,
    },
  };
};

/**
 * Blacklist a member: keeps the record, blocks check-in, and stops auto-renew.
 */
export const blacklistMember = async ({
  businessId,
  memberId,
  reason,
  actorUid,
}: ServiceParams) => {
  const member = await Member.findOne({ _id: memberId, businessId, isDeleted: false });
  if (!member) {
    throw codedError("member_not_found", "Member not found.");
  }
  if (member.status === "BLOCKED") {
    throw codedError("conflict", "This member is already blacklisted.");
  }

  const now = new Date();
  member.status = "BLOCKED";
  member.blacklistedAt = now;
  member.blacklistedBy = actorUid ? String(actorUid) : null;
  member.blacklistReason = reason ? String(reason).trim().slice(0, 500) : null;
  await member.save();

  await Membership.updateMany(
    { businessId, memberId, autoRenew: true, status: { $in: ["ACTIVE", "PAUSED"] } },
    { $set: { autoRenew: false, renewalStatus: "NONE" } },
  );

  trackEvent("member_blacklisted", {
    businessId: String(businessId),
    memberId: String(memberId),
    actorUid: actorUid ? String(actorUid) : null,
    hasReason: Boolean(member.blacklistReason),
  });

  return member.toObject();
};

export default {
  listMembers,
  getJoinLink,
  listDirectoryUsers,
  getMemberById,
  createMember,
  updateMember,
  deleteMember,
  getMemberValiditySummary,
  getMemberMembership,
  getMemberPayments,
  getMemberAttendance,
  sendPaymentReminder,
  extendMemberValidity,
  blacklistMember,
};

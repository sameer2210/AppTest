import UserModel from "../models/user.model.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

const displayName = (user: {
  username?: string | null;
  receiverName?: string | null;
  email?: string | null;
}) => {
  const username = String(user.username || "").trim();
  if (username) return username;
  const receiver = String(user.receiverName || "").trim();
  if (receiver) return receiver;
  const email = String(user.email || "").trim();
  return email.includes("@") ? email.split("@")[0] : email;
};

const trainerSubtitle = (roles: string[]) => {
  const unique = [...new Set(roles)];
  if (unique.includes("TRAINER") && unique.includes("MODERATOR")) {
    return "Trainer & Moderator";
  }
  if (unique.includes("MODERATOR")) return "Moderator";
  if (unique.includes("TRAINER")) return "Trainer";
  return "";
};

export const getUserRoles = async ({ uid }: { uid: string }) => {
  const user = await UserModel.findOne({ uid, isDeleted: { $ne: true } })
    .select("uid username receiverName email profileImageUrl")
    .lean();
  if (!user) {
    throw codedError("user_not_found", "User not found.");
  }

  const { Business, StaffMember } = await import("../../gym-business/index.js");

  const [business, staffRows] = await Promise.all([
    Business.findOne({ ownerId: uid }).select("_id businessName logo location status").lean(),
    StaffMember.find({ userId: uid, status: "ACTIVE" })
      .select("businessId role")
      .lean(),
  ]);

  const businessIds = [...new Set(staffRows.map((row) => String(row.businessId)))];
  const gyms =
    businessIds.length > 0
      ? await Business.find({ _id: { $in: businessIds } })
          .select("_id businessName")
          .lean()
      : [];
  const gymNameById = new Map(gyms.map((gym) => [String(gym._id), String(gym.businessName || "")]));

  const memberships = staffRows.map((row) => ({
    businessId: String(row.businessId),
    businessName: gymNameById.get(String(row.businessId)) || "",
    role: row.role,
  }));

  return {
    individual: {
      name: displayName(user),
      username: user.username || "",
      avatarUrl: user.profileImageUrl ?? null,
    },
    business: business
      ? {
          available: true,
          businessId: String(business._id),
          businessName: business.businessName,
          logo: business.logo ?? null,
          location: business.location ?? "",
        }
      : { available: false },
    trainer:
      memberships.length > 0
        ? {
            available: true,
            memberships,
            subtitle: trainerSubtitle(memberships.map((row) => String(row.role))),
          }
        : { available: false },
  };
};

export default { getUserRoles };

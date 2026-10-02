import mongoose from "mongoose";
import StaffMember from "../models/staffMember.model.js";

export const DEMO_STAFF_SEED = [
  {
    phone: "9100000101",
    name: "Priya Nair",
    status: "ACTIVE" as const,
    initiatedBy: "GYM" as const,
    splitPercent: 30,
    proposedAtHoursAgo: 48,
  },
  {
    phone: "9100000102",
    name: "Arjun Mehta",
    status: "IN_PROGRESS" as const,
    initiatedBy: "TRAINER" as const,
    splitPercent: 20,
    proposedAtHoursAgo: 2,
  },
  {
    phone: "9100000103",
    name: "Rohit Sharma",
    status: "IN_PROGRESS" as const,
    initiatedBy: "GYM" as const,
    splitPercent: 30,
    proposedAtHoursAgo: 5,
  },
  {
    phone: "9100000104",
    name: "Karan Joshi",
    status: "REJECTED" as const,
    initiatedBy: "GYM" as const,
    splitPercent: 40,
    proposedAtHoursAgo: 26,
  },
];

export const seedDemoStaffForBusiness = async (businessId: string | mongoose.Types.ObjectId) => {
  const id = new mongoose.Types.ObjectId(String(businessId));
  const rows = [];
  for (const seed of DEMO_STAFF_SEED) {
    const proposedAt = new Date(Date.now() - seed.proposedAtHoursAgo * 60 * 60 * 1000);
    const existing = await StaffMember.findOne({
      businessId: id,
      phone: seed.phone,
      status: { $in: ["IN_PROGRESS", "ACTIVE", "REJECTED"] },
    });
    if (existing) {
      existing.name = seed.name;
      existing.status = seed.status;
      existing.initiatedBy = seed.initiatedBy;
      existing.splitPercent = seed.splitPercent;
      existing.role = "TRAINER";
      existing.proposedAt = proposedAt;
      existing.removedAt = null;
      await existing.save();
      rows.push(existing);
      continue;
    }
    rows.push(
      await StaffMember.create({
        businessId: id,
        name: seed.name,
        phone: seed.phone,
        role: "TRAINER",
        status: seed.status,
        initiatedBy: seed.initiatedBy,
        splitPercent: seed.splitPercent,
        proposedAt,
      }),
    );
  }
  return rows;
};

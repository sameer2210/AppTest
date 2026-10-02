import type { MembershipEntity } from "./plan.types";

export type MemberGender = "MALE" | "FEMALE" | "OTHER";
export type MemberStatus = "ACTIVE" | "INACTIVE" | "BLOCKED";

export type MemberValidityFilterType =
  "ALL" | "NEW_LEADS" | "EXPIRED" | "ABOUT_TO_EXPIRE" | "MORE_THAN_WEEK";

export interface GymMember {
  _id: string;
  id?: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string | null;
  gender?: MemberGender | null;
  dateOfBirth?: string | null;
  profileImage?: string | null;
  joinedAt: string;
  status: MemberStatus;
  notes?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateMemberInput {
  name: string;
  phone: string;
  email?: string | null;
  gender?: MemberGender | null;
  dateOfBirth?: string | null;
  profileImage?: string | null;
  joinedAt?: string;
  status?: MemberStatus;
  notes?: string | null;
}

export interface UpdateMemberInput {
  name?: string;
  phone?: string;
  email?: string | null;
  gender?: MemberGender | null;
  dateOfBirth?: string | null;
  profileImage?: string | null;
  status?: MemberStatus;
  notes?: string | null;
}

export interface MemberValiditySummaryResponse {
  totalMembers: number;
  activeMembers: number;
  aboutToExpire: number;
  expired: number;
  newLeads: number;
}

export interface MemberDetailResponse {
  member: GymMember;
  activeMembership: MembershipEntity | null;
  validity: {
    daysLeft: number;
    isExpired: boolean;
    isAboutToExpire: boolean;
    status?: "PENDING" | "ACTIVE" | "EXPIRED" | "NO_MEMBERSHIP";
    statusText?: string;
    customerStatusText?: string;
    businessStatusText?: string;
  };
}

export interface MemberValidityItem {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  profileImage?: string;
  planName?: string;
  validityText: string;
  subheadingText?: string;
  whatsappText?: string;
  daysCount?: number;
  isExpired: boolean;
  daysRemaining: number;
  category: "NEW_LEADS" | "EXPIRED" | "ABOUT_TO_EXPIRE" | "MORE_THAN_WEEK";
  lastCheckIn?: string;
  createdAt?: string;
  autoRenew?: boolean;
  renewalStatus?: "NONE" | "SCHEDULED" | "FAILED" | "RENEWED";
  purchaseCount?: number;
}

export interface MemberValidityCounters {
  newLeadsCount: number;
  expiredCount: number;
  aboutToExpireCount: number;
  moreThanWeekCount: number;
}

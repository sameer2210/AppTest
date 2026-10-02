import { apiClient } from "@/services/core/apiClient.service";
import type {
  MemberValidityItem,
  MemberValidityCounters,
  GymMember,
  CreateMemberInput,
  UpdateMemberInput,
  MemberDetailResponse,
  MemberValiditySummaryResponse,
} from "@/types/gym/member.types";
import type { MembershipEntity, AssignMembershipInput } from "@/types/gym/plan.types";
import type { PaymentItem } from "@/types/gym/payment.types";

export const generateMemberWhatsAppText = ({
  category,
  days,
  gymName = "our gym",
  smartQrLink = "https://stron.fit/join",
}: {
  category: MemberValidityItem["category"];
  days: number;
  gymName?: string;
  smartQrLink?: string;
}): string => {
  switch (category) {
    case "NEW_LEADS":
      return `You visited ${gymName} ${days} days ago. We would love to have you as our member. Here are our best offers ${smartQrLink}`;
    case "EXPIRED":
      return `Your membership at ${gymName} expired ${days} days. We would love to continue to have you as our member. Here are our best offers ${smartQrLink}`;
    case "ABOUT_TO_EXPIRE":
    case "MORE_THAN_WEEK":
    default:
      return `Your membership at ${gymName} expires in ${days} days. Please don’t forget to renew to continue your fitness journey.`;
  }
};

export const memberApiService = {
  /**
   * Get member validity summary counters
   */
  async getMemberValiditySummary(): Promise<{
    success: boolean;
    data: MemberValiditySummaryResponse;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/members/validity/summary");
      const data = response.data?.data || response.data;
      if (data && typeof data.totalMembers === "number") {
        return { success: true, data };
      }
      return {
        success: true,
        data: {
          totalMembers: 0,
          activeMembers: 0,
          aboutToExpire: 0,
          expired: 0,
          newLeads: 0,
        },
      };
    } catch {
      return {
        success: false,
        data: {
          totalMembers: 0,
          activeMembers: 0,
          aboutToExpire: 0,
          expired: 0,
          newLeads: 0,
        },
      };
    }
  },
  /**
   * List members with computed validity and filter counters
   */
  async listMembersValidity(filter?: string): Promise<{
    members: MemberValidityItem[];
    counters: MemberValidityCounters;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/members", {
        params: { limit: 100 },
      });
      const rawList: any[] = response.data?.members || response.data?.data || response.data || [];

      if (Array.isArray(rawList)) {
        const mapped: MemberValidityItem[] = rawList.map((m) => {
          let daysLeft = typeof m.validity?.daysLeft === "number" ? m.validity.daysLeft : 0;
          if (typeof m.validity?.daysLeft !== "number" && m.activeMembership?.endDate) {
            const diffMs = new Date(m.activeMembership.endDate).getTime() - Date.now();
            daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          }

          const isExpired =
            m.validity?.isExpired ?? (daysLeft < 0 || m.activeMembership?.status === "EXPIRED");

          let category: MemberValidityItem["category"] = "NEW_LEADS";
          if (m.category) {
            category = m.category;
          } else if (m.isNewLead || !m.activeMembership) {
            category = "NEW_LEADS";
          } else if (isExpired) {
            category = "EXPIRED";
          } else if (daysLeft <= 7) {
            category = "ABOUT_TO_EXPIRE";
          } else {
            category = "MORE_THAN_WEEK";
          }

          let daysCount = 0;
          let subheadingText = "";
          const isPendingMembership =
            m.activeMembership?.status === "PENDING" || m.validity?.status === "PENDING";

          if (category === "NEW_LEADS") {
            if (isPendingMembership) {
              daysCount = 0;
              subheadingText =
                m.validity?.businessStatusText ||
                m.validity?.statusText ||
                "Paid — awaiting first check-in.";
            } else {
              const leadTime = m.lastCheckIn
                ? new Date(m.lastCheckIn).getTime()
                : m.createdAt
                  ? new Date(m.createdAt).getTime()
                  : Date.now();
              const daysAgo = Math.max(
                1,
                Math.floor((Date.now() - leadTime) / (1000 * 60 * 60 * 24)),
              );
              daysCount = daysAgo;
              subheadingText = `Checked in ${daysAgo} days ago`;
            }
          } else if (category === "EXPIRED") {
            const expDays = Math.max(1, Math.abs(daysLeft));
            daysCount = expDays;
            subheadingText = `Expired ${expDays} days ago`;
          } else if (category === "ABOUT_TO_EXPIRE") {
            const aboutDays = Math.max(0, daysLeft);
            daysCount = aboutDays;
            subheadingText = `Expires in ${aboutDays} days`;
          } else {
            const weekDays = Math.max(8, daysLeft);
            daysCount = weekDays;
            subheadingText = `Expires in ${weekDays} days`;
          }

          const whatsappText = generateMemberWhatsAppText({
            category,
            days: daysCount,
          });

          return {
            id: m._id || m.id,
            name: m.name || "Member",
            phone: m.phone || "",
            email: m.email || "",
            profileImage: m.profileImage || null,
            planName:
              m.activeMembership?.planId?.name ||
              (isPendingMembership
                ? "Purchased — not activated"
                : category === "NEW_LEADS"
                  ? "No Active Plan"
                  : "Active Plan"),
            validityText: subheadingText,
            subheadingText,
            whatsappText,
            daysCount,
            isExpired,
            daysRemaining: daysLeft,
            category,
            lastCheckIn: m.lastCheckIn,
            createdAt: m.createdAt,
            autoRenew: Boolean(m.activeMembership?.autoRenew),
            renewalStatus: m.activeMembership?.renewalStatus,
            purchaseCount: typeof m.purchaseCount === "number" ? m.purchaseCount : 1,
          };
        });

        const counters: MemberValidityCounters = {
          newLeadsCount: mapped.filter((x) => x.category === "NEW_LEADS").length,
          expiredCount: mapped.filter((x) => x.category === "EXPIRED").length,
          aboutToExpireCount: mapped.filter((x) => x.category === "ABOUT_TO_EXPIRE").length,
          moreThanWeekCount: mapped.filter((x) => x.category === "MORE_THAN_WEEK").length,
        };

        const normalizedFilter = filter ? filter.toUpperCase() : "ALL";
        const filtered =
          normalizedFilter && normalizedFilter !== "ALL"
            ? mapped.filter((x) => x.category === normalizedFilter)
            : mapped;

        return { members: filtered, counters };
      }

      return {
        members: [],
        counters: {
          newLeadsCount: 0,
          expiredCount: 0,
          aboutToExpireCount: 0,
          moreThanWeekCount: 0,
        },
      };
    } catch {
      return {
        members: [],
        counters: {
          newLeadsCount: 0,
          expiredCount: 0,
          aboutToExpireCount: 0,
          moreThanWeekCount: 0,
        },
      };
    }
  },

  /**
   * Get single member detail with active membership and validity
   */
  async getMemberById(memberId: string): Promise<{
    success: boolean;
    data: MemberDetailResponse;
  }> {
    const response = await apiClient.get<any>(`/api/v1/members/${memberId}`);
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * Create a new gym member
   */
  async createMember(input: CreateMemberInput): Promise<{
    success: boolean;
    data: GymMember;
  }> {
    const response = await apiClient.post<any>("/api/v1/members", input);
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * Update member profile
   */
  async updateMember(
    memberId: string,
    input: UpdateMemberInput,
  ): Promise<{
    success: boolean;
    data: GymMember;
  }> {
    const response = await apiClient.patch<any>(`/api/v1/members/${memberId}`, input);
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * Soft delete member
   */
  async deleteMember(memberId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/api/v1/members/${memberId}`);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Assign membership plan to member
   */
  async assignMembership(
    memberId: string,
    input: AssignMembershipInput,
  ): Promise<{
    success: boolean;
    data: MembershipEntity;
  }> {
    const response = await apiClient.post<any>(`/api/v1/members/${memberId}/memberships`, input);
    return {
      success: true,
      data: response.data?.data || response.data,
    };
  },

  /**
   * Enable or disable auto-renew for a gym membership.
   * PATCH /api/v1/memberships/:membershipId/auto-renew
   */
  async patchMembershipAutoRenew(
    membershipId: string,
    autoRenew: boolean,
  ): Promise<{
    success: boolean;
    data?: {
      message?: string;
      membership?: MembershipEntity;
      accessUntil?: string | null;
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.patch<any>(
        `/api/v1/memberships/${membershipId}/auto-renew`,
        { autoRenew },
      );
      return {
        success: true,
        data: response.data?.data || response.data,
        message: response.data?.data?.message || response.data?.message,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to update auto-renew.",
      };
    }
  },

  /**
   * Get member payment history
   */
  async getMemberPayments(memberId: string): Promise<{
    success: boolean;
    data: PaymentItem[];
  }> {
    const response = await apiClient.get<any>(`/api/v1/members/${memberId}/payments`);
    return {
      success: true,
      data: response.data?.data || response.data || [],
    };
  },
};

export default memberApiService;

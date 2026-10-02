import { apiClient } from "@/services/core/apiClient.service";
import type { PurchasedPlan } from "@/types/gym/purchasedPlan.types";

const mapPurchasedPlan = (item: any): PurchasedPlan => ({
  id: String(item.id || item._id || ""),
  planId: item.planId ? String(item.planId) : null,
  planName: item.planName || item.name || "Gym Membership",
  price: Number(item.price ?? item.finalAmount ?? 0),
  billingCycle: item.billingCycle || "Monthly",
  status: item.status || "ACTIVE",
  startDate: item.startDate ?? null,
  endDate: item.endDate ?? null,
  autoRenew: Boolean(item.autoRenew),
  isFreeTrial: Boolean(item.isFreeTrial),
  perks: Array.isArray(item.perks) ? item.perks : [],
  validityDays: item.validityDays != null ? Number(item.validityDays) : null,
  duration: item.duration,
  durationUnit: item.durationUnit,
  trialDuration: item.trialDuration,
  gym: {
    id: item.gym?.id ? String(item.gym.id) : undefined,
    name: item.gym?.name || item.gymName || "Fitness Center",
    phone: item.gym?.phone || "",
    email: item.gym?.email || "",
    address: item.gym?.address || "",
    mapLink: item.gym?.mapLink || "",
    coverImage: item.gym?.coverImage || item.gym?.logo || undefined,
    avatarImage: item.gym?.avatarImage || item.gym?.logo || undefined,
    services: Array.isArray(item.gym?.services) ? item.gym.services : [],
    openingHours: Array.isArray(item.gym?.openingHours) ? item.gym.openingHours : [],
  },
});

export const membershipApiService = {
  /**
   * List memberships purchased by the authenticated customer.
   * GET /api/v1/memberships/my-plans
   */
  async getMyPurchasedPlans(): Promise<{
    success: boolean;
    data: PurchasedPlan[];
    message?: string;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/memberships/my-plans");
      const fetched = response.data?.plans || response.data?.data;
      if (!Array.isArray(fetched)) {
        return { success: true, data: [] };
      }
      return {
        success: true,
        data: fetched.map(mapPurchasedPlan),
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: error?.response?.data?.message || error?.message || "Failed to load your plans.",
      };
    }
  },

  /**
   * Get one purchased membership by id (from my-plans list).
   */
  async getMyPurchasedPlanById(membershipId: string): Promise<{
    success: boolean;
    data?: PurchasedPlan;
    message?: string;
  }> {
    const list = await this.getMyPurchasedPlans();
    if (!list.success) {
      return { success: false, message: list.message };
    }
    const found = list.data.find((p) => p.id === membershipId);
    if (!found) {
      return { success: false, message: "Membership not found." };
    }
    return { success: true, data: found };
  },

  /**
   * Cancel a customer membership.
   * POST /api/v1/memberships/:membershipId/cancel
   */
  async cancelMembership(
    membershipId: string,
    reason = "Cancelled by user via app",
  ): Promise<{ success: boolean; message?: string }> {
    try {
      await apiClient.post(`/api/v1/memberships/${membershipId}/cancel`, { reason });
      return { success: true, message: "Membership cancelled successfully." };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || error?.message || "Failed to cancel membership.",
      };
    }
  },
};

export default membershipApiService;

import { apiClient } from "@/services/core/apiClient.service";
import type { MembershipPlan, CreatePlanInput, UpdatePlanInput } from "@/types/gym/plan.types";

export const planApiService = {
  /**
   * List all gym membership plans
   * GET /api/v1/membership-plans
   */
  async listPlans(
    status?: string,
  ): Promise<{ success: boolean; data: MembershipPlan[]; message?: string }> {
    try {
      const response = await apiClient.get<any>("/api/v1/membership-plans", {
        params: status && status !== "ALL" ? { status } : undefined,
      });

      const plans: MembershipPlan[] =
        response.data?.plans ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        (Array.isArray(response.data) ? response.data : []);

      return {
        success: true,
        data: plans,
      };
    } catch {
      return {
        success: false,
        data: [],
      };
    }
  },

  /**
   * Get plan details by ID
   * GET /api/v1/membership-plans/:planId
   */
  async getPlanById(
    planId: string,
  ): Promise<{ success: boolean; data?: MembershipPlan; message?: string }> {
    try {
      const response = await apiClient.get<any>(`/api/v1/membership-plans/${planId}`);
      const plan = response.data?.data || response.data?.plan || response.data;
      if (plan && (plan._id || plan.id)) {
        return {
          success: true,
          data: plan,
        };
      }
      return {
        success: false,
        message: "Plan not found",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to fetch plan details",
      };
    }
  },

  /**
   * Create a new plan
   * POST /api/v1/membership-plans
   */
  async createPlan(
    input: CreatePlanInput,
  ): Promise<{ success: boolean; data?: MembershipPlan; message?: string; code?: string }> {
    try {
      const payload = {
        name: input.name.trim(),
        price: Number(input.price) || 0,
        currency: input.currency || "INR",
        billingCycle: input.billingCycle,
        duration: Number(input.duration) || 1,
        durationUnit: input.durationUnit || "MONTHS",
        isFreeTrial: Boolean(input.isFreeTrial),
        trialDuration: Number(input.trialDuration) || 0,
        convertToPlanId: input.convertToPlanId || null,
        perks: Array.isArray(input.perks) ? input.perks.filter((p) => p.trim()) : [],
        status: input.status || "ACTIVE",
      };

      const response = await apiClient.post<any>("/api/v1/membership-plans", payload);
      return {
        success: true,
        data: response.data?.data || response.data?.plan || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error?.response?.data?.code,
        message: error?.response?.data?.message || "Failed to create plan",
      };
    }
  },

  /**
   * Update an existing plan
   * PATCH /api/v1/membership-plans/:planId
   */
  async updatePlan(
    planId: string,
    updateData: UpdatePlanInput,
  ): Promise<{ success: boolean; data?: MembershipPlan; message?: string }> {
    try {
      const response = await apiClient.patch<any>(`/api/v1/membership-plans/${planId}`, updateData);
      return {
        success: true,
        data: response.data?.data || response.data?.plan || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to update plan",
      };
    }
  },

  /**
   * Stop a membership plan (keeps historical records, prevents new signups)
   * DELETE /api/v1/membership-plans/:planId
   */
  async stopPlan(planId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete<any>(`/api/v1/membership-plans/${planId}`);
      return {
        success: true,
        message: response.data?.message || "Plan stopped successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to stop plan",
      };
    }
  },

  /**
   * Alias for backward compatibility
   */
  async deletePlan(planId: string): Promise<{ success: boolean; message?: string }> {
    return this.stopPlan(planId);
  },

  /**
   * Customer online purchase of a membership plan
   * POST /api/v1/memberships/purchase
   */
  async purchaseMembership(input: {
    businessId: string;
    planId: string;
    couponCode?: string;
    couponId?: string;
    name?: string;
    phone?: string;
    email?: string;
    gender?: "MALE" | "FEMALE" | "OTHER";
    notes?: string;
    gatewayCustomerId?: string;
    gatewaySubscriptionId?: string;
  }): Promise<{
    success: boolean;
    data?: {
      membership: any;
      payment: any;
      member?: any;
      order?: {
        id: string;
        amount: number;
        currency: string;
        receipt?: string;
      } | null;
      amount: number;
      currency: string;
      key?: string;
      isFree?: boolean;
    };
    message?: string;
  }> {
    try {
      const response = await apiClient.post<any>("/api/v1/memberships/purchase", input);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to purchase membership plan",
      };
    }
  },
};

export default planApiService;

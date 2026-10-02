import { apiClient } from "@/services/core/apiClient.service";

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  code?: string;
}

export const businessApiService = {
  /**
   * Fetch current authenticated user's gym business profile
   * GET /api/v1/business
   */
  async getBusinessProfile() {
    try {
      const response = await apiClient.get<any>("/api/v1/business");
      // Backend returns { success: true, data: business | null }
      const data = response.data?.data;
      if (data == null) {
        return { success: false, code: "business_not_found", data: null };
      }
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      if (error?.response?.data?.code === "business_not_found" || error?.response?.status === 404) {
        return { success: false, code: "business_not_found", data: null };
      }
      if (error?.response?.status === 401 || error?.message?.includes("Authentication required")) {
        return { success: false, code: "unauthenticated", data: null };
      }
      return { success: false, message: error?.message, data: null };
    }
  },

  /**
   * Fetch aggregated business dashboard summary (BFF endpoint)
   * GET /api/v1/business/dashboard-summary
   */
  async getDashboardSummary() {
    try {
      const response = await apiClient.get<any>("/api/v1/business/dashboard-summary");
      const data = response.data?.data;
      if (data == null) {
        return { success: false, code: "business_not_found", data: null };
      }
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      if (error?.response?.data?.code === "business_not_found" || error?.response?.status === 404) {
        return { success: false, code: "business_not_found", data: null };
      }
      if (error?.response?.status === 401 || error?.message?.includes("Authentication required")) {
        return { success: false, code: "unauthenticated", data: null };
      }
      return { success: false, message: error?.message, data: null };
    }
  },

  /**
   * Create gym business profile
   * POST /api/v1/business
   */
  async createBusinessProfile(businessData: Record<string, any>) {
    try {
      const response = await apiClient.post<any>("/api/v1/business", businessData);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        code: error?.response?.data?.code,
        message: error?.response?.data?.message || "Failed to create gym profile",
      };
    }
  },

  /**
   * Update gym business profile
   * PATCH /api/v1/business
   */
  async updateBusinessProfile(updateData: Record<string, any>) {
    try {
      const response = await apiClient.patch<any>("/api/v1/business", updateData);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to update gym profile",
      };
    }
  },

  /**
   * Fetch member validity summary counts
   * GET /api/v1/members/validity/summary
   */
  async getMemberValiditySummary() {
    try {
      const response = await apiClient.get<any>("/api/v1/members/validity/summary");
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Fetch dashboard analytics (today check-ins, active members, MRR)
   * GET /api/v1/analytics/dashboard
   */
  async getDashboardAnalytics() {
    try {
      const response = await apiClient.get<any>("/api/v1/analytics/dashboard");
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Fetch revenue analytics
   * GET /api/v1/analytics/revenue
   */
  async getRevenueAnalytics() {
    try {
      const response = await apiClient.get<any>("/api/v1/analytics/revenue");
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Fetch gym coupons
   * GET /api/v1/coupons
   */
  async getCoupons() {
    try {
      const response = await apiClient.get<any>("/api/v1/coupons");
      const coupons =
        response.data?.coupons ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        (Array.isArray(response.data) ? response.data : []);
      return { success: true, data: coupons };
    } catch {
      return { success: false, data: [] };
    }
  },

  /**
   * Fetch STRON PRO subscription status
   * GET /api/v1/pro
   */
  async getProSubscription() {
    try {
      const response = await apiClient.get<any>("/api/v1/pro");
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Fetch STRON PRO feature entitlements (platform fee, custom branding, etc.)
   * GET /api/v1/pro/features
   */
  async getProFeatures() {
    try {
      const response = await apiClient.get<any>("/api/v1/pro/features");
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch {
      return { success: false, data: null };
    }
  },

  /**
   * Fetch gym's created membership plans
   * GET /api/v1/membership-plans
   */
  async getMembershipPlans() {
    try {
      const response = await apiClient.get<any>("/api/v1/membership-plans");
      const plans =
        response.data?.plans ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        (Array.isArray(response.data) ? response.data : []);
      return { success: true, data: plans };
    } catch {
      return { success: false, data: [] };
    }
  },
};

export default businessApiService;

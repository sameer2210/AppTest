import { apiClient } from "@/services/core/apiClient.service";
import type {
  ProSubscriptionInfo,
  ProFeatureEntitlements,
  ProBillingCycle,
} from "@/types/gym/proSubscription.types";

export interface ProApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export const proSubscriptionApiService = {
  /**
   * Get current gym subscription status
   * GET /api/v1/pro
   */
  async getSubscription(): Promise<ProApiResponse<ProSubscriptionInfo>> {
    try {
      const response = await apiClient.get<ProApiResponse<ProSubscriptionInfo>>("/api/v1/pro");
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to fetch PRO status",
      };
    }
  },

  /**
   * Get feature entitlements
   * GET /api/v1/pro/features
   */
  async getFeatures(): Promise<ProApiResponse<ProFeatureEntitlements>> {
    try {
      const response = await apiClient.get<any>("/api/v1/pro/features");
      const rawData = response.data?.data || response.data;
      if (rawData) {
        const isPro = Boolean(rawData.entitlements?.isPro ?? rawData.isPro ?? false);
        return {
          success: true,
          data: {
            platformFeePercentage: 5,
            advancedAnalytics: isPro,
            customBranding: isPro,
            automatedWhatsApp: isPro,
            prioritySupport: isPro,
          },
        };
      }
      return {
        success: true,
        data: {
          platformFeePercentage: 5,
          advancedAnalytics: false,
          customBranding: false,
          automatedWhatsApp: false,
          prioritySupport: false,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to fetch features",
      };
    }
  },

  /**
   * Subscribe to STRON PRO
   * POST /api/v1/pro/subscribe
   */
  async subscribe(
    _billingCycle: ProBillingCycle = "MONTHLY",
  ): Promise<ProApiResponse<ProSubscriptionInfo>> {
    try {
      const response = await apiClient.post<ProApiResponse<ProSubscriptionInfo>>(
        "/api/v1/pro/subscribe",
        {
          planCode: "STRON_PRO",
          billingCycle: "MONTHLY",
          autoRenew: true,
        },
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Subscription activation failed",
      };
    }
  },

  /**
   * Cancel STRON PRO subscription
   * POST /api/v1/pro/cancel
   */
  async cancelSubscription(cancelReason?: string): Promise<ProApiResponse<null>> {
    try {
      const response = await apiClient.post<ProApiResponse<null>>("/api/v1/pro/cancel", {
        cancelReason: cancelReason || "User requested cancellation",
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Cancellation failed",
      };
    }
  },

  /**
   * Sync RevenueCat subscription status with backend
   * POST /api/v1/pro/sync-revenuecat
   */
  async syncRevenueCat(): Promise<ProApiResponse<ProSubscriptionInfo>> {
    try {
      const response = await apiClient.post<ProApiResponse<ProSubscriptionInfo>>(
        "/api/v1/pro/sync-revenuecat",
        {},
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message:
          error?.response?.data?.message || "Failed to sync RevenueCat subscription with backend",
      };
    }
  },

  /**
   * Check 14-day STRON PRO Free Trial eligibility
   * GET /api/v1/pro/trial/eligibility
   */
  async checkTrialEligibility(params?: {
    installedAt?: number | string;
  }): Promise<
    ProApiResponse<{
      isEligible: boolean;
      daysOnPlatform: number;
      daysSinceInstall?: number;
      hasSpentMoreThan7Days: boolean;
      hasUsedTrialOrPro: boolean;
      trialDays: number;
      monthlyPrice: number;
      claimViaStore?: boolean;
      daysUntilTrial?: number;
    }>
  > {
    try {
      const response = await apiClient.get<
        ProApiResponse<{
          isEligible: boolean;
          daysOnPlatform: number;
          daysSinceInstall?: number;
          hasSpentMoreThan7Days: boolean;
          hasUsedTrialOrPro: boolean;
          trialDays: number;
          monthlyPrice: number;
          claimViaStore?: boolean;
          daysUntilTrial?: number;
        }>
      >("/api/v1/pro/trial/eligibility", {
        params: params?.installedAt != null ? { installedAt: params.installedAt } : undefined,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to check trial eligibility",
      };
    }
  },

  /**
   * Activate 14-day Free Trial
   * POST /api/v1/pro/trial/activate
   */
  async activateFreeTrial(): Promise<ProApiResponse<ProSubscriptionInfo>> {
    try {
      const response = await apiClient.post<ProApiResponse<ProSubscriptionInfo>>(
        "/api/v1/pro/trial/activate",
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to activate free trial",
      };
    }
  },

  /**
   * Pause STRON PRO subscription for 14 days
   * POST /api/v1/pro/pause
   */
  async pauseSubscription(
    pauseDays = 14,
  ): Promise<ProApiResponse<{ subscription: ProSubscriptionInfo }>> {
    try {
      const response = await apiClient.post<ProApiResponse<{ subscription: ProSubscriptionInfo }>>(
        "/api/v1/pro/pause",
        { pauseDays },
      );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to pause subscription",
      };
    }
  },

  /**
   * Resume paused STRON PRO subscription
   * POST /api/v1/pro/resume
   */
  async resumeSubscription(): Promise<ProApiResponse<{ subscription: ProSubscriptionInfo }>> {
    try {
      const response =
        await apiClient.post<ProApiResponse<{ subscription: ProSubscriptionInfo }>>(
          "/api/v1/pro/resume",
        );
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to resume subscription",
      };
    }
  },
};

export default proSubscriptionApiService;

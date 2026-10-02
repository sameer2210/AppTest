import { apiClient } from "../core/apiClient.service";

export interface SubscriptionStatus {
  isActive: boolean;
  productId?: string;
  expiresAt?: string;
  willRenew?: boolean;
}

export const SubscriptionService = {
  async fetchWarriorPassStatus(uid: string): Promise<SubscriptionStatus> {
    const { data } = await apiClient.get<Record<string, unknown>>(
      `/api/payment/revenuecat/subscription/${uid}`,
    );
    return {
      isActive: data.isActive === true || data.active === true,
      productId: data.productId ? String(data.productId) : undefined,
      expiresAt: data.expiresAt ? String(data.expiresAt) : undefined,
      willRenew: data.willRenew === true,
    };
  },
};

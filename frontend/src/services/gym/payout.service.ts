import { apiClient } from "@/services/core/apiClient.service";
import type { PayoutAccountInfo, SavePayoutAccountInput } from "@/types/gym/payout.types";

export const payoutApiService = {
  /**
   * Get current gym payout account details
   * GET /api/v1/payout-account
   */
  async getPayoutAccount(): Promise<{
    success: boolean;
    data?: PayoutAccountInfo | null;
    message?: string;
  }> {
    try {
      const response = await apiClient.get<any>("/api/v1/payout-account");
      return {
        success: true,
        data: response.data?.data ?? null,
      };
    } catch (err: any) {
      if (
        err?.response?.status === 404 ||
        err?.response?.data?.code === "payout_account_not_found"
      ) {
        return {
          success: true,
          data: null,
        };
      }
      return {
        success: false,
        data: null,
        message: err?.response?.data?.message || err?.message || "Failed to fetch payout account",
      };
    }
  },

  /**
   * Create or update payout bank account
   * POST /api/v1/payout-account
   */
  async savePayoutAccount(input: SavePayoutAccountInput): Promise<{
    success: boolean;
    data?: PayoutAccountInfo;
    message?: string;
  }> {
    try {
      const rawNumber = String(input.accountNumber || "").trim();
      const ifscUpper = input.ifsc.trim().toUpperCase();

      const payload = {
        panNumber: input.panNumber ? input.panNumber.trim().toUpperCase() : undefined,
        accountHolderName: input.accountHolderName.trim(),
        accountNumber: rawNumber,
        ifsc: ifscUpper,
        bankName: input.bankName?.trim() || undefined,
        accountType: input.accountType || "CURRENT",
      };

      const response = await apiClient.post<any>("/api/v1/payout-account", payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to save payout account",
      };
    }
  },

  /**
   * Save bank details only — no KYC / penny-drop triggered
   * PUT /api/v1/payout-account
   */
  async saveBankDetailsOnly(input: SavePayoutAccountInput): Promise<{
    success: boolean;
    data?: PayoutAccountInfo;
    message?: string;
  }> {
    try {
      const rawNumber = String(input.accountNumber || "").trim();
      const ifscUpper = input.ifsc.trim().toUpperCase();

      const payload = {
        panNumber: input.panNumber ? input.panNumber.trim().toUpperCase() : undefined,
        accountHolderName: input.accountHolderName.trim(),
        accountNumber: rawNumber,
        ifsc: ifscUpper,
        bankName: input.bankName?.trim() || undefined,
        accountType: input.accountType || "CURRENT",
      };

      const response = await apiClient.put<any>("/api/v1/payout-account", payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to save bank details",
      };
    }
  },

  async verifyPayoutAccount(): Promise<{
    success: boolean;
    data?: PayoutAccountInfo;
    message?: string;
  }> {
    try {
      const response = await apiClient.post<any>("/api/v1/payout-account/verify", {});
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || err?.message || "Failed to verify payout account",
      };
    }
  },
};

export default payoutApiService;

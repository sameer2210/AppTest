import { apiClient } from "@/services/core/apiClient.service";
import type { Coupon, CreateCouponInput, UpdateCouponInput } from "@/types/gym/coupon.types";

export interface CouponApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  coupons?: Coupon[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const couponApiService = {
  /**
   * List all gym coupons
   * GET /api/v1/coupons
   */
  async listCoupons(
    status?: string,
  ): Promise<{ success: boolean; data: Coupon[]; message?: string }> {
    try {
      const response = await apiClient.get<any>("/api/v1/coupons", {
        params: status && status !== "ALL" ? { status } : undefined,
      });

      const coupons: Coupon[] =
        response.data?.coupons ||
        (Array.isArray(response.data?.data) ? response.data.data : []) ||
        (Array.isArray(response.data) ? response.data : []);

      return {
        success: true,
        data: coupons,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to fetch coupons",
        data: [],
      };
    }
  },

  /**
   * Get coupon details by ID
   * GET /api/v1/coupons/:couponId
   */
  async getCouponById(
    couponId: string,
  ): Promise<{ success: boolean; data?: Coupon; message?: string }> {
    try {
      const response = await apiClient.get<any>(`/api/v1/coupons/${couponId}`);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to fetch coupon",
      };
    }
  },

  /**
   * Create a new coupon
   * POST /api/v1/coupons
   */
  async createCoupon(
    input: CreateCouponInput,
  ): Promise<{ success: boolean; data?: Coupon; message?: string }> {
    try {
      let expiresAt = input.expiresAt;
      if (!expiresAt) {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        expiresAt = d.toISOString();
      }

      const payload: Record<string, any> = {
        code: input.code.trim().toUpperCase(),
        type: input.type,
        minimumOrderValue: Number(input.minimumOrderValue) || 0,
        expiresAt,
        status: input.status || "ACTIVE",
      };

      if (input.type === "PERCENTAGE") {
        payload.discountPercentage = Number(input.discountPercentage);
        if (input.maximumDiscount != null && Number(input.maximumDiscount) > 0) {
          payload.maximumDiscount = Number(input.maximumDiscount);
        }
      } else {
        payload.discountAmount = Number(input.discountAmount);
      }

      if (input.totalCoupons != null && Number(input.totalCoupons) > 0) {
        payload.totalCoupons = Number(input.totalCoupons);
      }

      if (input.startsAt) {
        payload.startsAt = input.startsAt;
      }

      if (Array.isArray(input.applicablePlanIds) && input.applicablePlanIds.length > 0) {
        payload.applicablePlanIds = input.applicablePlanIds;
      }

      const response = await apiClient.post<any>("/api/v1/coupons", payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to create coupon",
      };
    }
  },

  /**
   * Update an existing coupon
   * PATCH /api/v1/coupons/:couponId
   */
  async updateCoupon(
    couponId: string,
    updateData: UpdateCouponInput,
  ): Promise<{ success: boolean; data?: Coupon; message?: string }> {
    try {
      const payload: Record<string, any> = {};

      if (updateData.discountPercentage !== undefined) {
        payload.discountPercentage =
          updateData.discountPercentage != null ? Number(updateData.discountPercentage) : null;
      }
      if (updateData.discountAmount !== undefined) {
        payload.discountAmount =
          updateData.discountAmount != null ? Number(updateData.discountAmount) : null;
      }
      if (updateData.minimumOrderValue !== undefined) {
        payload.minimumOrderValue = Number(updateData.minimumOrderValue) || 0;
      }
      if (updateData.maximumDiscount !== undefined) {
        payload.maximumDiscount =
          updateData.maximumDiscount != null ? Number(updateData.maximumDiscount) : null;
      }
      if (updateData.totalCoupons !== undefined) {
        payload.totalCoupons =
          updateData.totalCoupons != null ? Number(updateData.totalCoupons) : null;
      }
      if (updateData.expiresAt) {
        payload.expiresAt = updateData.expiresAt;
      }
      if (updateData.status) {
        payload.status = updateData.status;
      }
      if (Array.isArray(updateData.applicablePlanIds)) {
        payload.applicablePlanIds = updateData.applicablePlanIds;
      }

      const response = await apiClient.patch<any>(`/api/v1/coupons/${couponId}`, payload);
      return {
        success: true,
        data: response.data?.data || response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to update coupon",
      };
    }
  },

  /**
   * Soft delete a coupon
   * DELETE /api/v1/coupons/:couponId
   */
  async deleteCoupon(couponId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await apiClient.delete<any>(`/api/v1/coupons/${couponId}`);
      return {
        success: true,
        message: response.data?.message || "Coupon deleted successfully",
      };
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Failed to delete coupon",
      };
    }
  },

  /**
   * Validate coupon code against an order
   * POST /api/v1/coupons/validate
   */
  async validateCoupon(code: string, orderAmount: number, planId?: string) {
    try {
      const response = await apiClient.post<any>("/api/v1/coupons/validate", {
        code: code.trim().toUpperCase(),
        orderAmount,
        planId,
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || "Invalid coupon code",
      };
    }
  },
};

export default couponApiService;

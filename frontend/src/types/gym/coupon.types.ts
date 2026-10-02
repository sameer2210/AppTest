export type CouponDiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface Coupon {
  _id: string;
  id?: string;
  businessId?: string;
  code: string;
  normalizedCode?: string;
  type: CouponDiscountType;
  discountPercentage?: number | null;
  discountAmount?: number | null;
  minimumOrderValue: number;
  maximumDiscount?: number | null;
  totalCoupons?: number | null;
  usedCoupons?: number;
  usedCount?: number;
  startsAt?: string;
  expiresAt: string;
  applicablePlanIds?: ({ _id: string; name: string; price?: number } | string)[];
  status: CouponStatus;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponDiscountType;
  discountPercentage?: number;
  discountAmount?: number;
  minimumOrderValue: number;
  maximumDiscount?: number;
  totalCoupons?: number;
  startsAt?: string;
  expiresAt?: string;
  applicablePlanIds?: string[];
  status?: CouponStatus;
}

export interface UpdateCouponInput {
  discountPercentage?: number | null;
  discountAmount?: number | null;
  minimumOrderValue?: number;
  maximumDiscount?: number | null;
  totalCoupons?: number | null;
  expiresAt?: string;
  applicablePlanIds?: string[];
  status?: CouponStatus;
}

export interface ValidateCouponInput {
  code: string;
  planId?: string;
  orderAmount?: number;
}

export interface ValidateCouponResponse {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  coupon: Coupon;
}

export interface CouponFormErrors {
  code?: string;
  discountPercentage?: string;
  discountAmount?: string;
  minimumOrderValue?: string;
  maximumDiscount?: string;
  totalCoupons?: string;
  general?: string;
}

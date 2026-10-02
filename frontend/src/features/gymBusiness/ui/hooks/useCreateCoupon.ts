import { useState, useCallback } from "react";
import { useAppDispatch } from "@/store/hooks";
import { createCouponThunk } from "../../model/gymBusiness.thunks";
import type {
  CouponDiscountType,
  CreateCouponInput,
  CouponFormErrors,
} from "@/types/gym/coupon.types";
import { showToastMessage } from "@/utils/app-utils";
import { logError } from "@/config/devLogger";

interface UseCreateCouponOptions {
  onSuccess?: () => void;
}

export const useCreateCoupon = (options?: UseCreateCouponOptions) => {
  const dispatch = useAppDispatch();
  const [type, setType] = useState<CouponDiscountType>("PERCENTAGE");
  const [code, setCode] = useState<string>("");
  const [discountPercentage, setDiscountPercentage] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [minimumOrderValue, setMinimumOrderValue] = useState<string>("0");
  const [maximumDiscount, setMaximumDiscount] = useState<string>("");
  const [totalCoupons, setTotalCoupons] = useState<string>("");
  const [errors, setErrors] = useState<CouponFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const resetForm = useCallback(() => {
    setType("PERCENTAGE");
    setCode("");
    setDiscountPercentage("");
    setDiscountAmount("");
    setMinimumOrderValue("0");
    setMaximumDiscount("");
    setTotalCoupons("");
    setErrors({});
  }, []);

  const validate = useCallback((): boolean => {
    const errs: CouponFormErrors = {};
    const trimmedCode = code.trim().toUpperCase();

    if (!trimmedCode) {
      errs.code = "Coupon code is required";
    } else if (trimmedCode.length < 3) {
      errs.code = "Code must be at least 3 characters";
    }

    if (type === "PERCENTAGE") {
      const pct = Number(discountPercentage);
      if (!discountPercentage || isNaN(pct) || pct <= 0 || pct > 100) {
        errs.discountPercentage = "Enter a percentage between 1 and 100";
      }
    } else {
      const amt = Number(discountAmount);
      if (!discountAmount || isNaN(amt) || amt <= 0) {
        errs.discountAmount = "Enter a valid discount amount in ₹";
      }
    }

    if (minimumOrderValue) {
      const mov = Number(minimumOrderValue);
      if (isNaN(mov) || mov < 0) {
        errs.minimumOrderValue = "Enter a valid minimum order value";
      }
    }

    if (maximumDiscount) {
      const maxDisc = Number(maximumDiscount);
      if (isNaN(maxDisc) || maxDisc <= 0) {
        errs.maximumDiscount = "Enter a valid max discount";
      }
    }

    if (totalCoupons) {
      const tc = Number(totalCoupons);
      if (isNaN(tc) || tc <= 0) {
        errs.totalCoupons = "Enter a valid number of coupons";
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [
    code,
    type,
    discountPercentage,
    discountAmount,
    minimumOrderValue,
    maximumDiscount,
    totalCoupons,
  ]);

  const submit = useCallback(async () => {
    if (!validate()) {
      showToastMessage("Please fix the highlighted errors");
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateCouponInput = {
        code: code.trim().toUpperCase(),
        type,
        minimumOrderValue: minimumOrderValue.trim() !== "" ? Number(minimumOrderValue) : 0,
        discountPercentage: type === "PERCENTAGE" ? Number(discountPercentage) : undefined,
        discountAmount: type === "FIXED_AMOUNT" ? Number(discountAmount) : undefined,
        maximumDiscount: maximumDiscount.trim() !== "" ? Number(maximumDiscount) : undefined,
        totalCoupons: totalCoupons.trim() !== "" ? Number(totalCoupons) : undefined,
        status: "ACTIVE",
      };

      const response = await dispatch(createCouponThunk(input)).unwrap();
      if (response.success) {
        showToastMessage("Coupon created successfully!");
        resetForm();
        options?.onSuccess?.();
      } else {
        showToastMessage(response.message || "Failed to create coupon");
      }
    } catch (err) {
      logError("[useCreateCoupon] submit error:", err);
      showToastMessage("An unexpected error occurred while creating coupon");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    code,
    discountAmount,
    discountPercentage,
    dispatch,
    maximumDiscount,
    minimumOrderValue,
    options,
    resetForm,
    totalCoupons,
    type,
    validate,
  ]);

  return {
    type,
    setType,
    code,
    setCode,
    discountPercentage,
    setDiscountPercentage,
    discountAmount,
    setDiscountAmount,
    minimumOrderValue,
    setMinimumOrderValue,
    maximumDiscount,
    setMaximumDiscount,
    totalCoupons,
    setTotalCoupons,
    errors,
    isSubmitting,
    resetForm,
    submit,
  };
};

export default useCreateCoupon;

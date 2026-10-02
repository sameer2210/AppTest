import React from "react";
import { useRouter } from "expo-router";
import { CreateCouponScreenContent } from "../components";
import { useCreateCoupon } from "../hooks";

export const CreateCouponScreen: React.FC = () => {
  const router = useRouter();

  const {
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
  } = useCreateCoupon({
    onSuccess: () => {
      router.back();
    },
  });

  const handleDiscard = () => {
    resetForm();
    router.back();
  };

  return (
    <CreateCouponScreenContent
      type={type}
      onTypeChange={setType}
      code={code}
      onCodeChange={setCode}
      discountPercentage={discountPercentage}
      onDiscountPercentageChange={setDiscountPercentage}
      discountAmount={discountAmount}
      onDiscountAmountChange={setDiscountAmount}
      minimumOrderValue={minimumOrderValue}
      onMinimumOrderValueChange={setMinimumOrderValue}
      maximumDiscount={maximumDiscount}
      onMaximumDiscountChange={setMaximumDiscount}
      totalCoupons={totalCoupons}
      onTotalCouponsChange={setTotalCoupons}
      errors={errors}
      isSubmitting={isSubmitting}
      onDiscard={handleDiscard}
      onSave={submit}
      onBack={() => router.back()}
    />
  );
};

export default CreateCouponScreen;

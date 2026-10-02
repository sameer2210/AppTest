import React from "react";
import { useRouter } from "expo-router";
import { href } from "@/navigation/href";
import { CouponsHubScreenContent } from "../components";
import { useCouponsData } from "../hooks";

export const CouponsScreen: React.FC = () => {
  const router = useRouter();
  const { coupons, isLoading, isRefreshing, refresh, deleteCoupon } = useCouponsData();

  return (
    <CouponsHubScreenContent
      coupons={coupons}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={refresh}
      onDeleteCoupon={deleteCoupon}
      onCreateCouponPress={() => router.push(href.app.createCoupon as never)}
      onBack={() => router.back()}
    />
  );
};

export default CouponsScreen;

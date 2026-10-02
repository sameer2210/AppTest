import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useAppDispatch } from "@/store/hooks";
import { fetchCouponsThunk, deleteCouponThunk } from "../../model/gymBusiness.thunks";
import type { Coupon } from "@/types/gym/coupon.types";
import { showToastMessage } from "@/utils/app-utils";
import { logError } from "@/config/devLogger";

export const useCouponsData = () => {
  const dispatch = useAppDispatch();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED">("ALL");

  const fetchCoupons = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await dispatch(fetchCouponsThunk()).unwrap();
      if (response.success && Array.isArray(response.data)) {
        setCoupons(response.data);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      logError("[useCouponsData] Fetch error:", err);
      setCoupons([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const handleDeleteCoupon = useCallback(
    async (couponId: string, couponCode?: string) => {
      Alert.alert(
        "Discard Coupon",
        `Are you sure you want to discard coupon "${couponCode || "selected"}"? This action cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: async () => {
              try {
                const res = await dispatch(deleteCouponThunk(couponId)).unwrap();
                if (res.success) {
                  showToastMessage(`Coupon "${couponCode || ""}" discarded.`);
                  fetchCoupons(true);
                } else {
                  showToastMessage(res.message || "Failed to delete coupon");
                }
              } catch (err) {
                logError("[useCouponsData] Delete error:", err);
                showToastMessage("Error deleting coupon.");
              }
            },
          },
        ],
      );
    },
    [dispatch, fetchCoupons],
  );

  const filteredCoupons = coupons.filter((c) => {
    if (activeFilter === "ALL") return true;
    return c.status === activeFilter;
  });

  return {
    coupons: filteredCoupons,
    allCoupons: coupons,
    isLoading,
    isRefreshing,
    activeFilter,
    setActiveFilter,
    refresh: () => fetchCoupons(true),
    deleteCoupon: handleDeleteCoupon,
  };
};

export default useCouponsData;

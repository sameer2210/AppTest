import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { GymAnalyticsScreenContent } from "../components";
import { DEFAULT_ANALYTICS_DATA } from "../../api/gymBusiness.api";
import { useAppDispatch } from "@/store/hooks";
import { fetchGymAnalyticsThunk } from "../../model/gymBusiness.thunks";
import { useProSubscription } from "../hooks/useProSubscription";
import type { AnalyticsSummaryPayload, GymAnalyticsTab } from "@/types/gym";

export const GymAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isPro } = useProSubscription();
  const params = useLocalSearchParams<{ tab?: GymAnalyticsTab }>();
  const initialTab: GymAnalyticsTab = params.tab || "earnings";

  const [analyticsData, setAnalyticsData] =
    useState<AnalyticsSummaryPayload>(DEFAULT_ANALYTICS_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async (isPullToRefresh = false) => {
    try {
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const res = await dispatch(fetchGymAnalyticsThunk()).unwrap();
      if (res.success && res.data) {
        setAnalyticsData(res.data);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <GymAnalyticsScreenContent
      data={analyticsData}
      initialTab={initialTab}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={() => fetchAnalytics(true)}
      isPro={isPro}
      onBack={() => router.back()}
    />
  );
};

export default GymAnalyticsScreen;

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ListingAnalyticsScreenContent, type ListingAnalyticsTab } from "../components";
import { useAppDispatch } from "@/store/hooks";
import { fetchListingAnalyticsThunk } from "../../model/gymBusiness.thunks";
import type { ListingAnalyticsPayload } from "@/types/gym";

const EMPTY_LISTING_ANALYTICS: ListingAnalyticsPayload = {
  conversionRate: {
    overallRate: 0,
    totalViews: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
    listings: [],
  },
  repeatUserRate: {
    overallRate: 0,
    totalParticipants: 0,
    repeatParticipants: 0,
    newParticipants: 0,
    listings: [],
  },
};

export const ListingAnalyticsScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ type?: string }>();
  const initialTab: ListingAnalyticsTab =
    params.type === "repeat_rate" ? "repeat_rate" : "conversion_rate";

  const [analyticsData, setAnalyticsData] =
    useState<ListingAnalyticsPayload>(EMPTY_LISTING_ANALYTICS);
  const [isLoading, setIsLoading] = useState(true);

  const fetchListingAnalytics = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await dispatch(fetchListingAnalyticsThunk()).unwrap();
      if (res.data) {
        setAnalyticsData(res.data);
      }
    } catch {
      setAnalyticsData(EMPTY_LISTING_ANALYTICS);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchListingAnalytics();
  }, [fetchListingAnalytics]);

  return (
    <ListingAnalyticsScreenContent
      data={analyticsData}
      initialTab={initialTab}
      isLoading={isLoading}
      onBack={() => router.back()}
    />
  );
};

export default ListingAnalyticsScreen;

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { ListingsScreenContent, type ListingEventItem } from "../components";
import { fetchMyActivity } from "@/features/managedEvents";
import { useAppDispatch } from "@/store/hooks";
import { useProSubscription } from "../hooks/useProSubscription";
import { href } from "@/navigation/href";
export const ListingsScreen: React.FC = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isPro, subscription, subscribe } = useProSubscription();
  const [events, setEvents] = useState<ListingEventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const activity = await dispatch(fetchMyActivity()).unwrap();
      if (Array.isArray(activity) && activity.length > 0) {
        const organizerActivity = activity.filter((item) => item.role === "organizer");
        const mapped: ListingEventItem[] = organizerActivity.map((item) => {
          const rawStatus = item.eventStatus?.toLowerCase() || "";
          const status: ListingEventItem["status"] =
            rawStatus === "completed"
              ? "COMPLETED"
              : rawStatus === "draft"
                ? "DRAFT"
                : rawStatus === "cancelled"
                  ? "CANCELLED"
                  : "LIVE";

          const totalEarnings =
            typeof item.totalEarnings === "number"
              ? item.totalEarnings
              : (item.registrationCount || 0) * (item.ticketTypes?.[0]?.price || 0);
          const earningsText =
            totalEarnings >= 100000
              ? `₹ ${(totalEarnings / 100000).toFixed(1)} L`
              : `₹ ${totalEarnings.toLocaleString("en-IN")}`;

          return {
            id: item.id || item.eventKey,
            eventKey: item.eventKey,
            title: item.title || "STRON Event",
            dateText: item.date || "Active Event",
            format:
              item.marathonMode === "virtual"
                ? "Virtual"
                : item.format === "virtual_step_challenge"
                  ? "Virtual"
                  : item.format || "Virtual",
            status,
            registrationsCount: item.registrationCount || item.iconCount || 0,
            totalEarnings,
            formattedEarnings: earningsText,
            actionLabel:
              status === "COMPLETED"
                ? "View Stats"
                : status === "CANCELLED"
                  ? "Cancelled"
                  : "Edit / Manage",
          };
        });
        setEvents(mapped);
      } else {
        setEvents([]);
      }
    } catch {
      setEvents([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents]),
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchEvents();
  };

  const handleCreateNew = () => {
    router.push({
      pathname: href.app.organizeCreate,
      params: { returnTo: "listings" },
    } as never);
  };

  const handleManageEvent = (event: ListingEventItem) => {
    router.push({
      pathname: href.app.organizerPreview,
      params: { key: event.eventKey || event.id },
    } as never);
  };

  return (
    <ListingsScreenContent
      mode="events"
      title="Listings"
      searchPlaceholder="Search in your Events"
      events={events}
      isPro={isPro}
      renewalDateText={subscription?.currentPeriodEnd}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
      onCreateNewPress={handleCreateNew}
      onManageEventPress={handleManageEvent}
      onUpgradeToPro={() => {
        void subscribe();
      }}
      onBack={() => router.back()}
    />
  );
};

export default ListingsScreen;

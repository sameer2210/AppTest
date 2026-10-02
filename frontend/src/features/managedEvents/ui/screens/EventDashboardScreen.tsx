import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { EventDetailSkeleton } from "@/components/skeletons";
import { useLocalSearchParams } from "expo-router";
import { showToastMessage } from "@/utils/app-utils";
import { shareEvent } from "@/utils/shareEvent";
import { useAppDispatch } from "@/store/hooks";
import {
  fetchEvent,
  fetchEventDashboard,
} from "../../model/managedEvents.thunks";
import type { StronEventDashboard } from "@/features/managedEvents";
import type { StronEvent } from "@/models/stronManaged/event";
import KotHDashboard from "../components/organize/components/KotHDashboard";
import StandardDashboard from "../components/organize/components/StandardDashboard";
import { SCREEN_CONTENT_PADDING_TOP } from "@/utils/screen-layout";

/**
 * Figma node 229-915 — Organizer Event Dashboard (Post-Creation / Management).
 * This screen matches the "Analytics" style UI specifically requested for the post-creation flow.
 */
const EventDashboardScreen = () => {
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ key?: string }>();
  const eventKey = typeof params.key === "string" ? params.key : "";

  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<StronEventDashboard | null>(null);
  const [event, setEvent] = useState<StronEvent | null>(null);

  const load = useCallback(async () => {
    if (!eventKey) return;
    setLoading(true);
    try {
      const [ev, dash] = await Promise.all([
        dispatch(fetchEvent(eventKey)).unwrap(),
        dispatch(fetchEventDashboard(eventKey)).unwrap(),
      ]);
      setEvent(ev);
      setDashboard(dash);
    } catch {
      showToastMessage("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [eventKey, dispatch]);

  useEffect(() => {
    void load();
  }, [load]);

  const onShare = async () => {
    if (!event) return;
    await shareEvent({ title: event.title, eventKey: event.key });
  };

  if (loading) {
    return (
      <View style={[styles.root, { paddingTop: SCREEN_CONTENT_PADDING_TOP + 20 }]}>
        <EventDetailSkeleton />
      </View>
    );
  }

  const isDuel = event?.format === "king_of_the_hill" || event?.format === "face_off";

  const formatRevenue = (val: number) => {
    if (val >= 100000) {
      const lakh = val / 100000;
      return `${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} L`;
    }
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    return `₹${Math.round(val)}`;
  };

  if (isDuel) {
    return (
      <KotHDashboard
        event={event!}
        dashboard={dashboard!}
        onShare={onShare}
        formatRevenue={formatRevenue}
        onEventUpdated={setEvent}
      />
    );
  }

  return (
    <StandardDashboard
      event={event!}
      dashboard={dashboard!}
      onShare={onShare}
      formatRevenue={formatRevenue}
    />
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#090909",
  },
});

export default EventDashboardScreen;

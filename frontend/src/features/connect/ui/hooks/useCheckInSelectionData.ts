import { useEffect, useMemo, useState } from "react";
import { useAppDispatch } from "@/store/hooks";
import { fetchMyActivity } from "@/features/managedEvents";
import { listGymPlans } from "@/features/gymBusiness";
import type { MembershipPlan as GymPlanDto } from "@/types/gym/plan.types";
import type { EventItem, MembershipPlan } from "../components";

const parseJsonParam = <T>(raw: string | undefined, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

type UseCheckInSelectionDataOptions = {
  initialPlans?: MembershipPlan[];
  initialEvents?: EventItem[];
  skipFetch?: boolean;
};

export const useCheckInSelectionData = (
  plansJson?: string,
  eventsJson?: string,
  options?: UseCheckInSelectionDataOptions,
) => {
  const dispatch = useAppDispatch();
  const seededPlans = options?.initialPlans;
  const seededEvents = options?.initialEvents;
  const skipFetch = Boolean(options?.skipFetch);

  const initialPlans: MembershipPlan[] = useMemo(() => {
    if (seededPlans && seededPlans.length > 0) return seededPlans;
    return parseJsonParam<MembershipPlan[]>(plansJson, []);
  }, [plansJson, seededPlans]);

  const initialEvents: EventItem[] = useMemo(() => {
    if (seededEvents && seededEvents.length > 0) return seededEvents;
    return parseJsonParam<EventItem[]>(eventsJson, []);
  }, [eventsJson, seededEvents]);

  const [plans, setPlans] = useState<MembershipPlan[]>(initialPlans);
  const [events, setEvents] = useState<EventItem[]>(initialEvents);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (skipFetch || plansJson || eventsJson) return;

    let isMounted = true;
    const fetchUserData = async () => {
      setIsLoading(true);
      try {
        const [activityRes, plansRes] = await Promise.allSettled([
          dispatch(fetchMyActivity()).unwrap(),
          dispatch(listGymPlans("ACTIVE")).unwrap(),
        ]);

        if (!isMounted) return;

        if (
          activityRes.status === "fulfilled" &&
          Array.isArray(activityRes.value) &&
          activityRes.value.length > 0
        ) {
          const participantActivities = activityRes.value.filter(
            (act) =>
              act.role === "participant" ||
              act.participationStatus === "active" ||
              act.eventStatus === "live",
          );

          const sourceActs =
            participantActivities.length > 0 ? participantActivities : activityRes.value;

          const mappedEvents: EventItem[] = sourceActs.map((act) => {
            const format = (act.format || "").toLowerCase();
            let subtitle = "Event check-in";
            if (format.includes("step") || format.includes("challenge")) {
              subtitle = act.progressLabel || "Step challenge";
            } else if (format.includes("face")) {
              subtitle = "Win most 1v1 step battles";
            } else if (format.includes("king")) {
              subtitle = act.kingTime ? `King time: ${act.kingTime}` : "King of the hill";
            } else if (act.destination) {
              subtitle = `Destination: ${act.destination}`;
            }

            return {
              id: act.eventKey || act.id,
              title: act.title || "STRON Event",
              subtitle,
              locationDetails: act.destination || "In-Person Event",
              isEnrolled: true,
              format: act.format,
              bannerName: act.bannerName || null,
            };
          });
          setEvents(mappedEvents);
        } else {
          setEvents([]);
        }

        if (
          plansRes.status === "fulfilled" &&
          plansRes.value.success &&
          Array.isArray(plansRes.value.data) &&
          plansRes.value.data.length > 0
        ) {
          const userBought = plansRes.value.data.filter((p: GymPlanDto) => p.isBought === true);

          const mappedPlans: MembershipPlan[] = userBought.map((p: GymPlanDto) => ({
            id: p._id || p.id || "",
            name: p.name,
            billingText: `Billed ${p.durationUnit ? p.durationUnit.toLowerCase() : "Monthly"}`,
            price: `₹${p.price}${p.durationUnit ? `/${p.durationUnit.toLowerCase().slice(0, 2)}` : "/mo"}`,
            isBought: true,
            tags: Array.isArray(p.perks) && p.perks.length > 0 ? p.perks : ["Gym Access", "Locker"],
            actionText: "Check In",
          }));
          setPlans(mappedPlans);
        } else {
          setPlans([]);
        }
      } catch {
        setPlans([]);
        setEvents([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchUserData();
    return () => {
      isMounted = false;
    };
  }, [plansJson, eventsJson, skipFetch, dispatch]);

  return {
    plans,
    events,
    isLoading,
    setPlans,
    setEvents,
  };
};

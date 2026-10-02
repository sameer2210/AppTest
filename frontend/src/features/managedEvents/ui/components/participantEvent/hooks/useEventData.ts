import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { href } from "@/navigation/href";
import {
  fetchEvent,
  fetchMyParticipation,
  fetchProgress,
  fetchMatches,
} from "@/features/managedEvents";
import type { StronEvent } from "@/models/stronManaged/event";
import type {
  StronKotHMatch,
  StronParticipation,
  StronProgress,
} from "@/models/stronManaged/participation";
import { showToastMessage } from "@/utils/app-utils";
import { isEventOrganizer } from "@/utils/isEventOrganizer";

export interface UseEventDataOptions {
  eventKey?: string;
  isExplicitParticipantView?: boolean;
  onMatchesLoaded?: (matches: StronKotHMatch[]) => void;
  onLeaderboardNeeded?: () => void;
}

export const useEventData = ({
  eventKey,
  isExplicitParticipantView = false,
  onMatchesLoaded,
  onLeaderboardNeeded,
}: UseEventDataOptions) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<StronEvent | null>(null);
  const [participation, setParticipation] = useState<StronParticipation | null>(null);
  const [progress, setProgress] = useState<StronProgress | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // Stabilize callback refs so they never appear in dependency arrays.
  const onMatchesLoadedRef = useRef(onMatchesLoaded);
  onMatchesLoadedRef.current = onMatchesLoaded;
  const onLeaderboardNeededRef = useRef(onLeaderboardNeeded);
  onLeaderboardNeededRef.current = onLeaderboardNeeded;

  const load = useCallback(async () => {
    if (!eventKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const next = await dispatch(fetchEvent(eventKey)).unwrap();
      const isOrganizer = isEventOrganizer(user, next.organizerUid);

      if (!isExplicitParticipantView && isOrganizer) {
        router.replace({
          pathname: href.app.organizerPreview,
          params: { key: next.key },
        } as never);
        return;
      }

      setEvent(next);
      if (next.ticketTypes[0]?.id) setExpandedTicketId(next.ticketTypes[0].id);

      const mine = await dispatch(fetchMyParticipation(eventKey)).unwrap();
      setParticipation(mine);

      if (mine) {
        try {
          const prog = await dispatch(fetchProgress(eventKey)).unwrap();
          setProgress(prog);
        } catch {
          setProgress(null);
        }
        if (next.format === "king_of_the_hill" || next.format === "face_off") {
          try {
            const rawMatches = await dispatch(
              fetchMatches({ key: eventKey, myUid: user?.uid || mine.uid }),
            ).unwrap();
            onMatchesLoadedRef.current?.(rawMatches);
          } catch {
            onMatchesLoadedRef.current?.([]);
          }
        } else {
          onMatchesLoadedRef.current?.([]);
        }
      } else {
        setProgress(null);
        onMatchesLoadedRef.current?.([]);
      }

      onLeaderboardNeededRef.current?.();
    } catch (error) {
      showToastMessage((error as Error)?.message || "Could not load event.");
    } finally {
      setLoading(false);
    }
  }, [dispatch, eventKey, isExplicitParticipantView, router, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!eventKey) return;
      let cancelled = false;

      const syncEnrollment = async () => {
        try {
          const mine = await dispatch(fetchMyParticipation(eventKey)).unwrap();
          if (cancelled) return;
          setParticipation(mine);

          if (!mine) {
            setProgress(null);
            onMatchesLoadedRef.current?.([]);
          } else {
            const duel = event?.format === "king_of_the_hill" || event?.format === "face_off";
            const [prog, nextMatches] = await Promise.all([
              dispatch(fetchProgress(eventKey)).unwrap().catch(() => null),
              duel
                ? dispatch(fetchMatches({ key: eventKey, myUid: user?.uid || mine.uid }))
                    .unwrap()
                    .catch(() => null)
                : Promise.resolve(null),
            ]);
            if (cancelled) return;
            if (prog) setProgress(prog);
            if (nextMatches) onMatchesLoadedRef.current?.(nextMatches);
          }
          onLeaderboardNeededRef.current?.();
        } catch {
          // keep last good snapshot
        }
      };

      void syncEnrollment();
      return () => {
        cancelled = true;
      };
    }, [dispatch, eventKey, event?.format, user?.uid]),
  );

  return {
    loading,
    setLoading,
    event,
    setEvent,
    participation,
    setParticipation,
    progress,
    setProgress,
    expandedTicketId,
    setExpandedTicketId,
    load,
  };
};


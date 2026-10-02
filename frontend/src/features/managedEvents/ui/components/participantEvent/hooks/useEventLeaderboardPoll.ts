import { useCallback, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/features/auth";
import { fetchEvent, fetchLeaderboard, fetchMatches, fetchProgress, fetchMyParticipation } from "@/features/managedEvents";
import type { StronEvent } from "@/models/stronManaged/event";
import type { StronKotHMatch, StronLeaderboardEntry, StronParticipation, StronProgress } from "@/models/stronManaged/participation";
import { LIVE_LEADERBOARD_POLL_MS } from "../../liveLeaderboard";

export interface UseEventLeaderboardPollOptions {
  eventKey?: string;
  event: StronEvent | null;
  onEventUpdated?: (event: StronEvent) => void;
  onParticipationUpdated?: (participation: StronParticipation) => void;
  onProgressUpdated?: (progress: StronProgress | null) => void;
}

export const useEventLeaderboardPoll = ({
  eventKey,
  event,
  onEventUpdated,
  onParticipationUpdated,
  onProgressUpdated,
}: UseEventLeaderboardPollOptions) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);

  const [leaderboard, setLeaderboard] = useState<StronLeaderboardEntry[]>([]);
  const [matches, setMatches] = useState<StronKotHMatch[]>([]);

  const fetchInitialLeaderboard = useCallback(async () => {
    if (!eventKey) return;
    const raceLive =
      event?.status === "live" ||
      event?.status === "started" ||
      event?.status === "in_progress" ||
      event?.status === "completed" ||
      event?.status === "settled";
    try {
      const board = await dispatch(fetchLeaderboard(eventKey)).unwrap();
      setLeaderboard(board);
    } catch {
      if (!raceLive) setLeaderboard([]);
    }
  }, [dispatch, eventKey, event?.status]);

  const refreshLiveScores = useCallback(async () => {
    if (!eventKey) return;
    const duel = event?.format === "king_of_the_hill" || event?.format === "face_off";
    try {
      const nextEvent = await dispatch(fetchEvent(eventKey)).unwrap().catch(() => null);
      if (nextEvent && onEventUpdated) onEventUpdated(nextEvent);

      const mine = await dispatch(fetchMyParticipation(eventKey)).unwrap().catch(() => null);
      if (mine && onParticipationUpdated) onParticipationUpdated(mine);
      const owned = !!mine && mine.status !== "cancelled" && mine.status !== "expired";

      const status = nextEvent?.status || event?.status;
      const canShowBoard = [
        "live",
        "started",
        "in_progress",
        "completed",
        "settled",
        "published",
      ].includes(String(status || ""));
      if (!canShowBoard) return;

      const [board, prog, nextMatches] = await Promise.all([
        dispatch(fetchLeaderboard(eventKey)).unwrap().catch(() => null),
        owned
          ? dispatch(fetchProgress(eventKey)).unwrap().catch(() => null)
          : Promise.resolve(null),
        owned && duel
          ? dispatch(fetchMatches({ key: eventKey, myUid: user?.uid })).unwrap().catch(() => null)
          : Promise.resolve(null),
      ]);
      if (board) setLeaderboard(board);
      if (prog !== undefined && onProgressUpdated) onProgressUpdated(prog);
      if (nextMatches) setMatches(nextMatches);
    } catch {
      // keep last good snapshot
    }
  }, [dispatch, eventKey, event?.format, event?.status, onEventUpdated, onParticipationUpdated, onProgressUpdated, user?.uid]);

  useEffect(() => {
    if (!eventKey) return;
    if (
      event?.status === "completed" ||
      event?.status === "settled" ||
      event?.status === "cancelled"
    ) {
      return;
    }
    const timer = setInterval(() => {
      void refreshLiveScores();
    }, LIVE_LEADERBOARD_POLL_MS);
    return () => clearInterval(timer);
  }, [eventKey, event?.status, refreshLiveScores]);

  return {
    leaderboard,
    setLeaderboard,
    matches,
    setMatches,
    fetchInitialLeaderboard,
    refreshLiveScores,
  };
};

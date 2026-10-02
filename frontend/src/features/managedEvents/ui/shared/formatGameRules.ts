import type { StronEvent } from "@/models/stronManaged/event";

/** Deadline as DD/MM/YY (e.g. 12/05/26). */
export const formatDeadlineShort = (iso?: string | null): string => {
  if (!iso) return "TBD";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "TBD";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
};

/**
 * Purchase / live overview / My Tickets “Description” bullets.
 * Canonical gameplay copy per format (not organizer event.rules).
 */
export const buildFormatGameRules = (
  event: Pick<
    StronEvent,
    "format" | "ticketTypes" | "endDate" | "durationDays" | "successfulDaysRequired" | "rules"
  > & { format?: string | null },
): string[] => {
  const format = event.format;

  if (format === "king_of_the_hill") {
    return [
      "Compete in small groups and try to stay on top for as long as possible.",
      "You are placed in a group of 3–5 people.",
      "Your group changes every 24 hours.",
      "The person with the most steps in the group becomes the King.",
      "Every minute you stay King adds to your King Time.",
      "The person with the most total King Time ranks highest.",
      "If King Time is tied, total steps are used as the tie-breaker.",
      "Your phone tracks your steps throughout the challenge.",
      "This is a virtual challenge — participate from anywhere using just your phone.",
    ];
  }

  if (format === "face_off") {
    return [
      "Battle another person in a 1v1 step challenge.",
      "You are matched with a new opponent.",
      "The person with the most steps at the end of the day wins the battle.",
      "Get 3,000+ steps ahead of your opponent at any time to win by KO.",
      "A KO ends the battle immediately, and you are matched with a new opponent.",
      "The person with the most wins by the end of the challenge ranks highest.",
      "If wins are tied, total steps are used as the tie-breaker.",
      "Your phone tracks your steps throughout the challenge.",
      "This is a virtual challenge — participate from anywhere using just your phone.",
    ];
  }

  if (format === "virtual_step_challenge") {
    return [
      "Hit the target number of steps every day to complete the challenge.",
      "Every day you reach the target counts as 1 successful day.",
      "The person with the most successful days ranks highest.",
      "If two people have the same number of successful days, total steps are used as the tie-breaker.",
      "Your phone tracks your steps throughout the challenge.",
      "This is a virtual challenge — participate from anywhere using just your phone.",
    ];
  }

  // marathon (default)
  return [
    "Complete the target distance and try to finish it as fast as possible.",
    "Your time starts when the event starts.",
    "The faster you complete the distance, the higher you rank.",
    "If two people finish in the same time, the person with more total distance ranks higher.",
    "Your phone tracks your steps and uses them to estimate the distance you cover.",
    "This is a virtual challenge — participate from anywhere using just your phone.",
  ];
};

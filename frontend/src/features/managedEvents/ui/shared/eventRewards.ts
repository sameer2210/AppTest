import type { StronEvent } from "@/models/stronManaged/event";

export const REWARD_PRESET_OPTIONS = [
  "e-Certificate",
  "e-Medal",
  "T-Shirts",
  "Bib Number",
  "Physical Medal",
  "Finisher Trophy",
] as const;

export const PARTICIPANT_INFO_PRESET_OPTIONS = [
  "T-Shirt Size",
  "Contact Name",
  "Contact Number",
  "Emergency Contact Number",
  "Blood Group",
  "Medical Condition",
  "City",
  "Address Line 1",
  "Address Line 2",
  "Pincode",
  "State",
] as const;

/** Labels shown on the event Rewards accordion. */
export const resolveEventRewardLabels = (event: Pick<StronEvent, "rewardLabels">): string[] =>
  (event.rewardLabels || []).map((r) => String(r).trim()).filter(Boolean);

export const CHECKIN_PROOF_TTL_MS = 15 * 60 * 1000;
export const CONNECT_CODE_TTL_MS = 15 * 60 * 1000;

export const SCANNER_SELECT =
  "uid username name profileImageUrl contactNo phone phoneVerified connectCode";

export const LIVE_USER_FILTER = { isDeleted: { $ne: true } };
export const LIVE_USER = LIVE_USER_FILTER;


export const EVENT_CHECKIN_STATUSES = new Set<string>([
  "published",
  "live",
  "active",
]);

export const EVENT_PRIORITY: Record<string, number> = {
  virtual_step_challenge: 1, // Challenges
  face_off: 2, // Games
  king_of_the_hill: 2, // Games
  marathon: 3, // Event listing
};

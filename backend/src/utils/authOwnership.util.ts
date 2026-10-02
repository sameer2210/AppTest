import type { Request, Response } from "express";

export const getRequesterUid = (req: Request) =>
  String(req.user?.uid || req.auth?.uid || "").trim() || null;

/** Returns an error response if the caller is not authenticated as `targetUid`. */
export const assertSelfUid = (req: Request, res: Response, targetUid: string) => {
  const requesterUid = getRequesterUid(req);
  if (!requesterUid) {
    return res.status(401).json({ error: "Authentication required." });
  }
  if (String(targetUid) !== requesterUid) {
    return res
      .status(403)
      .json({ error: "You can only access your own account." });
  }
  return null;
};

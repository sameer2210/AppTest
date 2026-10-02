import type { Request, Response } from "express";
import { UserModel } from "../features/identity-auth/index.js";
import { isUserAdmin } from "../config/remoteConfigService.js";
import { getRequesterUid } from "./authOwnership.util.js";

export const assertEventOwnerOrAdmin = (
  req: Request,
  res: Response,
  event: { createdBy?: unknown } | null | undefined,
) => {
  const requesterUid = getRequesterUid(req);
  if (!requesterUid) {
    return res.status(401).json({ error: "Authentication required." });
  }

  const email = req.user?.email;
  if (email && isUserAdmin(email)) {
    return null;
  }

  const createdBy = event?.createdBy ? String(event.createdBy) : "";
  if (createdBy && createdBy === requesterUid) {
    return null;
  }

  if (!createdBy) {
    return res.status(403).json({
      error: "Only an administrator can modify events without an assigned owner.",
    });
  }

  return res.status(403).json({
    error: "You can only modify events you created.",
  });
};

export const requireAdminUser = async (req: Request, res: Response) => {
  const uid = getRequesterUid(req);
  if (!uid) {
    return { error: res.status(401).json({ error: "Authentication required." }) };
  }

  let email = req.user?.email ?? null;
  if (!email) {
    const user = await UserModel.findOne({ uid }).select("email").lean();
    email = user?.email ?? null;
  }

  if (!email || !isUserAdmin(email)) {
    return { error: res.status(403).json({ error: "Admin access required." }) };
  }

  return { uid, email };
};

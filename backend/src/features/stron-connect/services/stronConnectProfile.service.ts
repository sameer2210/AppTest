import { asUserDisplay, ServiceParams } from "../../../types/service.util.js";
import { UserModel } from "../../identity-auth/index.js";
import { getErrorMessage, isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import StronConnectScan from "../models/stronConnectScan.model.js";
import { codedError } from "../../../utils/stronHttpError.util.js";
import { getPaginationParams } from "../../../utils/pagination.js";

import { ALPHABET, CONNECT_CODE_TTL_MS, LIVE_USER } from "../../../constants/index.js";

export { CONNECT_CODE_TTL_MS };


const hashUid = (uid: string) => {
  let hash = 2166136261;
  for (let i = 0; i < uid.length; i += 1) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const generateRandom5CharToken = () => {
  let token = "";
  for (let i = 0; i < 5; i += 1) {
    token += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return token;
};

export const getConnectShareName = async (uid: string) => {
  const user = await UserModel.findOne({ uid }).select("username").lean();
  const name = user?.username ? String(user.username) : "";
  return name || null;
};

export const findLiveUser = (
  uid: unknown,
  { lean = false, select }: { lean?: boolean; select?: string } = {},
) => {
  const query = UserModel.findOne({ uid, ...LIVE_USER });
  if (select) query.select(select);
  return lean ? query.lean() : query;
};

export const rotateConnectCode = async (userDoc: ServiceParams) => {
  for (let attempts = 0; attempts < 20; attempts += 1) {
    userDoc.connectCode = generateRandom5CharToken();
    userDoc.connectCodeCreatedAt = new Date();
    try {
      await userDoc.save();
      return userDoc.connectCode;
    } catch (err: unknown) {
      if (!isMongoDuplicateKeyError(err)) throw err;
    }
  }
  throw codedError("conflict", "Could not allocate a unique connect code.");
};

export const buildConnectDisplayCode = (uid: string) => {
  const h = hashUid(String(uid || ""));
  const chars = [];
  let n = h;
  for (let i = 0; i < 5; i += 1) {
    chars.push(ALPHABET[n % ALPHABET.length]);
    n = Math.floor(n / ALPHABET.length);
  }
  return chars.join("");
};

export const publicUserCard = (u: ServiceParams) => {
  if (!u) return { uid: "", username: null, profileImageUrl: null, displayCode: null };
  return {
    uid: u.uid,
    username: u.username || u.name || null,
    profileImageUrl: u.profileImageUrl || u.profileImage || null,
    displayCode: u.connectCode || buildConnectDisplayCode(u.uid),
  };
};

export const getMyConnectQr = async (uid: string, forceRotate = false) => {
  const user = await findLiveUser(uid);
  if (!user) throw codedError("user_not_found", "User not found.");

  let code = user.connectCode;
  const isStale =
    !code ||
    forceRotate ||
    !user.connectCodeCreatedAt ||
    Date.now() - new Date(user.connectCodeCreatedAt).getTime() > CONNECT_CODE_TTL_MS;

  if (isStale) code = await rotateConnectCode(user);

  const latestScan = await StronConnectScan.findOne({
    targetUid: uid,
    kind: "user_connect",
  })
    .select("scannerUid createdAt")
    .sort({ createdAt: -1 })
    .lean();

  let latestIncomingScan = null;
  if (latestScan?.scannerUid) {
    const scanner = await UserModel.findOne({ uid: latestScan.scannerUid })
      .select("uid username name profileImageUrl profileImage contactNo phone phoneVerified connectCode")
      .lean();

    let hasMultiple = false;
    let openExplore = false;
    let viewMode = "explore";
    const scannerDisplay = asUserDisplay(scanner);
    let entityName = scannerDisplay?.username || scannerDisplay?.name || "Runner";
    let plansJson: string | null = null;
    let eventsJson: string | null = null;

    latestIncomingScan = {
      scanId: String(latestScan._id),
      scannerUid: latestScan.scannerUid,
      scannerName: scannerDisplay?.username || scannerDisplay?.name || "Runner",
      scannedAt: latestScan.createdAt,
      hasMultiple,
      openExplore,
      viewMode,
      entityName,
      plansJson: plansJson as string | null,
      eventsJson: eventsJson as string | null,
      providerUid: undefined as string | undefined,
      businessId: undefined as string | null | undefined,
    };

    if (scanner) {
      try {
        const { loadConnectCatalog, classifyCatalogView } = await import(
          "./stronConnectCatalog.service.js"
        );
        const catalog = await loadConnectCatalog({
          targetUser: scanner,
          scannerUid: uid,
          scanner: user,
          preResolvedBusiness: null,
        });
        const { businessDoc, formattedPlans, formattedEvents } = catalog;
        viewMode = classifyCatalogView(catalog);
        latestIncomingScan.viewMode = viewMode;

        if (viewMode === "explore") {
          latestIncomingScan.openExplore = true;
          latestIncomingScan.hasMultiple = false;
          latestIncomingScan.entityName = "Explore STRON";
        } else {
          latestIncomingScan.hasMultiple = true;
          latestIncomingScan.openExplore = false;
          latestIncomingScan.providerUid = scanner.uid ?? undefined;
          latestIncomingScan.entityName =
            businessDoc?.businessName || scannerDisplay?.username || scannerDisplay?.name || "Check-in";
          latestIncomingScan.plansJson = JSON.stringify(formattedPlans);
          latestIncomingScan.eventsJson = JSON.stringify(formattedEvents);
          latestIncomingScan.businessId = businessDoc ? String(businessDoc._id) : null;
        }
      } catch {
        // Keep basic incoming-scan card if catalog resolve fails.
      }
    }
  }

  return {
    uid: user.uid,
    username: user.username || null,
    profileImageUrl: user.profileImageUrl || null,
    displayCode: code,
    qrPayload: JSON.stringify({ t: "user", uid: user.uid }),
    latestIncomingScan,
  };
};

export const listMyConnectScans = async (uid: string, query: ServiceParams = {}) => {
  const { limit } = getPaginationParams(query);
  const rows = await StronConnectScan.find({
    $or: [{ scannerUid: uid }, { targetUid: uid }, { participantUid: uid }],
  })
    .select("kind createdAt eventKey ticketNumber scannerUid targetUid participantUid")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const otherUids = [
    ...new Set(
      rows
        .map((r) => (r.scannerUid === uid ? r.targetUid || r.participantUid : r.scannerUid))
        .filter(Boolean),
    ),
  ];

  const users = otherUids.length
    ? await UserModel.find({ uid: { $in: otherUids } })
        .select("uid username profileImageUrl name")
        .lean()
    : [];
  const byUid = Object.fromEntries(users.map((u) => [u.uid, u]));

  return rows.map((row) => {
    const otherUid =
      (row.scannerUid === uid ? row.targetUid || row.participantUid : row.scannerUid) || undefined;
    const userObj = (otherUid ? byUid[otherUid] : undefined) || {
      uid: otherUid,
      username: "STRON User",
    };
    const userDisplay = asUserDisplay(userObj);
    return {
      id: String(row._id),
      kind: row.kind,
      createdAt: row.createdAt,
      eventKey: row.eventKey || null,
      ticketNumber: row.ticketNumber || null,
      user: {
        uid: userObj.uid,
        username: userDisplay?.name || userDisplay?.username || "STRON User",
        profileImageUrl: userDisplay?.profileImageUrl || null,
      },
    };
  });
};

export default {
  getMyConnectQr,
  listMyConnectScans,
  rotateConnectCode,
  publicUserCard,
  findLiveUser,
};
